import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "../../shared/api-types";
import { AnalysisResultSchema, providerOutputJsonSchema } from "../../shared/schemas";
import { getConfig } from "../config";
import { buildUserText, SYSTEM_PROMPT } from "./prompt";

const MAX_TOKENS = 2048;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529]);

export type ProviderErrorKind = "retryable" | "fatal" | "invalid_output" | "timeout";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    readonly attempts: number,
  ) {
    super(`provider ${kind}`);
  }
}

export type AnalyzeInput = {
  image: Buffer;
  mediaType: "image/jpeg";
  dishHint?: string;
};

export type AnalyzeOutput = {
  result: AnalysisResult;
  usage: { input_tokens: number; output_tokens: number };
  latency_ms: number;
  attempts: number;
};

export function buildRequest(
  model: string,
  input: AnalyzeInput,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: input.mediaType, data: input.image.toString("base64") },
          },
          { type: "text", text: buildUserText(input.dishHint) },
        ],
      },
    ],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: providerOutputJsonSchema },
    },
  };
}

let client: Anthropic | undefined;

function getClient(): Anthropic {
  // maxRetries 0: the retry budget is ours (AC-11/12). logLevel off: SDK must never print request bodies.
  client ??= new Anthropic({ apiKey: getConfig().anthropicApiKey, maxRetries: 0, logLevel: "off" });
  return client;
}

export function classifyError(err: unknown): ProviderErrorKind {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "retryable";
  if (err instanceof Anthropic.APIError && err.status !== undefined) {
    return RETRYABLE_STATUS.has(err.status) ? "retryable" : "fatal";
  }
  return "fatal";
}

function parseOutput(message: Anthropic.Messages.Message): AnalysisResult | null {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  let json: unknown;
  try {
    json = JSON.parse(block.text);
  } catch {
    return null;
  }
  const parsed = AnalysisResultSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export async function analyzeFood(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const config = getConfig();
  const body = buildRequest(config.visionModel, input);
  const started = Date.now();
  const usage = { input_tokens: 0, output_tokens: 0 };

  for (let attempt = 1; ; attempt++) {
    let kind: ProviderErrorKind;
    try {
      const message = await getClient().messages.create(body, { timeout: config.analyzeAttemptTimeoutMs });
      usage.input_tokens += message.usage.input_tokens;
      usage.output_tokens += message.usage.output_tokens;
      const result = parseOutput(message);
      if (result) return { result, usage, latency_ms: Date.now() - started, attempts: attempt };
      kind = "invalid_output";
    } catch (err) {
      kind = classifyError(err);
    }
    if (kind === "fatal" || attempt >= MAX_ATTEMPTS) throw new ProviderError(kind, attempt);
    if (kind !== "invalid_output") await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}
