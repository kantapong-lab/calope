import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Smoke only: proves the real SDK imports and env names are readable. Never returns values.
export function GET() {
  return Response.json({
    ok: true,
    node: process.version,
    sdkLoaded: typeof Anthropic === "function",
    keyPresent: Boolean(process.env.ANTHROPIC_API_KEY),
    modelPresent: Boolean(process.env.FOOD_VISION_MODEL),
  });
}
