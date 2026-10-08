# Deploy: food-photo-calories (devops, mode 1, round 1)

Date: 2026-10-08. Sources: ADR 0001 (Accepted), ADR 0002 (Proposed), brief.md, ac.md. Version currency checked live on 2026-10-08 (npm registry, nodejs.org dist index, endoflife.date, Vercel docs "Supported Node.js versions"), not from memory.

## Existing targets (survey)
None. Repo has only `.claude/` and `.team/`; no Dockerfile, CI, IaC, pipeline, Vercel project, or staging/production. Nothing is assumed to exist. Vercel account/team, plan tier (Hobby/Pro) and Git remote are unconfirmed (repo is not a git repo yet).

## Pinned runtime (architect must copy into contract.md Stack)
| Item | Pin | Evidence (2026-10-08) |
|---|---|---|
| Node.js | **24.x LTS "Krypton"**, local pin `24.21.0` (`.nvmrc`); Vercel pin `engines.node = "24.x"` in package.json | nodejs.org: 24.21.0 released 2026-09-07, LTS. endoflife.date: 24 EOL 2028-04-30. Vercel docs: 24.x is the default and supported; Vercel only honours the major (`24.x`), it deploys latest 24.x |
| Why not 22 | 22 EOL 2027-04-30, too close | endoflife.date |
| Why not 26 | Not LTS until 2026-10-28 (20 days out) | endoflife.date; revisit later by ADR |
| Next.js | **16.4.0** exact (App Router, route handlers for the server-side Anthropic call) | npm `latest` = 16.4.0 (released 2026-10-06); engines `node >=20.9.0` (compatible); endoflife.date: 16 active LTS. 15.5.27 is the backport line, not chosen |
| Anthropic SDK | `@anthropic-ai/sdk` 0.132.1 (npm latest today); architect/BE pin exact in lockfile | npm registry. Pre-1.0: minor bumps can break, pin exact |
| Package manager / lockfile | npm 11, `package-lock.json` committed (`npm ci` in builds). Architect may switch to pnpm; then update this row | Node 24.21.0 ships npm 11.19.0 |
| Base image | None. Vercel builds from source on its managed Node 24 runtime; no Dockerfile | Vercel platform |
| Model | `claude-sonnet-5-5` exact ID via `FOOD_VISION_MODEL`; spike candidate `claude-haiku-5-5`. Retirement not earlier than 2027-09-28 / 2027-10-07 (alert needed) | ADR 0001, brief |

Dev machine note: this Windows box currently has Node 22.14.0 (npm 11.4.2); it is below the pin. Use nvm-windows/fnm with `.nvmrc` before the smoke build, or the smoke runs on the wrong runtime (mismatch = fail).

## Target
Both environments on **Vercel** (user decision), same Next.js app, same region.
- **Staging** = Vercel Preview deployment, built from a staging branch (or a Vercel Custom Environment named `staging` if the plan is Pro). Own env var scope, own Anthropic key (separate key and spend limit from production), a stable alias URL (e.g. staging subdomain) for smoke/QA. Preview deployment protection ON (not public).
- **Production** = Vercel Production environment, promoted only after Human approval (mode 3 rule).
- **Function region**: `sin1` (Singapore) via `vercel.json`, closest to Thai users. The Anthropic API is called over the public internet from there; no data residency claim is made (photos go to USA processor per ADR 0001/0002).
- **Secrets**: `ANTHROPIC_API_KEY` set in Vercel Project Settings, scoped per environment, marked Sensitive. Never `NEXT_PUBLIC_*`. `FOOD_VISION_MODEL` set per environment (default `claude-sonnet-5-5`). Setting these is a persistent-config change outside the repo: devops will not do it without the Orchestrator telling the user (human must create the Vercel project and paste keys, or approve devops doing so in mode 3).
- **Rollback**: every deploy is an immutable deployment. Roll back with Vercel Instant Rollback (dashboard or `vercel rollback <deployment-url>`), which re-points the production domain to the previous production deployment without a rebuild (seconds). Caveats: (1) env var changes are not rolled back, so any change to `FOOD_VISION_MODEL`/key needs its own revert and redeploy (env vars apply to new deployments only); (2) any DB schema change must be backward compatible with the previous deployment, check before production; (3) on the Hobby plan Instant Rollback is limited to the previous deployment, Pro allows any. Model swap (Sonnet to Haiku) is a config change, not a code deploy: change `FOOD_VISION_MODEL`, redeploy, verify.
- **Production canary**: Vercel Rolling Releases (percentage rollout) is plan/feature dependent and unconfirmed here. If unavailable, deploy to staging, full smoke, then promote the same build to production (no rebuild) and watch health/error rate; roll back on failure.
- **Still missing for real production**: Vercel project + Git integration, custom domain/TLS, a persistent store for meal logs, consent records and rate-limit counters (Vercel functions have no persistent disk; DB choice is the architect's; Vercel Marketplace Postgres/Redis are candidates, unevaluated), spend limit on the Anthropic key, log/alert setup (error rate, 5xx, latency, Anthropic spend), model retirement alert (2027-09-28), legal answer on ADR 0002 (USA transfer). Auth/user identity is also undefined (AC-13/16/18 need a user id).

## Files devops owns (for the file ownership table in contract.md)
Created now (no secrets, no application code):
- `E:\projects\calope\.nvmrc` (24.21.0)
- `E:\projects\calope\vercel.json` (framework nextjs, regions sin1)
- `E:\projects\calope\.env.example` (names only: ANTHROPIC_API_KEY, FOOD_VISION_MODEL)

To be created in mode 2 (3d) if the contract assigns them:
- `smoke/` (HTTP-only smoke script, Stage 1: build + start + health 200), `.github/workflows/*` (CI, only if GitHub is chosen; none exists), `.gitignore` entries for `.env*` (except `.env.example`), `.vercel/`.

Not devops-owned, but must be coordinated with architect/BE: `package.json` (`engines.node: "24.x"`, exact `next` 16.4.0 and SDK pins, `build`/`start` scripts), `package-lock.json`, health endpoint route (e.g. `/api/health`, needed for the "health 200" check), route segment `maxDuration`.

## Risks (smoke build must prove out)
1. **Vercel request body limit ~4.5 MB** on functions (platform limit, re-check in smoke). AC-1 allows 10 MB uploads server-side; a larger upload gets a platform 413 before app code runs, so the Thai 10 MB message cannot come from the server. Client-side resize to 1024 px (AC-3, ~tens to hundreds of KB) keeps real traffic far below; contract must state client resizes before upload and that oversize is rejected client-side. Smoke: post a ~5 MB body, expect 413, and a ~300 KB body, expect 200.
2. **Function duration**: Anthropic call with retry (AC-11/12) vs p95 10 s (AC-24) and the plan's `maxDuration`. BE sets `maxDuration` on the route (suggest 60 s); smoke must confirm the plan allows it.
3. **Secret leakage to client** (AC-19): smoke greps the built `.next/static` output and a browser-facing response for the key prefix `sk-ant-` and for `ANTHROPIC_API_KEY` (checks the build, never prints a real key).
4. **No persistence on Vercel**: meal log, consent, rate limit need an external store; none chosen. Blocks AC-10/13/16/17/18 at runtime, not at build. Needs architect ADR before BE starts.
5. **Node version drift**: local Node 22.14.0 vs pin 24.x; Vercel ignores `.nvmrc`, so `engines.node` in package.json is the real deploy pin. Smoke must print `node -v` and `next -v` and compare to this file and contract.md.
6. **Real dependency rule**: Stage 1 smoke must boot with the real SDK import and a real (low-cost) Anthropic call path available; a stubbed client cannot be reported as pass.
7. **Model/tier facts moving**: see re-verify list below.
8. **Windows dev vs Linux build**: file-path casing and native deps (e.g. sharp for image resize/EXIF strip if BE chooses it) must build on Vercel Linux; prove in a real Vercel preview build, not only locally.
9. **Region/latency**: sin1 plus Anthropic USA endpoint adds round trip; measure in the spike (AC-24 p95).

## Smoke build plan (step 3d, run later; mode 2)
Branch `ops/food-photo-calories`. Stage 1 (minimal), run against a real Vercel Preview deployment where possible, plus local `next build`:
1. Runtime check: `node -v` is 24.x, `next -v` is 16.4.0, SDK version equals lockfile pin; mismatch = fail.
2. `npm ci` then `next build` passes (type-check included).
3. Start (`next start` locally, and the Preview URL on Vercel); `GET /api/health` returns 200 within 10 s.
4. Real-dependency boot: app imports the real `@anthropic-ai/sdk` and reads `ANTHROPIC_API_KEY` and `FOOD_VISION_MODEL` from env (key supplied by human in env, never in files).
5. Secret scan of build output (risk 3) and `.env.example` has names only.
6. Platform limit probe (risk 1) and `maxDuration` acceptance (risk 2).
Stage 2 (later, only after Orchestrator confirms core function done): one happy-path check for `POST /api/analyze` with a seeded 2000x1500 test image, expect 200 and schema-valid JSON. No edge cases.
Cost control: the smoke makes at most 2 to 4 real model calls total (about $0.01 to $0.03 on Sonnet 5.5, my estimate from the brief); needs a real key from the human and a spend cap.

### Open re-verify items for 3d (carried forward, not resolved here)
1. **Haiku 5.5 image tier** (brief item 3b): send the same 2000x1500 image to `claude-haiku-5-5`, read `usage.input_tokens`, compare with Sonnet 5.5 and with the formula ceil(w/28) x ceil(h/28), to learn whether it is the high-res tier (cap 2576 px long edge) or the old tier.
2. **Sonnet 5.5 image token cost on a 2000x1500 test image**: measure `usage.input_tokens` (formula gives 72 x 54 = 3,888 visual tokens, within the 4,784 cap, my arithmetic; confirm) and recompute per-request cost against the $0.01 gate (AC-24). Also record the token count at the production 1024 px long edge.
3. **Bedrock is not used**: no Bedrock config, IAM or AWS infra is prepared. Sonnet 5.5 Bedrock APAC availability (brief item 5) is out of scope unless ADR 0002 legal review rejects the USA transfer, which would supersede ADR 0001 and reopen this file (structured outputs unavailable on Bedrock for Sonnet 5.5).
4. Re-check at 3d: Vercel body limit and `maxDuration` limits for the actual plan, Anthropic model IDs still current, and any newer Next 16.x patch (pin may move, record it).
