# Checkpoint: food-photo-calories

Updated: setup · round 0

## Goal
Verbatim request (Thai):
ระบบบริหารจัดการ การออกกำลังกาย อาหารโภชนาการ การจัดตารางออกกำลังกาย แนะนำการออกกำลังกายจากเป้าหมายของผู้ใช้ เทรนเนอร์ส่วนตัว คำนวณแคลอรี่จากรูปถ่ายอาหาร

Scope chosen by user (AskUserQuestion): first slice = **คำนวณแคลอรี่จากรูปถ่ายอาหาร** (calculate calories from a food photo). Other features are out of scope for this task.

## Run profile
Full run, nothing skipped. Reason: no existing stack or pattern in repo (empty except `.claude/`); UI + BE + user-facing; docs-writer runs.

## Status
Step: 1 researcher done (hand-off still not-ready; Claude facts verified via claude-api skill by orchestrator). Gates 3c/3d: not yet reached.

## Decisions in force
Working assumption, pending user confirm: Claude vision via Anthropic direct API. Primary claude-sonnet-5-5 ($2/$10 per MTok), spike fallback claude-haiku-5-5 ($0.10/$0.50). API key server-side only.
Note: the claude-api skill defaults to claude-opus-5-5 ($4/$20) for code unless the user names a model. Choosing Sonnet is a cost call and needs user sign-off.
Carried to 3d smoke build: Haiku 5.5 image tier; Sonnet 5.5 Bedrock APAC card.
Vault: H:\second-brain (in `.claude/settings.local.json`).

## Loop counters
none

## Open blockers
- Legal review of ADR 0002 (USA transfer, 30-day provider retention, consent wording) pending

## User answers (step 2)
- Provider: Anthropic direct API + claude-sonnet-5-5 (ADR 0001 Accepted)
- Deploy: Web app on Vercel (MVP)
- AC-24 accuracy thresholds: use the product-manager proposal

## Decisions in force
- ADR 0004 Accepted: Postgres (Drizzle) meal log + Google sign-in (Auth.js), sharp for resize, rate limit 20/user/hour
- Vercel body cap ~4.5 MB: client resizes to <=4 MB; AC-1 10 MB check runs on the client
- ADR 0001 Accepted: Anthropic direct, claude-sonnet-5-5 primary, claude-haiku-5-5 fallback only if within 5 points on AC-24
- ADR 0003 Accepted: editable kcal range for MVP
- ADR 0002 Proposed: consent and storage, needs legal review

## Step 3 state
- designer r2: done (hand-off validates); canvas URL https://claude.ai/artifact/Fp7p4xvK1Fpv5ga6kdYp6X created but empty. Designer converting files to Design v3 format; orchestrator publishes after conversion
- architect r1: done; Q1-Q6 sent back for resolution in r2
- devops mode 1: done; mode 2 (3d smoke) not yet run
- Gate 3c: passed with one waiver. Canvas published (private, owner-only until shared). Contrast measured (AA pass). AC-19/20/21/23/24 have no artboard (non-UI: logging, config, spike, rate-limit backend), so the artboard rule is waived for them. Designer round 2 done.
- Contract round 2 done (architect); Q1-Q6 answered; B-1 legal (ADR 0002), B-3 dish list (PM) open, non-blocking
- Gate 3d round 1: FAIL (Node 22.14 vs pin 24.21.0). Round 2 handoff repaired (status blocked, B-4 Node, B-5 key)
- User approved Node 24.21.0 install. Installed via official MSI (SHA256 checked). Rerun checks 1-4 by orchestrator on Node 24.21.0: PASS (clean npm ci, build, /api/health 200 with node v24.21.0)
- Live Anthropic call still blocked: no ANTHROPIC_API_KEY (B-5, PM). Devops round 3 handoff: Pass, validates. GATE 3d PASSED (live call is a named open item for the Human gate)
- Step 4 prep: scaffold committed on ops/food-photo-calories. Branches fe/ and be/ created from ops. Devops adding step-4 dependencies on ops first; FE and BE start after that commit
- Branches: feature/food-photo-calories (planning commit 65d00ee), ops/food-photo-calories (scaffold d0c93d0, deps 8ed875c), fe/food-photo-calories, be/food-photo-calories (both ff to 8ed875c)
- Step 4 started: frontend-dev in worktree E:\projects\calope-fe, backend-dev in E:\projects\calope-be (separate worktrees; same repo)
- Open for devops: vitest.config (jsdom) not added; Co-Authored-By on commit 8ed875c is Sonnet 5.5 (agent setup), user instruction was Haiku 5.5. Not amended
- Commit trailers for our work: Haiku 5.5 per user instruction
- Contract Q7 (architect r3): on rename without re-estimate, dish_name_en = null (never a stale English name). FE asked to change 7a2c310 accordingly. Open PM item B-4: user-typed names show Thai only (non-blocking)
- Frontend hand-off validated (not-ready: devops blockers B-1 vitest/jsdom, B-2 eslint)
- Backend round 1 (be 53d8dfe): hand-off validated, not-ready. Needs FE consent.ts (merge fixes tsc), DB path and live call untested. Contract deltas sent to architect for round 4 (INTERNAL_ERROR, 0000_init, consent-version shim, withdrawn_at supersede, strict Origin, health {status:ok}). Devops asked for tsx, db scripts, ESLint exemption, smoke update
- FE Q7 fix done: fe c22439b (name_en null on rename). FE hand-off round 1 still not-ready only on devops items
- Devops r5 done: ops b008a59 (vitest projects node/jsdom, eslint 9 flat, lint and build pass). fe and be did NOT get it (ff refused, branches diverged). Still missing on ops: tsx and db scripts, asked devops r6
- Next: devops r6, BE merge with ops (package.json), architect r4. Then step 5 merge fe+be into feature/food-photo-calories, then step 6 review

## History
- step 1 r1: researcher not-ready; re-verify requested; orchestrator verified core facts with claude-api skill; remaining re-verify deferred to 3d
- setup: git init, base commit c885f6d, vault task note created

## Step 4 progress (orchestrator, latest)
- Devops r6 done (ops 9029d56: tsx, db scripts, spike, vitest, eslint). fe and be merged ops cleanly
- feature/food-photo-calories = fe + be merged. On Node 24.21.0: build PASS; npm test 4 failing (ConsentPanel x3, PortionStepper x1); lint 3 errors + 1 warning (FE files)
- Architect round 4 done: D4 changed (superseded_at column, not withdrawn_at), D3 shim removed after FE consent.ts merge (B-5, BE)
- FE asked to fix tests and lint; BE asked for superseded_at and to drop the shim. Both then re-merge
- Note: sent stray "placeholder" messages to FE twice; FE told to ignore
- Step 4 done: fe r2 (df28a4d) and be r2 (3adc9fa) merged into feature/food-photo-calories. Combined on Node 24.21.0: npm test 179/179, lint clean, build clean
- Step 5 done (merge). Step 6 started: code-reviewer on .team/food-photo-calories/diff.patch (c885f6d..HEAD, excluding .team, docs, lockfile)
- Still open: PM legal (ADR 0002), B-4 (user-typed names), live Anthropic key, Postgres connection for migrations and SQL path
- Step 6 review 1: APPROVE (0 critical, 0 high, 3 medium, 5 low). Saved review-1.md. Fix round sent before QA: FE (M-1 kcal cap, M-2 fail-closed consent), BE (M-3 sharp limit, L-1 error text and fallback, L-4 lock test), devops (L-2 env example, L-3 data-check wiring)
- Next: fixes land on fe, be, ops; re-merge feature; then step 7 (qa-tester and docs-writer) and step 8 re-review
- Review 1 fixes: be 9a34b2c (M-3 sharp limit, L-1 text and fallback, L-4 order test) merged; fe 40afba3 (M-1 kcal cap, M-2 fail-closed consent, L-1 FE) merged into feature (c98b6ad)
- Waiting: devops r7 (env example, data-check wiring) on ops. Then merge ops into feature, run full check, then code review 2 on fix diff (step 6 round 2), then step 7
- Fix round merged: ops 5c6b0e7 (L-2 env, L-3 check:data and CI) and be 2f16e70 (B-8 docs in AC-23 check) into feature (merge 8128f46 and after). Feature on Node 24.21.0: npm test 186/186, lint clean, check:data ok, build ok
- Step 6 round 2 (code review on fix delta, diff-review2.patch) running. After approve: step 7 QA and docs
- Step 6 round 2: APPROVE (review-2 by code-reviewer; M-1..M-3, L-1..L-4 resolved; L-5 accepted Low). Feature = approved diff
- Step 7 started: qa-tester on qa/food-photo-calories (worktree E:\projects\calope-qa), docs-writer on docs/food-photo-calories (worktree E:\projects\calope-docs)
- Step 7 docs done: docs ce357db (committed by orchestrator; docs-writer had no shell). Hand-off 7-docs-writer-r1 validates (status not-ready; QA-dependent items pending). Docs found contract vs code gaps (rate-limit magic-byte count, 413 vs 400 order, non-UUID 404, FILE_TOO_LARGE 10 MB text vs 4 MB cap); sent to architect for round-5 ruling
- QA running (qa/food-photo-calories, qa-report.md target)
- Architect r5 (docs rulings, C-DOCS-RULINGS): R1 BE reorders decode before rate limit; R2 contract order size, magic, decode; R3 404 NOT_FOUND confirmed; R4 FILE_TOO_LARGE text states 4 MB post-resize limit. BE fix round sent (B-6). Architect B-5 may already be covered by superseded_at (3adc9fa); BE asked to confirm
- QA still running on qa/food-photo-calories; docs ce357db on docs/food-photo-calories not yet merged into feature
- BE round 5 (ca99338): decode before rate limit, FILE_TOO_LARGE text, B-5 already covered. Merged into feature (e640b58). Feature on Node 24.21.0: tests 187/187, lint 0, check:data ok, build 0
- QA r1 (qa 8f7a23f): Fail on B-1 (rate limit consumed by corrupt JPEG). ALREADY FIXED on feature (decode at route.ts:55 before checkAndRecordAnalysis :60). QA tests merged into feature. Rerun on feature: unit 187/187; QA suite 235 pass, 2 fail (FILE_TOO_LARGE expectations stale vs R4 text), 26 skipped (DB, AC-24, browser, OAuth)
- QA round 2 asked: align FILE_TOO_LARGE expectations with R4; rerun; handoff 7-qa-tester-r2
- QA r2 (6fea768): PASS. Unit 187/187; QA suite 237 pass, 0 fail, 26 skipped (21 DB, 5 live/browser/OAuth/AC-24). Merged qa and docs (ce357db) into feature, head f8fbc66
- Step 8 round 1: REJECT (docs stale: FILE_TOO_LARGE text, known gaps 2-3 already fixed, test counts; tests OK). Docs-writer asked to fix on docs branch; orchestrator commits and re-merges. Then step 8 round 2
- Step 9 staging needs a Vercel project and deploy access from the user; step 10 Human gate
