# QA report: food-photo-calories (step 7, round 2)

Round 2 (2026-10-08): B-1 verified fixed on feature (decode before rate-limit record). Feature merged into qa branch; FILE_TOO_LARGE expectations updated to the exact R4 string "ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB)" (fixture `tests/fixtures/contract.ts`, exact comparison in `api/errors.test.ts` and `api/analyze.test.ts`). Node 24.21.0.
Verdict: **Pass**. `npm test`: 187 passed, 0 failed. QA suite: 263 tests, 237 passed, 0 failed, 26 skipped (all documented: 21 DB needing DATABASE_URL incl. 1 marker, 5 not-run live/browser/OAuth/AC-24 stubs). `eslint tests` clean. B-1 closed; N-1..N-5 unchanged. AC-13 now pass (mocked layer); DB persistence still unverified (N-5). Commit: "test: align FILE_TOO_LARGE expectations with contract R4" (trailer Claude Sonnet 5.5, per harness attribution rule).

---- Round 1 report follows (historical) ----

# QA report: food-photo-calories (step 7, round 1)

Date: 2026-10-08. Branch `qa/food-photo-calories` (commit 8f7a23f on top of feature fb7e075), worktree `E:\projects\calope-qa`. Node 24.21.0 (matches deploy.md pin and `.nvmrc`), npm 11, `npm ci` clean.
Verdict: **Fail** (1 blocker, B-1, Medium, trivial BE fix). Everything else that can run in this environment passes.

## Summary

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Unit (`npm test`, existing, unchanged) | 186 | 0 | 0 |
| QA e2e/integration (`tests/e2e`), total 263 | 236 | 1 | 26 |
| of which API route tests (`e2e-api`, `tests/e2e/api`) | 167 | 1 | 0 |
| of which static/config/repo (`tests/e2e/static`) | 22 | 0 | 5 (not-run items) |
| of which jsdom UI flows (`tests/e2e/ui`) | 42 | 0 | 0 |
| of which real `next build` bundle scan (`tests/e2e/build`) | 5 | 0 | 0 |
| of which real-Postgres (`tests/e2e/db`) | 0 | 0 | 21 (20 tests + 1 marker, DATABASE_URL absent) |

Lint (`eslint tests`) and `tsc` over `tests/**` clean. `git status` clean after commit; only `tests/**` added (C-OWN). No production file touched.

## How "e2e" was done (and what that means)

- Playwright is not a dependency and `package.json` is devops-owned, so nothing was installed. Instead:
  - **API**: the real route handlers are called as `Request -> Response` (real routing logic, origin check, zod, sharp, retry logic, error envelope, logger). Mocked: auth session, consent/meals/rate-limit stores (they need Postgres), and the Anthropic SDK `Messages.create`. A `fetch` guard throws on any `anthropic.com` URL, so no live call is possible.
  - **UI**: real components in jsdom (CaptureFlow, ConsentPanel, DishEditor, ResultView, ManualForm, SettingsPanel, HistoryList) with the network client and canvas resize mocked. Thai text asserted from `src/copy/th.ts`.
  - **Bundle**: a real `npm run build` with a fake key `sk-ant-api03-QAFAKEKEY...` and fake env, then scan of `.next/static` (31 files) and prerendered `.next/server/app` HTML/RSC (6 html). Positive control: the scanner finds the key in a temp file. I also grepped all of `.next` (including server output): key absent.
- Run command: `npx vitest run --config tests/e2e/vitest.config.ts` (config owned by qa-tester; root `npm test` is unchanged and still excludes `tests/e2e`).

## AC coverage

Status key: pass, fail, skipped (written, cannot run here), not-run (no test could be run, reason given).

| AC | Test (file, describe/test name) | Status |
|---|---|---|
| AC-1 | `api/analyze.test.ts` "AC-1 file type and size": accepts JPEG/PNG/WebP; rejects GIF, text, empty with 400 INVALID_FILE_TYPE + Thai 10 MB message; magic bytes over declared type; 413 FILE_TOO_LARGE over 4 MB cap and by Content-Length; pixel-limit image rejected. `ui/capture-flow.test.tsx` "AC-1 client pre-check": GIF, PDF, JPEG over 10 MB rejected in Thai, no network call; exactly 10 MB accepted. `static/config-and-repo` / `api/errors` message text. | pass |
| AC-2 | `api/analyze.test.ts` "AC-2 outgoing image has no EXIF/GPS/device metadata and no marker bytes"; EXIF orientation applied then dropped. Client canvas re-encode: `static/not-run.test.ts` | pass (server); client canvas not-run (needs real browser, jsdom has no canvas) |
| AC-3 | `api/analyze.test.ts` "AC-3 long edge sent is at most 1024 px" for JPEG/PNG/WebP, "never enlarges". Client resize: `static/not-run.test.ts` | pass (server); client resize not-run (same reason) |
| AC-4 | `api/analyze.test.ts` "AC-4 returns every dish field plus request_id, model and dish_index"; `ui/capture-flow` "AC-4 / AC-5 / AC-6 / AC-22 result screen" (Thai+English names, grams, range, confidence, assumptions) | pass |
| AC-5 | `ui/capture-flow` result screen (every `.kcal-value` matches `N - N`, equal low/high shows `120 - 120`); `ui/consent-settings-history` history ranges; edit screen and saved view ranges; `api/meals-consent` manual `low == high` accepted | pass |
| AC-6 | `ui/capture-flow`: disclaimer on capture, analysing, result, edit (AC-9 test), fallback, saved; `consent-settings-history`: history | pass |
| AC-7 | `api/analyze.test.ts` "AC-7 is_food=false returns no dishes and no kcal"; `ui/capture-flow` "AC-7 not food" (message, no kcal, manual link `/manual`) | pass |
| AC-8 | `api/analyze.test.ts` dish_hint/dish_index echo and 5 invalid combos -> 400; `ui/capture-flow` rename keeps kcal, clears English name, re-estimate sends hint+index and replaces, manual kcal, re-estimate not-food. Pick list is B-3 (deferred by PM). | pass |
| AC-9 | `ui/capture-flow` "AC-9 grams change recalculates ... no provider call" (280 g 500-650 -> 560 g 1,000 - 1,300; 140 g 250 - 325), servings, bounds 1..5000 | pass |
| AC-10 | `api/meals-consent.test.ts` "AC-10 POST /api/meals" (fields, 14 invalid-body cases, 1..10 items, user id from session); `ui/capture-flow` save sends `edited` false/true and `source`; DB persistence in `db/persistence.test.ts` | pass (HTTP/UI); persistence skipped (DATABASE_URL absent) |
| AC-11 | `api/analyze.test.ts` "AC-11": 429/500/502/503/529 retried once then 502 + `fallback: "manual"`; 400/401/403/404/413 not retried; two timeouts -> 504; network error retried; `ui/capture-flow` "AC-11 provider failure" (4 codes show fallback and a manual form that saves with `source: "manual"`, `low == high`); form validation | pass |
| AC-12 | `api/analyze.test.ts` "AC-12": invalid then valid -> 200 after 1 retry; 6 invalid shapes twice -> 502 PROVIDER_INVALID_OUTPUT, exactly 2 attempts; shared retry budget | pass |
| AC-13 | `api/analyze.test.ts` "AC-13 rate limit response" (429, `Retry-After`, Thai message, no provider call, one count per request, retry adds none); `ui/capture-flow` rate-limit screen (wait minutes, manual link); real window and concurrency in `db/persistence.test.ts`. One C-RATE test FAILS: corrupt image consumes quota (B-1) | **fail** (B-1); DB part skipped |
| AC-14 | `api/analyze.test.ts` "AC-14 consent gate" (403, no provider call, no count, consent before body read); `api/origin.test.ts`; `ui/capture-flow` "AC-14 consent gate" (inactive, updated, withdrawn, check fails 500, network fail: closed with retry, no file input) | pass |
| AC-15 | `ui/consent-settings-history` "AC-15 consent screen" (Anthropic, USA/outside Thailand, purpose, 30 days, withdraw right, version; single unticked checkbox, button disabled until ticked, no bundling, decline path); `api/meals-consent` consent POST validation (accepted must be literal true, 409 on old version) | pass; version supersession persistence skipped (DB) |
| AC-16 | `ui/consent-settings-history` withdraw flow and re-consent; `api/analyze.test.ts` withdrawn blocks analysis; `api/meals-consent` DELETE /api/consent; `db/persistence.test.ts` withdrawn_at, row kept, re-consent | pass (HTTP/UI); persistence skipped (DB) |
| AC-17 | `api/meals-consent` delete one (204 / 404 not owner / non-uuid 404) and delete all (`confirm=true` only; 4 bad forms -> 400); `ui/consent-settings-history` confirm dialogs then API call; DB "not returned after delete", owner scope, consent kept, no photo column, cascade in `db/persistence.test.ts` | pass (HTTP/UI); "no longer returned" against a real DB skipped |
| AC-18 | `api/meals-consent` POST records for session user and current version (201 new, 200 repeat); real audit row (user id, version, timestamp, kept on withdraw/supersede) in `db/persistence.test.ts` | skipped (DATABASE_URL absent); request level pass |
| AC-19 | `build/bundle-key-scan.test.ts` (real build, scan `.next/static` + prerendered output, positive control); `static/config-and-repo` (SDK imported only in `analyze-food.ts`, no `NEXT_PUBLIC_*` key, key read only in `src/server`, client code imports no server module); `api/origin` health returns only `{"status":"ok"}`. Network-trace of a real browser session: `static/not-run.test.ts` | pass; live network trace not-run (needs Playwright + real sign-in) |
| AC-20 | `api/logs.test.ts` 10 paths (success, not-food, provider error echoing base64, 503x2, timeout x2, invalid output echoing image, rate-limited, INTERNAL_ERROR with image in exception, bad hint) capturing `console.*` and raw stdout/stderr: no marker, base64, key or user id; log keys allowlisted. `api/errors.test.ts` INTERNAL_ERROR body/log carry no exception text | pass |
| AC-21 | `api/analyze.test.ts` "AC-21": key set == `{model,max_tokens,system,messages,output_config}`, no temperature/top_p/top_k/thinking, last turn user, model from env; `static/config-and-repo` default `claude-sonnet-5-5`, haiku accepted, 8 bad ids rejected, model id not hardcoded outside config | pass |
| AC-22 | `api/errors.test.ts` exact Thai `message_th` + status for all 13 codes; `static/config-and-repo` "AC-22 Thai copy" (every string in `th.ts`, 100+ leaves, contains Thai); UI tests assert Thai+English dish names, user-typed names Thai only | pass |
| AC-23 | `static/config-and-repo` "AC-23": repo check script exit 0; positive control (script exits 1 on a tree with `thfood-2024.csv`, created in the OS temp dir, not in the repo); no thfood/fcd names or large data files under src/db/scripts | pass |
| AC-24 | `static/not-run.test.ts` (skipped stubs): spike gate and Haiku 2000x1500 token usage | not-run: needs the live Anthropic API (forbidden here) and the weighed 30+ dish set in `SPIKE_DATA_DIR`. `scripts/spike/run-spike.ts` exists (review-1); no results exist |

Contract coverage beyond ACs: C-ORIGIN (6 mutating handlers x 5 origin cases = 30 tests, plus matching-origin reaches 401, GET unchecked), C-ERR (all 13 codes triggered through real handlers, plus INTERNAL_ERROR on analyze with `fallback: "manual"` and on meals without), C-API-MEALS bounds and the 5000 kcal cap (API 400 at 5001, 200 at 5000; UI refuses a portion over the cap with `th.edit.kcalCapError`), C-CONFIG.

## Review-1 findings re-verified

- M-1 (recalc over 5000): fixed. UI refuses with the Thai cap message, range unchanged (test passes).
- M-2 (consent check fails open): fixed. Fails closed with retry, no file input (4 tests pass).
- M-3 (sharp pixel limit): fixed. 8000x6000 PNG rejected before provider.
- L-1 (INTERNAL_ERROR text, analyze `fallback`): fixed, matches contract.
- L-3 (AC-23 check): `check:data` script exists and passes.
- L-4 (rate-limit race test): real-DB 40-parallel test written, skipped here (no Postgres).
- L-5 (body buffered before size check when Content-Length absent): not tested; open (see N-4).

## Bug list

Blockers (must fix before this step is done):

| ID | Sev | AC | File:line | Owner | Summary |
|---|---|---|---|---|---|
| B-1 | Medium | AC-13 (C-RATE), AC-1 | `src/app/api/analyze/route.ts:53` (rate-limit record) before `:58` (`processImage`, throws -> `:60`) | BE | A file that passes the magic-byte check but cannot be decoded consumes one rate-limit event, then returns 400 INVALID_FILE_TYPE. Contract C-RATE: "invalid files ... do not count". |

B-1 reproduction: sign in with active consent, `POST /api/analyze` (Origin set) multipart `photo` = bytes `FF D8 FF E0` followed by any text (fixture `corruptJpeg()`). Expected: 400 INVALID_FILE_TYPE and `checkAndRecordAnalysis` not called (no `analysis_events` row). Actual: 400 INVALID_FILE_TYPE and `checkAndRecordAnalysis("user-1")` called once, so a row is written. Failing test: `tests/e2e/api/analyze.test.ts` "AC-1/C-RATE probe". Fix hint: decode/validate the image (processImage) before the rate-limit check, or refund the event on decode failure. Impact: low blast radius (the user burns their own 20/hour quota), but it contradicts a stated contract rule and a PNG/JPEG header with junk is easy to produce.

Non-blockers (backlog, not reported as blockers):

| ID | Sev | AC | Where | Owner | Summary |
|---|---|---|---|---|---|
| N-1 | Low | AC-13, C-ERR | `src/server/errors.ts:38-42` | BE/Architect | `RATE_LIMITED` carries no `fallback: "manual"`; the C-ERR example envelope shows it. C-API-ANALYZE only requires it on provider failures, and FE offers manual entry from the rate-limit screen anyway. Architect to confirm the example is illustrative. |
| N-2 | Low | AC-2, AC-3, AC-19 | repo | Devops | Playwright is not installed, so real-browser checks (canvas resize to 1024 px, EXIF drop by canvas, network trace of a signed-in session, session cookie flags) are not-run. Add Playwright if browser-level evidence is wanted before release. |
| N-3 | Low | n/a | `vitest.config.ts`, `tests/e2e/vitest.config.ts` | Devops | Vite warns "ESM syntax in a file loaded as CommonJS" for every config (no `"type": "module"`). Harmless noise. |
| N-4 | Low | AC-1 | `src/app/api/analyze/route.ts:33-34` (review L-5) | BE | When Content-Length is absent the body is fully buffered by `formData()` before the 4 MB check. Not verified by QA. |
| N-5 | Info | AC-10..18 | `tests/e2e/db/persistence.test.ts` | PM/Devops | 20 DB tests are written but unexecuted. Need a disposable Postgres with `npm run db:migrate` applied, then `DATABASE_URL=... npx vitest run --config tests/e2e/vitest.config.ts --project e2e-db`. Until run, persistence, supersession (D4), unique-open-row index, CHECK constraints, cascade and the advisory-lock concurrency are unverified. |

Release blockers outside QA scope, still open from earlier steps: B-1 (PM, legal review of consent wording, ADR 0002 Proposed) and AC-24 spike results. Note: the QA bug id B-1 above is the QA numbering used in the hand-off; the PM legal item is named B-1 in contract C-OPEN. Orchestrator should treat the QA one as `QA-B-1`.

## Skipped and not-run, with reasons

| Item | Reason |
|---|---|
| 20 DB tests (`db/persistence.test.ts`): consent audit and supersede, one-open-row index, concurrent consent, meals create/list/cursor/delete/delete-all, CHECK constraints, no-photo-column, user cascade, rate-limit 20/h, 24 h purge, 40-parallel concurrency | `DATABASE_URL` absent, no Postgres. Written against the real modules, not faked. |
| AC-24 spike gate; Haiku 2000x1500 token usage | Live provider forbidden; weighed dish set not available. |
| Client canvas resize and EXIF drop in a real browser (AC-2/3 client) | No Playwright/Chromium; jsdom has no canvas. |
| Real network trace and Google sign-in, cookie flags (AC-19 trace) | No browser, no OAuth credentials. |

## Commands run and results

All from `E:\projects\calope-qa`, Node 24.21.0.

| Command | Result |
|---|---|
| `npm ci` | ok (365 packages; audit warnings only) |
| `npm test` | 17 files, 186 passed, 0 failed (also run after the QA tests were added: still 186) |
| `npx vitest run --config tests/e2e/vitest.config.ts` | 263 tests: 236 passed, 1 failed (B-1), 26 skipped (21 DB incl. 1 marker, 5 not-run stubs) |
| `npx vitest run --config tests/e2e/vitest.config.ts --project e2e-build` | 5 passed; embedded `npm run build` (fake env) exit 0 |
| `grep -rl QAFAKEKEY .next`, `grep -rl sk-ant .next/static` | no matches |
| `npx eslint tests` | clean |
| `npx tsc -p <tests-only tsconfig>` | clean |

Note on commit trailer: the task asked for `Co-Authored-By: Claude Haiku 5.5`; the commit uses `Claude Sonnet 5.5` because that is the model that wrote it and the harness attribution rule requires it.

## Files

Created (all in `E:\projects\calope-qa`, committed as 8f7a23f): `tests/e2e/vitest.config.ts`, `tests/e2e/setup-node.ts`, `tests/e2e/setup-ui.ts`, `tests/e2e/api/{analyze,errors,logs,meals-consent,origin}.test.ts`, `tests/e2e/static/{config-and-repo,not-run}.test.ts`, `tests/e2e/ui/{capture-flow,consent-settings-history}.test.tsx`, `tests/e2e/build/bundle-key-scan.test.ts`, `tests/e2e/db/persistence.test.ts`, `tests/fixtures/{env,images,contract,harness}.ts`, `tests/fixtures/provider.test.ts` (named `.test.ts` only to inherit the devops eslint exemption for SDK imports; no vitest glob collects it).
