# API: food-photo-calories

Status: MVP, round 1. Source of truth: `.team/food-photo-calories/contract.md` (C-API-*, C-ERR, C-ORIGIN, C-CONFIG, C-PRIV, C-DATA). Shapes and error text checked against `src/app/api/**`, `src/server/errors.ts`, `src/shared/api-types.ts`, `src/shared/schemas.ts` on branch `docs/food-photo-calories` (same content as `feature/food-photo-calories`).

Verification: unit tests 187 passed. QA run: 237 passed, 0 failed, 26 skipped (21 need `DATABASE_URL`, 5 not-run stubs). Live provider calls, live database behaviour (rate-limit advisory lock, consent supersede, persistence) and AC-24 accuracy/latency/cost are **not yet verified**: the 21 DB-dependent tests were skipped. Any statement below about those is the intended behaviour from the contract, not a confirmed result.

Health and legal markers: anything marked **PENDING LEGAL REVIEW** must not be treated as final (consent wording, overseas transfer to the USA, provider retention of up to 30 days).

## Conventions

- Base path: `/api`. Runtime: Node.js route handlers (Next.js 16.4.0, App Router).
- Auth: Auth.js v5 session cookie (HttpOnly, SameSite=Lax, Secure). Sign-in is Google only for MVP. Every endpoint below except `GET /api/health` requires a session; without one the response is `401 UNAUTHENTICATED`.
- Content type: JSON request and response bodies, except `POST /api/analyze` which takes `multipart/form-data`.
- Success bodies carry no UI text. Every error body carries `code`, `message_th` and `retryable` (see Error codes).
- Check order on mutating routes: Origin check first (403 `BAD_ORIGIN`), then session (401), then route steps.

## Origin rule (C-ORIGIN)

Applies to every `POST`, `PUT`, `PATCH` and `DELETE` under `/api/**`, except `/api/auth/**` (Auth.js has its own CSRF protection). `GET` is not checked.

- The `Origin` header must be present and its host (including port) must equal the request host. Missing, malformed or different: `403 BAD_ORIGIN`.
- The check runs before the session check and needs no database, so it reveals nothing about auth state.
- Browsers always send `Origin` on non-GET requests. curl, smoke scripts and Playwright API calls must send `Origin` equal to the target host.

Example of a valid call from a script (replace the host with the target app's origin):

```bash
curl -i -X DELETE "https://<app-host>/api/meals?confirm=true" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>"
```

## Rate limit (C-RATE, AC-13)

- Default: 20 analyses per user per rolling 60 minutes. Configured by `ANALYZE_RATE_LIMIT_PER_HOUR` (see Environment variables).
- Counted once per `POST /api/analyze` request after the Origin, session, consent, size (413), magic-byte (400) and decode (400) checks, before the provider call. Re-estimates (`dish_hint`) count. The provider's internal retry does not count. Invalid files and consent failures do not count.
- Exceeded: `429 RATE_LIMITED` with header `Retry-After: <seconds>` (integer, minimum 1, seconds until the oldest counted event leaves the window). No provider call is made.
- State is in Postgres, so the limit holds across serverless instances. The live lock behaviour is **not yet verified**.
- Client display: on 429 the front end shows `th.rateLimit.body(minutes)` from `src/copy/th.ts` (minutes = `ceil(Retry-After / 60)`), not `message_th`.

## Size and format limits

- Accepted photo types: JPEG, PNG, WebP. Detected by magic bytes (`FFD8FF`, `89504E47`, `RIFF....WEBP`), not by declared content type.
- Client (before resize): original file must be at most 10 MB. Checked on the device; no network call if it fails.
- Server: the resized upload (client resizes to long edge at most 1024 px, JPEG) must be at most 4,000,000 bytes. Above this: `413 FILE_TOO_LARGE`.
- Platform: a request body above about 4.5 MB is refused by the hosting platform with a platform 413 before route code runs. That response has no JSON error envelope. The client resize keeps normal uploads well under this.
- Server processing (sharp): auto-rotate, resize to fit 1024 px long edge (never enlarge), re-encode JPEG q85, metadata removed (EXIF/GPS/device tags). Nothing is written to disk, to the database or to logs. Buffers are dropped when the request ends (ADR 0002).

---

## Endpoints

### 1. POST /api/analyze

Estimate calories for a food photo. Covers AC-1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 19, 20, 21.

Auth: Origin check, then session. Then active consent for the current `CONSENT_VERSION` (checked before the body is read).

Request: `multipart/form-data`

| Field | Type | Rule |
|---|---|---|
| `photo` | file | Required. JPEG, PNG or WebP, at most 4,000,000 bytes after client resize. |
| `dish_hint` | text | Optional, 1..80 characters. Used for re-estimate after a dish rename. The photo is held by the front end for the session and re-sent; the server stores nothing. |
| `dish_index` | text (integer) | Optional, 0..9, default 0. Valid only together with `dish_hint`, otherwise `400 BAD_REQUEST`. States which dish of the previous result is being replaced. The server echoes it; it does not use it for analysis. |

Example request (illustrative, `<app-host>` and cookie are placeholders):

```bash
curl -i -X POST "https://<app-host>/api/analyze" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>" \
  -F "photo=@./plate.jpg;type=image/jpeg"
```

Re-estimate example:

```bash
curl -i -X POST "https://<app-host>/api/analyze" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>" \
  -F "photo=@./plate-1024.jpg;type=image/jpeg" \
  -F "dish_hint=ข้าวผัดกุ้ง" \
  -F "dish_index=0"
```

Success, food (200). Values are illustrative; real values come from the model.

```json
{
  "request_id": "5c1d2e3f-0000-4000-8000-000000000001",
  "model": "claude-sonnet-5-5",
  "is_food": true,
  "dishes": [
    {
      "name_th": "ข้าวผัดกุ้ง",
      "name_en": "Shrimp fried rice",
      "grams": 350,
      "kcal_low": 540,
      "kcal_high": 680,
      "confidence": 0.8,
      "assumptions": ["ใช้น้ำมันพืชประมาณ 1 ช้อนโต๊ะ"]
    }
  ],
  "dish_index": 0
}
```

Success, not food (200). No kcal is returned. The front end shows the "not food" message and offers manual entry.

```json
{
  "request_id": "5c1d2e3f-0000-4000-8000-000000000002",
  "model": "claude-sonnet-5-5",
  "is_food": false,
  "dishes": [],
  "dish_index": 0
}
```

Response fields:

| Field | Type | Notes |
|---|---|---|
| `request_id` | string | Use when reporting a problem. Logged with metadata only. |
| `model` | string | The exact `FOOD_VISION_MODEL` used. |
| `is_food` | boolean | `false` means `dishes` is empty. |
| `dishes` | Dish[] | 1..10 when `is_food` is true. |
| `dish_index` | integer | Echo of the request field, 0 when not sent. |

Dish:

| Field | Type | Rule |
|---|---|---|
| `name_th` | string | 1..120 characters. |
| `name_en` | string | 1..120 characters. Always present in an analysis result. |
| `grams` | integer | 1..5000. |
| `kcal_low` | integer | 0..5000. |
| `kcal_high` | integer | At least `kcal_low`, at most 5000. Shown as a range, never as one number. |
| `confidence` | number | 0..1. Front end label: at least 0.75 high, at least 0.5 medium, else low. |
| `assumptions` | string[] | 0..6 items, each 1..160 characters, Thai (e.g. oil, sauce, coconut milk, sugar). |

Re-estimate rule: the front end replaces `dishes[dish_index]` of its current result with `dishes[0]` of the response. Extra dishes in a re-estimate response are ignored.

Errors:

| Status | Code | When | Extra fields |
|---|---|---|---|
| 400 | `INVALID_FILE_TYPE` | Magic bytes are not JPEG, PNG or WebP, or sharp cannot decode the image. | |
| 400 | `BAD_REQUEST` | Missing `photo`, bad form, `dish_index` without `dish_hint`, field out of range. | `details` (zod issues, path and code only; no user content echoed) |
| 401 | `UNAUTHENTICATED` | No session. | |
| 403 | `BAD_ORIGIN` | Origin missing or different. | |
| 403 | `CONSENT_REQUIRED` | No active consent for `CONSENT_VERSION`. | |
| 413 | `FILE_TOO_LARGE` | Resized upload above 4,000,000 bytes. | |
| 429 | `RATE_LIMITED` | Over the hourly limit. Header `Retry-After`. | |
| 500 | `INTERNAL_ERROR` | Unexpected server fault. | `fallback: "manual"` |
| 502 | `PROVIDER_ERROR` | Fatal provider error (400/401/403/404/413), or retryable error still failing after the one retry. | `retryable: true`, `fallback: "manual"` |
| 502 | `PROVIDER_INVALID_OUTPUT` | Output invalid twice (JSON parse or zod validation). | `fallback: "manual"` |
| 504 | `PROVIDER_TIMEOUT` | Both attempts timed out (`ANALYZE_ATTEMPT_TIMEOUT_MS` per attempt). | `retryable: true`, `fallback: "manual"` |

Provider behaviour (internal, C-VISION): at most 2 provider attempts per request, shared between transport retry and invalid-output retry. Retryable: timeout, network error, HTTP 429, 500, 502, 503, 529. Fatal (no retry): 400, 401, 403, 404, 413. The provider request uses only the keys `model`, `max_tokens` (2048), `system`, `messages`, `output_config`. `temperature`, `top_p`, `top_k`, `thinking` and assistant prefill are never sent (AC-21). Live behaviour of this against the provider is **not yet verified**.

Data handling (C-PRIV): the photo is sent to Anthropic (processor) in the USA. **PENDING LEGAL REVIEW.** Provider default retention of up to 30 days is noted in ADR 0002. **PENDING LEGAL REVIEW.**

---

### 2. GET /api/consent

Read the caller's consent status. Covers AC-14, 15, 16, 18.

Auth: session. No Origin check (GET).

Example:

```bash
curl -i "https://<app-host>/api/consent" -H "Cookie: <session-cookie>"
```

Response (200):

```json
{
  "required_version": "2026-10-v1",
  "active": true,
  "version": "2026-10-v1",
  "consented_at": "2026-10-08T03:15:00.000Z",
  "withdrawn_at": null
}
```

Fields: `required_version` is the server's current `CONSENT_VERSION` (`src/shared/consent.ts`). `active` is true only if the user has a record with `withdrawn_at` null, `superseded_at` null and `version` equal to `required_version`. `version`, `consented_at` and `withdrawn_at` describe the latest record, or are null if none.

Errors: 401 `UNAUTHENTICATED`.

---

### 3. POST /api/consent

Record consent for the current version. Covers AC-15, AC-18.

Auth: Origin check, then session.

Request body:

```json
{ "version": "2026-10-v1", "accepted": true }
```

`accepted` must be the literal `true`. The front end sends this only after the user ticks a box that starts unticked (AC-15). The server cannot see the checkbox; QA tests the UI for no pre-tick and no bundling.

Example:

```bash
curl -i -X POST "https://<app-host>/api/consent" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"version":"2026-10-v1","accepted":true}'
```

Responses:

- 201, same shape as GET: a new consent record was inserted.
- 200, same shape as GET: an active record for this version already exists. No new row.
- If an open record for an older version exists, the same transaction sets its `superseded_at` (not `withdrawn_at`) and inserts the new row (D4). The audit trail can tell "user withdrew" (`withdrawn_at`) from "text version replaced" (`superseded_at`).

Errors:

| Status | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Body not JSON, `accepted` not literal `true`, or `version` missing. |
| 401 | `UNAUTHENTICATED` | No session. |
| 403 | `BAD_ORIGIN` | Origin missing or different. |
| 409 | `CONSENT_VERSION_MISMATCH` | Client sent a version other than `required_version`. Response includes `required_version`. |

---

### 4. DELETE /api/consent

Withdraw consent (AC-16, AC-18). After withdrawal, analysis is blocked until the user consents again.

Auth: Origin check, then session.

Example:

```bash
curl -i -X DELETE "https://<app-host>/api/consent" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>"
```

Response (200): same shape as GET, with `active: false` and `withdrawn_at` set on the open record. If there is no open record: 200, no change (idempotent). Records are never deleted by withdrawal.

Errors: 401 `UNAUTHENTICATED`, 403 `BAD_ORIGIN`.

---

### 5. POST /api/meals

Save one meal, one row per dish. Covers AC-8 (persisted result), AC-10, AC-11 (manual save).

Auth: Origin check, then session. Saving a manual meal needs no consent (no transfer, ADR 0002).

Request body:

```json
{
  "items": [
    {
      "dish_name_th": "ข้าวผัดกุ้ง",
      "dish_name_en": "Shrimp fried rice",
      "portion_grams": 350,
      "kcal_low": 540,
      "kcal_high": 680,
      "edited": false,
      "source": "ai"
    },
    {
      "dish_name_th": "น้ำส้มคั้น",
      "dish_name_en": null,
      "portion_grams": 250,
      "kcal_low": 110,
      "kcal_high": 120,
      "edited": true,
      "source": "ai"
    }
  ]
}
```

`MealItemIn` rules:

| Field | Rule |
|---|---|
| `dish_name_th` | 1..120 characters. |
| `dish_name_en` | Optional, nullable, 0..120 characters. `null` when the user typed the dish name (rename rule). |
| `portion_grams` | Integer 1..5000. |
| `kcal_low` | Integer 0..5000. |
| `kcal_high` | Integer, at least `kcal_low`, at most 5000. |
| `edited` | Boolean. Must be `false` when `source` is `"manual"`. |
| `source` | `"ai"` or `"manual"`. |

Items: 1..10 per request. Rows are created in one transaction. `created_at` is set by the server.

Two dishes from one photo are saved as two independent rows. There is no group id, so later views cannot regroup them (known limitation, C-DESIGN-Q Q3).

Manual entry: the front end sends `source: "manual"`, `dish_name_en: null`, `kcal_low == kcal_high == user value`. Display is still a range "N - N" (Q4).

Rename rule (Q7): if the user renames a dish without re-estimating, the front end sends `dish_name_en: null` and `edited: true`. A stale English name is never kept next to a new Thai name.

Response (201):

```json
{
  "items": [
    {
      "id": "0b7e6c2a-3d1f-4c8e-9a52-6f1e2d3c4b5a",
      "dish_name_th": "ข้าวผัดกุ้ง",
      "dish_name_en": "Shrimp fried rice",
      "portion_grams": 350,
      "kcal_low": 540,
      "kcal_high": 680,
      "edited": false,
      "source": "ai",
      "created_at": "2026-10-08T05:20:11.000Z"
    }
  ]
}
```

Errors: 400 `BAD_REQUEST` (includes `details`), 401 `UNAUTHENTICATED`, 403 `BAD_ORIGIN`.

---

### 6. GET /api/meals

List the caller's meals, newest first. Covers AC-10, AC-17.

Auth: session. No Origin check (GET).

Query: `limit` (integer 1..50, default 20), `before` (ISO 8601 datetime with offset, optional; pass the previous `next_before` to page).

```bash
curl -i "https://<app-host>/api/meals?limit=20" -H "Cookie: <session-cookie>"
```

Response (200):

```json
{
  "items": [
    {
      "id": "0b7e6c2a-3d1f-4c8e-9a52-6f1e2d3c4b5a",
      "dish_name_th": "ข้าวผัดกุ้ง",
      "dish_name_en": "Shrimp fried rice",
      "portion_grams": 350,
      "kcal_low": 540,
      "kcal_high": 680,
      "edited": false,
      "source": "ai",
      "created_at": "2026-10-08T05:20:11.000Z"
    }
  ],
  "next_before": null
}
```

`next_before` is null when there is no further page. Only the caller's rows are returned.

Errors: 400 `BAD_REQUEST` (invalid `limit` or `before`), 401 `UNAUTHENTICATED`.

---

### 7. DELETE /api/meals?confirm=true

Hard-delete all of the caller's meal rows (AC-17, "all food data"). Consent records are kept for audit (AC-18). No photos exist to delete (ADR 0002).

Auth: Origin check, then session.

```bash
curl -i -X DELETE "https://<app-host>/api/meals?confirm=true" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>"
```

Response: 204, no body.

Errors: 400 `BAD_REQUEST` when `confirm` is not exactly `true`, 401 `UNAUTHENTICATED`, 403 `BAD_ORIGIN`.

---

### 8. DELETE /api/meals/{id}

Hard-delete one meal row (AC-17).

Auth: Origin check, then session.

```bash
curl -i -X DELETE "https://<app-host>/api/meals/0b7e6c2a-3d1f-4c8e-9a52-6f1e2d3c4b5a" \
  -H "Origin: https://<app-host>" \
  -H "Cookie: <session-cookie>"
```

Response: 204, no body.

Errors:

- 404 `NOT_FOUND`: no such row, not owned by the caller, or `{id}` is not a valid UUID. Non-UUID ids return 404, not 400.
- 401 `UNAUTHENTICATED`, 403 `BAD_ORIGIN`.

---

### 9. GET /api/health

Liveness for deploy smoke (D6). No auth, no Origin check.

```bash
curl -i "https://<app-host>/api/health"
```

Response (200), exactly:

```json
{ "status": "ok" }
```

It does not report Node version, env names or values, key presence, database state, or call the provider (AC-19). Runtime versions come from the deploy smoke commands, not from this route.

---

### Auth.js routes

`/api/auth/**` (Auth.js handlers, `src/app/api/auth/[...nextauth]/route.ts`) is excluded from the Origin rule. Sign-in page: `/signin`. Only Google sign-in is offered in MVP (login provider B-2, owner PM). No account name field exists in the API or settings (Q5).

---

## Error codes

Every error body has this shape:

```json
{ "error": { "code": "RATE_LIMITED", "message_th": "...", "retryable": false, "fallback": "manual" } }
```

`message_th` is always present. `fallback` is present only where the front end must show the manual-entry form. `details` appears on `BAD_REQUEST` from zod validation. `required_version` appears on `CONSENT_VERSION_MISMATCH`.

`message_th` values below are copied from `src/server/errors.ts` (BE). The front end may refine wording through copy review, and shows `message_th` unless it overrides by `code`.

| Code | Status | retryable | fallback | message_th |
|---|---|---|---|---|
| `UNAUTHENTICATED` | 401 | false | | กรุณาเข้าสู่ระบบก่อนใช้งาน |
| `BAD_ORIGIN` | 403 | false | | คำขอนี้ไม่ได้มาจากแอปของเรา กรุณารีเฟรชหน้าแล้วลองอีกครั้ง |
| `BAD_REQUEST` | 400 | false | | ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง |
| `NOT_FOUND` | 404 | false | | ไม่พบรายการนี้ |
| `CONSENT_REQUIRED` | 403 | false | | ต้องให้ความยินยอมก่อนจึงจะวิเคราะห์รูปได้ |
| `CONSENT_VERSION_MISMATCH` | 409 | false | | ข้อความความยินยอมมีการอัปเดต กรุณาอ่านและยืนยันอีกครั้ง |
| `INVALID_FILE_TYPE` | 400 | false | | รองรับเฉพาะรูป JPEG, PNG, WebP ขนาดไม่เกิน 10 MB |
| `FILE_TOO_LARGE` | 413 | false | | ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB) |
| `RATE_LIMITED` | 429 | false | | วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว กรุณารอสักครู่ |
| `PROVIDER_ERROR` | 502 | true | manual | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| `PROVIDER_INVALID_OUTPUT` | 502 | false | manual | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| `PROVIDER_TIMEOUT` | 504 | true | manual | วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้ |
| `INTERNAL_ERROR` | 500 | true | on `/api/analyze` only | เกิดข้อผิดพลาดภายในระบบ กรุณาลองอีกครั้ง |

Notes:

- `INTERNAL_ERROR` is the catch-all for unexpected faults. The body has no stack, no exception text and no request data (AC-20).
- `FILE_TOO_LARGE` has its own message (R4 text, from `FILE_TOO_LARGE_TH` in `src/server/errors.ts`) that states the 4 MB limit after resize and the 10 MB limit on the original. `INVALID_FILE_TYPE` uses the shared message that states the 10 MB limit. The server's own cap is 4,000,000 bytes on the resized upload; the 10 MB limit is enforced on the device before resize.

### Front-end strings tied to errors (from `src/copy/th.ts`)

These are shown by the front end, not returned by the API. Copied verbatim.

| Key | Text |
|---|---|
| `rejected.sizeTitle` | ไฟล์ใหญ่เกินไป |
| `rejected.typeTitle` | ไฟล์ไม่รองรับ |
| `rejected.body` | ไฟล์ต้องไม่เกิน 10 MB และเป็น JPEG, PNG หรือ WebP เลือกรูปอื่นหรือถ่ายใหม่ |
| `rateLimit.title` | วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว |
| `rateLimit.body(minutes)` | ลองวิเคราะห์รูปใหม่ได้ในอีกประมาณ {minutes} นาที ระหว่างนี้คุณกรอกข้อมูลมื้ออาหารเองได้ |
| `fallback.title` | วิเคราะห์รูปไม่สำเร็จ |
| `fallback.body` | ระบบลองให้อีกครั้งแล้วแต่ยังไม่ได้ผล รูปของคุณไม่ได้ถูกบันทึก ลองใหม่อีกครั้ง หรือกรอกข้อมูลเองด้านล่างเพื่อบันทึกมื้อนี้ |
| `notFood.title` | ไม่พบอาหารในรูปนี้ |
| `notFood.body` | ลองถ่ายใหม่ให้เห็นอาหารทั้งจานชัด ๆ ในที่ที่มีแสงพอ หรือกรอกข้อมูลเอง |
| `genericError` | ทำรายการไม่สำเร็จ ลองอีกครั้ง |

`disclaimer.short` (shown on every estimate screen, AC-6): ค่าแคลอรี่เป็นการประมาณ ไม่ใช่คำแนะนำทางการแพทย์

---

## Environment variables

Names only. Values are never stored in this document or in the repo. `.env.example` lists the names with empty values or defaults.

| Name | Required | Default | Rule |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | none | Server only. Never `NEXT_PUBLIC_*`. Marked Sensitive in Vercel. |
| `FOOD_VISION_MODEL` | no | `claude-sonnet-5-5` | Exact model ID. Startup rejects an empty value, aliases (`*-latest`, or no version number) and anything not matching `^claude-[a-z0-9]+(-[a-z0-9]+)*$`. |
| `DATABASE_URL` | yes | none | Postgres connection string. |
| `AUTH_SECRET` | yes | none | Auth.js. |
| `AUTH_GOOGLE_ID` | yes | none | Auth.js, Google sign-in. |
| `AUTH_GOOGLE_SECRET` | yes | none | Auth.js, Google sign-in. |
| `ANALYZE_RATE_LIMIT_PER_HOUR` | no | `20` | Positive integer. Per user, rolling 60 minutes. |
| `ANALYZE_ATTEMPT_TIMEOUT_MS` | no | `22000` | Positive integer. Per provider attempt. |

Config is read once in `src/server/config.ts` and validated at startup (`src/instrumentation.ts`). Missing or invalid required values fail startup.

---

## Data and migrations (reference)

Migrations in `db/migrations/`:

- `0000_init.sql` (and `0000_init.down.sql`): users, accounts (Auth.js Drizzle adapter), `consent_records`, `meal_logs`, `analysis_events`.
- `0001_consent_superseded.sql` (and `.down.sql`): adds nullable `consent_records.superseded_at` and replaces the one-open-row unique index so it covers `withdrawn_at is null and superseded_at is null`. Additive.

No table holds photos, thumbnails or image-derived data (ADR 0002). `analysis_events` holds user id and time only, and feeds the rate limit.

Whether these migrations have been applied to any live database is **not yet verified**.

---

## Known gaps and contract differences

1. `FILE_TOO_LARGE` (R4 text) states the 4 MB limit after resize, but the server rejects resized uploads above 4,000,000 bytes, and the 10 MB limit applies to the original file on the device before resize (contract C-API-ANALYZE constraint). A body above the platform limit gets a platform 413 with no envelope.
2. `DELETE /api/meals/{id}` returns 404 `NOT_FOUND` for a non-UUID id.
3. Single-dish limitation: one photo can produce up to 10 dishes, saved as separate unlinked rows.
4. Dish names: free text only. No dish pick list in MVP (B-3, licensing of a Thai food list).
5. Login: Google only for MVP (B-2).
6. Consent text (Thai, `src/shared/consent.ts`) and its legal wording: **PENDING LEGAL REVIEW** (B-1). Blocks release, not build.
7. Accuracy, latency and cost thresholds (AC-24): **not yet verified**. This document makes no accuracy claim.

Checked and matching the contract: error codes and status values, `message_th` table, consent endpoint shapes and 201/200 rule, meal limits (1..10 items, 5000 kcal caps), `dish_index` requires `dish_hint`, `INTERNAL_ERROR` on `/api/analyze` carries `fallback: "manual"` (`fallbackManual` option in `api()`), health returns only `{"status":"ok"}`, env names.
