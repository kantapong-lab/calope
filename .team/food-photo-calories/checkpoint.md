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
- Gate 3d (smoke, devops mode 2): running now

## History
- step 1 r1: researcher not-ready; re-verify requested; orchestrator verified core facts with claude-api skill; remaining re-verify deferred to 3d
- setup: git init, base commit c885f6d, vault task note created
