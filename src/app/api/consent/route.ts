import { CONSENT_VERSION } from "../../../server/consent-version";
import { ConsentPostSchema } from "../../../shared/schemas";
import { getConsentStatus, recordConsent, withdrawConsent } from "../../../server/consent";
import { AppError } from "../../../server/errors";
import { api, assertSameOrigin, readJson, requireUserId } from "../../../server/http";

export const runtime = "nodejs";

export const GET = api("GET /api/consent", async (_req, _params, ctx) => {
  const userId = await requireUserId();
  ctx.setUser(userId);
  return Response.json(await getConsentStatus(userId, CONSENT_VERSION));
});

export const POST = api("POST /api/consent", async (req, _params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);
  const body = await readJson(req, ConsentPostSchema);
  if (body.version !== CONSENT_VERSION) {
    throw new AppError("CONSENT_VERSION_MISMATCH", { required_version: CONSENT_VERSION });
  }
  const { status, created } = await recordConsent(userId, CONSENT_VERSION);
  return Response.json(status, { status: created ? 201 : 200 });
});

export const DELETE = api("DELETE /api/consent", async (req, _params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);
  return Response.json(await withdrawConsent(userId, CONSENT_VERSION));
});
