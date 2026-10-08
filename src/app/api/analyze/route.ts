import type { AnalyzeResponse } from "../../../shared/api-types";
import { AnalyzeFieldsSchema } from "../../../shared/schemas";
import { CONSENT_VERSION } from "../../../server/consent-version";
import { getConfig } from "../../../server/config";
import { getConsentStatus } from "../../../server/consent";
import { AppError, zodDetails } from "../../../server/errors";
import { api, assertSameOrigin, requireUserId } from "../../../server/http";
import { detectImageType, MAX_UPLOAD_BYTES, processImage } from "../../../server/image";
import { checkAndRecordAnalysis } from "../../../server/rate-limit";
import { analyzeFood, ProviderError } from "../../../server/vision/analyze-food";

export const runtime = "nodejs";
export const maxDuration = 60;

// Multipart framing adds a little to the photo size.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 100_000;

const PROVIDER_CODES = {
  timeout: "PROVIDER_TIMEOUT",
  invalid_output: "PROVIDER_INVALID_OUTPUT",
  retryable: "PROVIDER_ERROR",
  fatal: "PROVIDER_ERROR",
} as const;

export const POST = api("POST /api/analyze", async (req, _params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);

  const consent = await getConsentStatus(userId, CONSENT_VERSION);
  if (!consent.active) throw new AppError("CONSENT_REQUIRED");

  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) throw new AppError("FILE_TOO_LARGE");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("BAD_REQUEST");
  }

  const fields = AnalyzeFieldsSchema.safeParse({
    dish_hint: form.get("dish_hint") ?? undefined,
    dish_index: form.get("dish_index") ?? undefined,
  });
  if (!fields.success) throw new AppError("BAD_REQUEST", { details: zodDetails(fields.error) });

  const photo = form.get("photo");
  if (!(photo instanceof File)) throw new AppError("BAD_REQUEST");
  if (photo.size > MAX_UPLOAD_BYTES) throw new AppError("FILE_TOO_LARGE");
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (!detectImageType(bytes)) throw new AppError("INVALID_FILE_TYPE");

  const decision = await checkAndRecordAnalysis(userId);
  if (!decision.allowed) throw new AppError("RATE_LIMITED", { retryAfterSec: decision.retryAfterSec });

  let image: Buffer;
  try {
    image = await processImage(bytes);
  } catch {
    throw new AppError("INVALID_FILE_TYPE");
  }

  const model = getConfig().visionModel;
  ctx.extra.model = model;
  try {
    const out = await analyzeFood({ image, mediaType: "image/jpeg", dishHint: fields.data.dish_hint });
    ctx.extra.input_tokens = out.usage.input_tokens;
    ctx.extra.output_tokens = out.usage.output_tokens;
    ctx.extra.attempts = out.attempts;
    const body: AnalyzeResponse = {
      ...out.result,
      request_id: ctx.requestId,
      model,
      dish_index: fields.data.dish_index ?? 0,
    };
    return Response.json(body);
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    ctx.extra.attempts = err.attempts;
    throw new AppError(PROVIDER_CODES[err.kind]);
  }
});
