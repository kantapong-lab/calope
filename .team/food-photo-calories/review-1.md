# Review 1: food-photo-calories (step 6)

Verdict: Approve (0 critical, 0 high, 3 medium, 5 low, 2 info). Static review of `diff.patch` only; tests, tsc and lint not run by the reviewer. The Orchestrator ran them: 179 tests, lint clean, build clean on Node 24.21.0.

## Medium (fix before QA)
- M-1 `src/lib/client/meal.ts:41-48`, `src/shared/schemas.ts:19-20` (AC-9/AC-10, C-API-MEALS). Proportional recalc is not capped at 5000 kcal; POST rejects above 5000, so save fails with a generic toast. Fix: clamp in FE and show a specific message.
- M-2 `src/components/CaptureFlow.tsx:49-51` (AC-14, C-PRIV). On a non-401 error from getConsent(), the gate fails open to idle. Server still returns 403, but photo bytes can leave the device. Fix: fail closed with a retry state.
- M-3 `src/server/image.ts:16`. sharp has no `limitInputPixels`; a small image with huge dimensions can exhaust memory. Fix: set limitInputPixels (for example 40M).

## Low
- L-1 `src/server/errors.ts:51-55` (C-ERR). INTERNAL_ERROR text differs from the contract. /api/analyze lacks `fallback: "manual"` (AC-11).
- L-2 `.env.example:11-15` (C-CONFIG). Lists 2 of 8 names; empty FOOD_VISION_MODEL is rejected at startup.
- L-3 `scripts/check-no-thai-food-data.mjs` (AC-23). Not wired to any script or CI; skips docs/.
- L-4 `src/server/rate-limit.test.ts` (AC-13). Only decideWindow is tested; no race test on the advisory lock.
- L-5 `src/app/api/analyze/route.ts:33-34`. Content-length guard skipped when header absent; size check after formData() buffers the body.

## Info
- I-1 `src/server/http.ts:38` logs error_name only (safe).
- I-2 `eslint.config.mjs:25` exempts health/route.ts (harmless).

## Checks that passed
Key server-only; origin check first on non-GET, auth exempt; consent checked before body read; rate limit in one transaction after file checks; no SQL injection; meal and consent routes require session and are owner-scoped; logs typed metadata only; SDK logLevel off; request allowlist test-asserted (AC-21); retry shares one budget (AC-12); D3 and D4 closed.

## AC coverage
AC-1 to AC-18 covered in code and tests. AC-8 pick list deferred (B-3). AC-19 bundle-scan evidence not in diff. AC-22 OK. AC-23 partial (L-3). AC-24 script present; results need QA run.
