# Contract: food-photo-calories

Date: 2026-10-08. Architect round 5 (r1 plus designer Q1-Q6, frontend-dev Q7, backend deltas D1-D6, docs-writer rulings R1-R4, see C-DESIGN-Q, C-BE-DELTAS, C-DOCS-RULINGS). Inputs: ac.md, brief.md, docs/plan/food-photo-calories.md, ADR 0001 (Accepted), 0002 (Proposed), 0003 (Accepted), deploy.md (devops r1), design.md. New decision record: ADR 0004.
Every section has a stable id (`C-*`). The `AC id -> section` table is `C-TRACE`.

## C-STACK Stack and reasons

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 24.x LTS (`engines.node = "24.x"`, `.nvmrc` 24.21.0) | Copied from deploy.md pin table. |
| Framework | Next.js 16.4.0 exact, App Router, TypeScript strict, route handlers | deploy.md pin; one deployable unit, server routes hold the key (AC-19). |
| Hosting | Vercel, region `sin1`, staging = Preview, production = Production | User decision; deploy.md. |
| Database | Postgres (Vercel Marketplace provider, Neon expected; devops provisions) | Durable, shared across serverless instances. Needed for consent audit, meal logs, rate limit. See ADR 0004. |
| ORM and migrations | Drizzle ORM + drizzle-kit SQL migrations in `db/migrations/` | Typed, plain SQL migrations, small. |
| Auth | Auth.js v5, JWT session cookie, users stored via Drizzle adapter, Google sign-in for MVP | Gives a stable user id for AC-13/16/18. Login provider is a user-facing choice: blocker B-2 (owner PM). Adding LINE later is additive. |
| Validation | zod (request bodies, provider output) | One schema source for BE; types exported to FE. |
| Image processing | sharp (server), Canvas/ImageBitmap (client) | Server re-encode removes metadata even if a client skips resize. |
| Model SDK | `@anthropic-ai/sdk` 0.132.1 exact (deploy.md), `maxRetries: 0` | We own the retry so AC-11/12 count is exact. |
| Package manager | npm 11, `package-lock.json`, `npm ci` | deploy.md. |
| Tests | Vitest (unit, BE and FE), Playwright (QA e2e) | Standard for this stack. |

Runtime alignment with deploy.md (2026-10-08): Node 24.x, Next 16.4.0, SDK 0.132.1, npm 11, region sin1: MATCH. Re-check at 3d if devops moves a pin.

## C-CONFIG Environment and config

All read once in `src/server/config.ts` (BE). Fail fast at startup via `src/instrumentation.ts` `register()`.

| Name | Required | Default | Rule |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | none | Server only. Never `NEXT_PUBLIC_*`. |
| `FOOD_VISION_MODEL` | no | `claude-sonnet-5-5` | Exact model ID. Startup rejects empty, aliases (`*-latest`, no version) and anything not matching `^claude-[a-z0-9]+(-[a-z0-9]+)*$`. Never hardcoded elsewhere. |
| `DATABASE_URL` | yes | none | Postgres connection string. |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | yes | none | Auth.js. |
| `ANALYZE_RATE_LIMIT_PER_HOUR` | no | `20` | See C-RATE. |
| `ANALYZE_ATTEMPT_TIMEOUT_MS` | no | `22000` | Per provider attempt. |

`.env.example` (devops) lists names only.

## C-VISION Provider module (single call site)

File: `src/server/vision/analyze-food.ts` (BE). It is the only file allowed to import `@anthropic-ai/sdk` (ESLint `no-restricted-imports`, config owned by devops; file starts with `import "server-only"`).

Signature: `analyzeFood({ image: Buffer, mediaType: "image/jpeg", dishHint?: string }) -> Promise<{ result: AnalysisResult, usage: { input_tokens, output_tokens }, latency_ms }>`. Throws typed `ProviderError { kind: "retryable" | "fatal" | "invalid_output" | "timeout" }`.

Request body allowlist (AC-21). Only these top-level keys are sent: `model`, `max_tokens`, `system`, `messages`, `output_config`.
- `model` = config.FOOD_VISION_MODEL.
- `max_tokens` = 2048.
- `output_config` = `{ effort: "low", format: { type: "json_schema", schema: <C-SCHEMA-OUT> } }`.
- `messages` = one `user` turn: image block (base64, `image/jpeg`) then a text block. Last turn is `user`; no assistant prefill.
- Never sent: `temperature`, `top_p`, `top_k`, `thinking`, any other key. A unit test asserts the key set of the built request equals the allowlist (the request builder is exported as a pure function for this).

Behaviour:
1. Attempt 1 with timeout `ANALYZE_ATTEMPT_TIMEOUT_MS`.
2. Retryable: timeout, network error, HTTP 429, 500, 502, 503, 529. Fatal (no retry): 400, 401, 403, 404, 413. One retry only, no backoff longer than 500 ms.
3. Output parse: take text content, `JSON.parse`, validate with zod `AnalysisResultSchema` (C-SCHEMA-OUT, includes bounds the provider schema cannot enforce). Invalid -> one retry (AC-12, shares the single retry budget: at most 2 provider attempts per request). Still invalid -> `invalid_output`.
4. Provider schema carries structure only (types, required, enums). Numeric bounds, `kcal_low <= kcal_high`, dish count are enforced by zod, not by the provider schema.
5. System prompt (in `src/server/vision/prompt.ts`): estimate Thai and international dishes, return Thai and English names, state assumptions (oil, sauce, coconut milk, sugar), give a low/high range, set `is_food=false` and `dishes=[]` for non-food. `dish_hint` is passed as quoted data in the user text block, never as instructions; output is schema-constrained.
6. Logging: metadata only (request_id, model, status, latency_ms, input/output tokens, attempt count). See C-LOG.

## C-SCHEMA-OUT Shared types and provider output schema

Owner BE: `src/shared/api-types.ts` (types) and `src/shared/schemas.ts` (zod). FE imports, never edits.

```ts
type Dish = {
  name_th: string;        // 1..120 chars
  name_en: string;        // 1..120 chars
  grams: number;          // integer 1..5000
  kcal_low: number;       // integer 0..5000
  kcal_high: number;      // integer >= kcal_low, <= 5000
  confidence: number;     // 0..1
  assumptions: string[];  // 0..6 items, each 1..160 chars, Thai
};
type AnalysisResult =
  | { is_food: true;  dishes: Dish[] }   // 1..10 dishes
  | { is_food: false; dishes: [] };
```

Provider JSON schema = same shape, `additionalProperties: false`, no numeric/length keywords. `is_food=true` with zero dishes is invalid output (retry per C-VISION).

## C-ERR Error format and language rule

One rule: the server returns a stable `code` and a Thai `message_th` for every error; FE shows `message_th` and may override copy by `code`. Success bodies carry no UI text.

Error body, all endpoints:
```json
{ "error": { "code": "RATE_LIMITED", "message_th": "...", "retryable": false, "fallback": "manual" } }
```
`message_th` is required in the envelope for every error code, no exceptions (incl. BAD_ORIGIN, BAD_REQUEST, UNAUTHENTICATED, NOT_FOUND, INTERNAL_ERROR). Default Thai text per code lives in `src/server/errors.ts` (BE); FE may refine wording through copy review but the field is always present:

| Code | Status | Default message_th |
|---|---|---|
| UNAUTHENTICATED | 401 | กรุณาเข้าสู่ระบบก่อนใช้งาน |
| BAD_ORIGIN | 403 | คำขอนี้ไม่ได้มาจากแอปของเรา กรุณารีเฟรชหน้าแล้วลองอีกครั้ง |
| BAD_REQUEST | 400 | ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง |
| NOT_FOUND | 404 | ไม่พบรายการนี้ |
| CONSENT_REQUIRED | 403 | ต้องให้ความยินยอมก่อนจึงจะวิเคราะห์รูปได้ |
| CONSENT_VERSION_MISMATCH | 409 | ข้อความความยินยอมมีการอัปเดต กรุณาอ่านและยืนยันอีกครั้ง |
| INVALID_FILE_TYPE | 400 | รองรับเฉพาะรูป JPEG, PNG, WebP ขนาดไม่เกิน 10 MB |
| FILE_TOO_LARGE | 413 | ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB) |
| RATE_LIMITED | 429 | วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว กรุณารอสักครู่ |
| PROVIDER_ERROR | 502 | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| PROVIDER_INVALID_OUTPUT | 502 | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| PROVIDER_TIMEOUT | 504 | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| INTERNAL_ERROR | 500 | เกิดข้อผิดพลาดภายในระบบ กรุณาลองอีกครั้ง |

`INTERNAL_ERROR` is the generic catch-all for unexpected server faults: body has only `code`, `message_th`, `retryable: true`; no stack, no message text from the exception, no request data (AC-20). Any route that catches an unknown error returns it. On `/api/analyze` it also carries `fallback: "manual"`.

`fallback: "manual"` is present when FE must show the manual-entry form (C-API-ANALYZE failures). Malformed body 400 `BAD_REQUEST` carries `details` (zod issues, no user content echoed).

Check order for mutating routes: origin check (C-ORIGIN) first, then session (401), then route-specific steps.

## C-ORIGIN Origin check on mutating requests

Applies to every `POST`, `PUT`, `PATCH`, `DELETE` under `/api/**` except `/api/auth/**` (Auth.js has its own CSRF protection). `GET` is not checked.
- The `Origin` header must be present and its host must equal the request host. Missing or different: 403 `BAD_ORIGIN`.
- Runs before the session check, so it needs no DB and gives no information about auth state.
- Reason: browsers always send `Origin` on non-GET fetches, so a missing header means a non-browser or forged client; the cookie is SameSite=Lax as a second layer.
- Consequence for test tools: curl, smoke scripts and Playwright API calls must send `Origin` equal to the target host (devops smoke, qa-tester).

## C-API-ANALYZE POST /api/analyze

Covers AC-1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 19, 20, 21. Route file `src/app/api/analyze/route.ts`, `export const runtime = "nodejs"`, `export const maxDuration = 60`.

Auth: origin check (C-ORIGIN), then session required.

Request: `multipart/form-data`
| Field | Type | Rule |
|---|---|---|
| `photo` | file | Required. Client has already resized (<= 1024 px long edge JPEG) and stripped metadata. Server cap 4,000,000 bytes (platform body limit is about 4.5 MB). |
| `dish_hint` | text | Optional, 1..80 chars. Used by FE for re-estimate after a dish rename (AC-8). Photo is held by FE for the session, re-sent; server stores nothing. |
| `dish_index` | text (integer) | Optional, 0..9, default 0. Valid only together with `dish_hint` (else 400 `BAD_REQUEST`). States which dish of the previous result the client is replacing. The server does not use it for analysis; it echoes it in the 200 response so FE replaces the right dish. |

Server steps, in this exact order (R1, R2):
1. Origin check, then session check (401).
2. Active consent for current `CONSENT_VERSION` (403 `CONSENT_REQUIRED`). Checked before the body is read.
3. Parse multipart and validate the file, cheapest check first:
   a. Size over cap 4,000,000 bytes: 413 `FILE_TOO_LARGE`.
   b. Type by magic bytes (JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`), not by declared content type: otherwise 400 `INVALID_FILE_TYPE`.
   c. Decode and normalize with sharp: auto-rotate, resize to fit 1024 px long edge (never enlarge), re-encode JPEG q85, no metadata kept (removes EXIF/GPS/device tags). A file that passes the magic bytes but fails to decode: 400 `INVALID_FILE_TYPE`.
   All three are "file validation" for C-RATE: no provider call and no rate-limit count happen if any fails. The processed buffer is the only thing later sent. Nothing is written to disk, DB or logs; buffers are dropped when the request ends (ADR 0002).
4. Rate limit check and record (C-RATE). 429 `RATE_LIMITED` with `Retry-After` seconds.
5. `analyzeFood` (C-VISION).
6. Respond.

Responses:
| Status | Body | When |
|---|---|---|
| 200 | `{ "request_id": string, "model": string, "is_food": true, "dishes": Dish[], "dish_index": number }` | Success (AC-4). `dish_index` echoed (0 when not sent). On re-estimate FE replaces `dishes[dish_index]` of its current result with `dishes[0]` of the response (the hint targets one dish; extra dishes in the response are ignored by FE). |
| 200 | `{ "request_id", "model", "is_food": false, "dishes": [], "dish_index": number }` | Not food (AC-7). No kcal returned. FE shows "not food" message and offers manual entry. |
| 400 | `INVALID_FILE_TYPE`, `BAD_REQUEST` | See above. |
| 401 | `UNAUTHENTICATED` | |
| 403 | `CONSENT_REQUIRED`, `BAD_ORIGIN` | |
| 413 | `FILE_TOO_LARGE` | |
| 429 | `RATE_LIMITED` | |
| 500 | `INTERNAL_ERROR` (`fallback: "manual"`) | Unexpected server fault. |
| 502 | `PROVIDER_ERROR` (`retryable: true`, `fallback: "manual"`) | Fatal provider error, or retryable error persisted after the one retry (AC-11). |
| 502 | `PROVIDER_INVALID_OUTPUT` (`fallback: "manual"`) | Two invalid outputs (AC-12). |
| 504 | `PROVIDER_TIMEOUT` (`retryable: true`, `fallback: "manual"`) | Both attempts timed out. |

Limits and who states them (R4). The limit a user sees is 10 MB on the original file; it is enforced and worded client-side (FE copy in `src/copy/th.ts`, AC-1) before resize. The server cap of 4,000,000 bytes applies to the already-resized upload, so a compliant client never hits it. Bodies above the platform limit (about 4.5 MB) are refused by Vercel with a platform 413 before route code runs. The server `FILE_TOO_LARGE` text states its own real limit (4 MB after resize) and points back to the 10 MB original limit, so it is accurate whichever way it is reached.

## C-API-CONSENT Consent endpoints

Covers AC-14, 15, 16, 18. Files `src/app/api/consent/route.ts`. Auth required on all; origin check on POST and DELETE.

Current version constant `CONSENT_VERSION` (string, e.g. `2026-10-v1`) and the Thai consent text live together in `src/shared/consent.ts` (FE owns; BE imports the constant). A text change bumps the version in the same file, which forces re-consent. BE file `src/server/consent-version.ts` may exist only as a transitional re-export of that constant until FE's file is merged; then it is deleted and BE imports `src/shared/consent.ts` directly (D3).

- `GET /api/consent` -> 200 `{ required_version, active: boolean, version: string|null, consented_at: string|null, withdrawn_at: string|null }`. `active` is true only if the user has a record with `withdrawn_at` null, `superseded_at` null and `version == required_version`.
- `POST /api/consent` body `{ "version": string, "accepted": true }` -> 201 with the same shape as GET (new record). If an active record for that version exists: 200, no new row. If an open record for an older version exists, the same transaction sets its `superseded_at = now()` (not `withdrawn_at`) and inserts the new row (D4). Errors: 400 `BAD_REQUEST` (`accepted` not literally `true`), 409 `CONSENT_VERSION_MISMATCH` (client sent an old version; includes `required_version`). FE sends this only after the user ticks an initially unticked box (AC-15); the server cannot see the checkbox, so QA tests the UI for no pre-tick and no bundling.
- `DELETE /api/consent` (withdraw) -> 200 same shape with `active:false`, `withdrawn_at` set on the open record. No open record: 200, no change (idempotent). Records are never deleted by withdrawal (audit, AC-18).

Consent and manual entry: saving a manual meal needs no consent (no transfer, ADR 0002).

## C-API-MEALS Meal log endpoints

Covers AC-8 (persisted result), 9, 10, 11 (manual save), 17. File `src/app/api/meals/route.ts`, `src/app/api/meals/[id]/route.ts`. Auth required; origin check on POST and DELETE.

Types:
```ts
type MealItemIn = {
  dish_name_th: string;        // 1..120
  dish_name_en?: string|null;  // 0..120; null when the user typed the dish name (see rename rule)
  portion_grams: number;       // integer 1..5000
  kcal_low: number;            // integer 0..5000
  kcal_high: number;           // integer >= kcal_low, <= 5000
  edited: boolean;             // true only when source="ai" and the user changed dish or portion
  source: "ai" | "manual";     // manual => edited must be false
};
type Meal = MealItemIn & { id: string /*uuid*/, created_at: string /*ISO*/ };
```
- `POST /api/meals` body `{ "items": MealItemIn[] }` (1..10, one row per dish) -> 201 `{ "items": Meal[] }`. Rows created in one transaction; `created_at` set by server. Errors: 400 `BAD_REQUEST`, 401, 403 `BAD_ORIGIN`.
- Manual entry: FE sends `source:"manual"`, `dish_name_en: null`, `kcal_low == kcal_high == user value`. This is the user's own entry, not an estimate. Display stays a range "N - N" (Q4) so the UI is consistent with AC-5; FE may label it as the user's entry.
- `GET /api/meals?limit=<1..50, default 20>&before=<ISO>` -> 200 `{ "items": Meal[], "next_before": string|null }`, newest first, only the caller's rows.
- `DELETE /api/meals/{id}` -> 204. Not found, not owner, or `id` not a valid UUID: 404 `NOT_FOUND` in all three cases (R3). Hard delete.
- `DELETE /api/meals?confirm=true` -> 204, hard-deletes all of the caller's meal rows (AC-17 "all food data"). Missing `confirm`: 400 `BAD_REQUEST`. Consent records are kept for audit (AC-18); no photos exist to delete (ADR 0002).

Proportional recalc (AC-9) is client-side with no API call: `kcal' = round(kcal * newGrams / baseGrams)` for both low and high, `baseGrams` = grams of the dish in the last analysis result. Serving count is converted to grams by FE (`servings * baseGrams`).

Rename rule (Q7). When the user renames a dish without re-estimating, FE sets `dish_name_th` to the typed text, sets `dish_name_en` to `null`, keeps the kcal numbers and sets `edited=true`. FE never keeps a stale English name next to a new Thai name. A re-estimate (C-API-ANALYZE with `dish_hint` and `dish_index`) returns fresh `name_th` and `name_en` from the model and replaces both. `dish_name_en` is already nullable, so no API change. QA tests that a renamed, non-re-estimated item is saved with `dish_name_en = null`.

## C-API-HEALTH GET /api/health

For devops smoke (deploy.md). No auth, no origin check (GET). 200 `{ "status": "ok" }` and nothing else: no Node version, no env names or values, no key presence, no DB detail (AC-19, D6). Does not call the provider or read the key. File `src/app/api/health/route.ts` (BE). Devops smoke gets runtime versions from `node -v` and `next -v`, not from this route.

## C-API-AUTH Auth routes

`src/app/api/auth/[...nextauth]/route.ts` (BE, Auth.js handlers). Sign-in page `src/app/signin/page.tsx` (FE, Thai). Session cookie: HttpOnly, SameSite=Lax, Secure. No account name field in the API or settings for MVP (Q5).

## C-DATA Schema and migrations

First migration is `db/migrations/0000_init.sql` (drizzle-kit default numbering, D2), generated from `src/server/db/schema.ts` (BE). Later migrations follow as `0001_*`, and so on. Every migration must be backward compatible with the previous deployment (deploy.md rollback rule). If `0000_init` was already applied anywhere when D4 landed, the `superseded_at` column ships as a new additive migration instead of editing `0000`.

```sql
-- users, accounts: created by the Auth.js Drizzle adapter schema (JWT sessions: no sessions table)
create table consent_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  version       text not null,
  consented_at  timestamptz not null default now(),
  withdrawn_at  timestamptz,   -- set only when the user withdraws
  superseded_at timestamptz    -- set only when a newer version's consent replaces this row
);
create unique index consent_one_open_per_user on consent_records (user_id)
  where withdrawn_at is null and superseded_at is null;

create table meal_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  dish_name_th  text not null,
  dish_name_en  text,
  portion_grams integer not null check (portion_grams between 1 and 5000),
  kcal_low      integer not null check (kcal_low between 0 and 5000),
  kcal_high     integer not null check (kcal_high between kcal_low and 5000),
  edited        boolean not null default false,
  source        text not null check (source in ('ai','manual')),
  created_at    timestamptz not null default now()
);
create index meal_logs_user_created on meal_logs (user_id, created_at desc);

create table analysis_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index analysis_events_user_created on analysis_events (user_id, created_at);
```
No photo, thumbnail or image-derived column exists anywhere (ADR 0002). `analysis_events` holds user id and time only. No group id on `meal_logs` (known limitation, C-DESIGN-Q Q3).

## C-RATE Rate limit (AC-13)

Decision: confirm PM proposal, 20 analyses per user per rolling hour, configurable via `ANALYZE_RATE_LIMIT_PER_HOUR`.
Reason: worst-case spend per user is 20 x about $0.008 = about $0.16 per hour on Sonnet 5.5; a real meal-logging session is a few photos, and re-estimates (AC-8) count too, so 20 leaves room for retries without opening a cost-abuse hole. Spend cap on the Anthropic key (devops) is the second line of defence.

Mechanics (BE, `src/server/rate-limit.ts`): in one transaction, take `pg_advisory_xact_lock(hashtext(user_id))`, delete the user's events older than 24 h, count events in the last 60 min; if count >= limit return 429 with `Retry-After` = seconds until the oldest counted event ages out; else insert one event. Counted once per request that passes consent and all three file validation steps (size, type, decode), immediately before the provider call; the provider retry does not add a count; invalid, undecodable or oversized files and consent failures do not count (R1). State is in Postgres, so it holds across serverless instances. Cost note: decode runs before the limit check, so a user can spend server CPU on bad files; this is bounded by auth, consent and the 4 MB cap and accepted for MVP.

## C-PRIV Privacy and PDPA behaviour

Covers AC-2, 14, 15, 16, 17, 18, 23.
- Consent gate is in two places: FE blocks capture/upload until `GET /api/consent` shows `active` (no photo leaves the device before consent, AC-14); BE refuses analysis without active consent (C-API-ANALYZE step 2).
- Consent screen text (FE, `src/shared/consent.ts`, Thai) must name Anthropic as processor, state transfer outside Thailand to the USA, purpose, provider retention (up to 30 days, ADR 0002), the right to withdraw and delete. Legal review of the wording is B-1 (owner PM).
- Withdraw (AC-16): `DELETE /api/consent`; FE then blocks analysis until re-consent.
- Consent history (AC-15, AC-18): each consent is its own row; a new version closes the old row with `superseded_at`, a user withdrawal closes it with `withdrawn_at`. The audit trail can tell the two apart.
- Photos: processed per request, never persisted, not logged (C-LOG). No storage bucket, no CDN, no thumbnail.
- AC-23: no Thai FCD or THFOOD data in repo or build. No static dish list is shipped (Q1). CI check `scripts/check-no-thai-food-data.mjs` (devops wires, BE writes patterns): fails on files or paths matching `thfood`, `thaifcd`, `fcd` data extensions under the repo. Evaluation data lives outside the repo (`SPIKE_DATA_DIR`).

## C-LOG Logging rules (AC-20)

- Logger `src/server/log.ts` (BE) accepts only a typed metadata object (request_id, user id hash, route, status, latency_ms, token counts, error code). No generic `log(any)`.
- Request bodies and provider request/response payloads are never logged. SDK debug logging stays off: `ANTHROPIC_LOG` unset, no custom `logger`/`fetch` wrapper that prints bodies.
- `INTERNAL_ERROR` handling logs the error code and request_id only, not the exception message or stack text that could carry request data.
- A unit test runs `analyzeFood` and the route with a fake image containing a marker and asserts the marker and any base64 of it are absent from all captured console output.

## C-FE-CLIENT Client behaviour (FE)

Covers AC-1, 3, 6, 8, 9, 14, 22. Files under `src/lib/client/`.
- Pre-checks on the original file: type JPEG/PNG/WebP, size <= 10 MB; otherwise a Thai message stating the limit and no network call (AC-1). This is where the 10 MB text is owned (R4).
- Resize with `createImageBitmap(file, { imageOrientation: "from-image" })` then Canvas to JPEG q0.85, long edge <= 1024 (never enlarge). Canvas re-encode drops EXIF/GPS (AC-2, AC-3).
- Keep the resized Blob in component state only, for re-estimate; never write it to localStorage, IndexedDB or the server except via C-API-ANALYZE.
- Dish rename is free text only in MVP (Q1). On rename without re-estimate, clear `name_en` (C-API-MEALS rename rule, Q7).
- Not-medical-advice disclaimer (Thai) renders on every screen that shows an estimate or saved range, visible or one tap away on the same screen (AC-6). Copy in `src/copy/th.ts`.
- Calories shown only as `low - high kcal` (also when equal, "N - N"), with confidence label (derived from `confidence`: >= 0.75 high, >= 0.5 medium, else low) and assumptions list. No component renders a single estimate number (AC-5).
- Dish names render Thai plus English when an English name exists (AC-22); a user-typed name shows Thai only; all UI strings Thai from `src/copy/th.ts`.
- For server errors FE shows the returned `message_th` as is; no FE copy change is needed for R4.

## C-SPIKE Accuracy spike support (AC-24)

BE writes `scripts/spike/run-spike.ts`: reads images and reference table from `SPIKE_DATA_DIR` (outside repo, gitignored if inside), calls `analyzeFood` directly (no HTTP, no rate limit) with the model from `FOOD_VISION_MODEL`, 3 runs per image, writes CSV of kcal range, hit, latency_ms, input/output tokens. Run once per model (`claude-sonnet-5-5`, then `claude-haiku-5-5`). Includes a mode that sends a raw 2000x1500 image (skipping resize) to record `usage.input_tokens` on both models. Thresholds are PM-set (ac.md); qa-tester evaluates.

## C-OWN File ownership

One owner per file. Others read only; changes go through the owner via the Orchestrator.

| Owner | Files |
|---|---|
| devops | `.nvmrc`, `vercel.json`, `.env.example`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.*`, `.gitignore`, `.github/workflows/*`, `smoke/**`, Vercel project and env settings, DB provisioning |
| BE | `src/app/api/**`, `src/server/**` (config, vision, db, auth, rate-limit, log, errors, origin, consent-version re-export until D3 removal), `src/instrumentation.ts`, `src/shared/api-types.ts`, `src/shared/schemas.ts`, `db/migrations/**`, `scripts/**`, BE unit tests `src/server/**/*.test.ts` |
| FE | `src/app/(app)/**` (capture, result, edit, meals, settings pages), `src/app/signin/**`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/**`, `src/lib/client/**`, `src/copy/th.ts`, `src/shared/consent.ts`, FE unit tests next to FE files |
| qa-tester | `tests/e2e/**`, `tests/fixtures/**` |
| designer | `design.md` only |

Dependencies: FE and BE name needed packages to devops (Orchestrator relays); devops edits `package.json`. BE-needed: next, @anthropic-ai/sdk 0.132.1, drizzle-orm, drizzle-kit, postgres driver, next-auth (v5), @auth/drizzle-adapter, zod, sharp, server-only, vitest. FE-needed: vitest, testing-library.

## C-TRACE AC id to contract section

| AC | Section | Logic |
|---|---|---|
| AC-1 | C-FE-CLIENT, C-API-ANALYZE | Client 10 MB/type pre-check with the Thai limit text; server size, magic-byte and decode checks with its own accurate limit text |
| AC-2 | C-FE-CLIENT, C-API-ANALYZE step 3c | Canvas re-encode plus sharp re-encode without metadata; test inspects outgoing request image bytes |
| AC-3 | C-FE-CLIENT, C-API-ANALYZE step 3c | Client resize 1024; server enforces |
| AC-4 | C-SCHEMA-OUT, C-API-ANALYZE | Dish fields incl. name_th/name_en, grams, kcal range, confidence, assumptions |
| AC-5 | C-FE-CLIENT, C-SCHEMA-OUT | Range-only rendering rule, "N - N" when equal |
| AC-6 | C-FE-CLIENT | Disclaimer on every estimate screen |
| AC-7 | C-API-ANALYZE (200 is_food=false), C-FE-CLIENT | No kcal returned; manual entry offered |
| AC-8 | C-API-ANALYZE (`dish_hint`, `dish_index`), C-API-MEALS (rename rule), C-DESIGN-Q | Free-text rename, re-estimate or manual kcal; pick list is B-3 |
| AC-9 | C-API-MEALS (proportional recalc) | Client-side, no provider call |
| AC-10 | C-API-MEALS POST, C-DATA meal_logs | Dish, grams, kcal range, edited, created_at |
| AC-11 | C-VISION (retry), C-API-ANALYZE (500/502/504, `fallback:"manual"`), C-API-MEALS (manual save), C-ERR | One retry then manual form |
| AC-12 | C-VISION steps 3-4, C-SCHEMA-OUT | zod validation, shared single retry |
| AC-13 | C-RATE, C-API-ANALYZE step 4 | 20/h, 429, no provider call; invalid files never counted |
| AC-14 | C-PRIV, C-API-CONSENT, C-API-ANALYZE step 2 | FE gate plus BE 403 |
| AC-15 | C-API-CONSENT, C-PRIV, C-DATA | Consent text in `src/shared/consent.ts`; unticked explicit action; version history via `superseded_at` |
| AC-16 | C-API-CONSENT DELETE, C-DATA | Withdraw with `withdrawn_at`, analysis blocked |
| AC-17 | C-API-MEALS DELETE | Hard delete one or all; no photo exists |
| AC-18 | C-API-CONSENT, C-DATA consent_records | version, consented_at, user_id; kept on withdrawal and supersession |
| AC-19 | C-CONFIG, C-VISION, C-OWN, C-API-HEALTH | Key server-only; one provider module; health reveals nothing; secret scan in smoke |
| AC-20 | C-LOG, C-ERR | Typed logger, SDK debug off, marker test, no exception text |
| AC-21 | C-CONFIG, C-VISION | FOOD_VISION_MODEL validated at startup; request key allowlist test |
| AC-22 | C-FE-CLIENT, C-SCHEMA-OUT, C-ERR, C-API-MEALS (rename rule) | Thai copy file and message_th; Thai + English names for model-provided names; user-typed names Thai only (Q7) |
| AC-23 | C-PRIV | CI pattern check, no data and no static dish list in repo |
| AC-24 | C-SPIKE | Spike script, per-model run, 2000x1500 token check |

Brief item to section: Must 1 -> C-API-MEALS; Must 2 -> C-SCHEMA-OUT, C-FE-CLIENT; Must 3 -> C-FE-CLIENT; Must 4 -> C-API-ANALYZE; Must 5 -> C-API-CONSENT, C-PRIV; Must 6 -> C-RATE, C-CONFIG, C-LOG, C-ORIGIN; Must 7 -> C-VISION, C-API-ANALYZE; Must 8 -> C-FE-CLIENT; Must 9 -> C-PRIV; Runtime pin -> C-STACK, C-CONFIG, C-VISION; Spike -> C-SPIKE.

## C-DESIGN-Q Answers to designer round 2 questions (design.md lines 94-99) and frontend-dev Q7

| Q | Decision | Reason |
|---|---|---|
| Q1 dish pick list has no source | MVP edits dish by free text only; no static dish list. Open PM question B-3: is a pick list wanted, and from what licensed source. | A bundled list risks Thai FCD/THFOOD licensing (AC-23). |
| Q2 which dish a re-estimate replaces | Add `dish_index` (0..9, default 0) to POST /api/analyze, echoed in the response (C-API-ANALYZE). | Client states the target explicitly; server stays stateless. |
| Q3 two dishes = two rows, no group id | Accepted for MVP. Known limitation: rows from one photo are not linked, so a later view cannot regroup them. A `meal_group_id` column can be added later as a backward-compatible migration. | No grouping AC; keep it simple. |
| Q4 equal low and high | Keep range form "N - N" everywhere, including manual entries. | One consistent display, satisfies AC-5 literally. |
| Q5 no account name field | Out of MVP; settings shows no name. | No AC needs it. |
| Q6 message_th missing on some codes | `message_th` required for every error code (C-ERR table). | FE never needs a code-to-text fallback. |
| Q7 stale `name_en` after rename without re-estimate | FE clears `name_en` to `null` on rename (saved as `dish_name_en = null`); a re-estimate refreshes both names. No new API field. AC-22 holds for model-provided names; a user-typed name shows Thai only (B-4). | A wrong English name is worse than none; the field is already nullable. |

## C-BE-DELTAS Backend round 1 deltas (be/food-photo-calories 53d8dfe)

| # | Delta | Decision | Reason |
|---|---|---|---|
| D1 | `INTERNAL_ERROR` 500 added | Accepted as a generic 500 with `message_th`, `retryable: true`, no exception text (C-ERR). | Every route needs a safe catch-all; same envelope as other errors. |
| D2 | Migration is `0000_init.sql` | Accepted; contract text updated (C-DATA). | drizzle-kit default numbering; name has no other meaning. |
| D3 | `src/server/consent-version.ts` re-exports FE's `CONSENT_VERSION` | Accepted as a transitional re-export only. BE deletes it and imports `src/shared/consent.ts` directly once FE's file is merged; code-reviewer checks it is gone before release. | One owner per file: the constant belongs to FE's consent file, so a second copy must not live on. |
| D4 | New-version consent sets `withdrawn_at` on the old active row | Changed: use a new nullable `superseded_at` column; the one-open-row index covers both columns (C-DATA, C-API-CONSENT). | Audit must distinguish "user withdrew" from "text version replaced". |
| D5 | Strict origin check, missing Origin = 403 `BAD_ORIGIN`, before the session check | Confirmed, specified in C-ORIGIN. | Browsers always send Origin on non-GET; cheap, no DB. |
| D6 | Health returns only `{"status":"ok"}` | Confirmed (C-API-HEALTH). | AC-19: no key or env info. |

## C-DOCS-RULINGS Docs-writer findings, code vs contract (round 5)

| # | Finding | Ruling | Who changes |
|---|---|---|---|
| R1 | A file that passes the magic-byte check but fails sharp still consumed a rate-limit slot | Contract stands (invalid files must not count). Fix the order, not the counting: decode with sharp happens in step 3c, before the rate-limit step; a decode failure returns 400 `INVALID_FILE_TYPE` and no slot is used (C-API-ANALYZE, C-RATE). | BE changes code: move the sharp decode and normalize before the rate-limit step; add a unit test that a corrupt JPEG leaves `analysis_events` unchanged. Contract updated. |
| R2 | 413 size check runs before the 400 magic-byte check | Contract changes to match the code: size first, then magic bytes, then decode (cheapest first, avoids inspecting an oversized body). | None in code. Contract updated (C-API-ANALYZE step 3). QA: oversize non-image returns 413. |
| R3 | Non-UUID meal id on DELETE returns 404 | Confirmed as intended: 404 `NOT_FOUND` for not found, not owner and malformed id. | None in code. Contract updated (C-API-MEALS). |
| R4 | `FILE_TOO_LARGE` says 10 MB but the server cap is 4,000,000 bytes after resize | The user-facing limit stays 10 MB on the original, worded client-side by FE (AC-1). The server message states its own true limit: "ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB)". `INVALID_FILE_TYPE` keeps the 10 MB wording. | BE changes the `FILE_TOO_LARGE` text in `src/server/errors.ts`. FE: no change (FE already owns the 10 MB client text and shows server `message_th` as is). Contract updated (C-ERR). |

## C-OPEN Open items

- B-1 (PM): legal review of ADR 0002 consent wording and USA transfer. Does not block build; blocks release.
- B-2 (PM): confirm login provider (Google for MVP). Needed before BE wires auth.
- B-3 (PM): dish pick list for AC-8 needs a licensed source; MVP ships free text only. Non-blocking.
- B-4 (PM): confirm that user-typed dish names showing Thai only satisfies AC-22 (Q7). Non-blocking.
- B-5 (BE): implement D4 (`superseded_at`) and delete the D3 re-export. Fix round for BE, small.
- B-6 (BE): implement R1 (decode before rate limit, with test) and R4 (`FILE_TOO_LARGE` text). Fix round for BE, small.
- Non-blocking: platform body limit vs AC-1 (see C-API-ANALYZE); devops smoke posts 5 MB (expect platform 413) and 300 KB (expect 200), and all smoke and QA API calls must send an `Origin` header (C-ORIGIN). deploy.md smoke names `POST /api/analyze`: this contract uses the same path.
- deploy.md risk 4 (persistent store) is resolved by ADR 0004 (Postgres); devops provisions it.
