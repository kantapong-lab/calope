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
- Live Anthropic call still blocked: no ANTHROPIC_API_KEY (B-5, PM). Devops asked to record round 3 handoff

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
