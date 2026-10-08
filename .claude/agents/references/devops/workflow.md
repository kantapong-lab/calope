## Workflow

### Mode 1: Deployability
1. Survey which deploy targets already exist (staging/production, pipeline, registry); if there are **none**, say so plainly — never assume there are
2. Assess the stack proposed by the brief/architect: is it actually deployable, runtime + version, resources (CPU/RAM/GPU/disk), where large artifacts live (model weights, index, data), native or conflicting dependencies
3. Write `.team/<task>/deploy.md` (see Output Format)
4. If the proposed stack can't be deployed or must be torn out after MVP → tell the Orchestrator with alternatives (architect writes the ADR)

### Mode 2: Smoke build
1. On branch `ops/<task>`, create/edit only the infra files `contract.md` says devops owns — minimum: pin the runtime (e.g. `.python-version`/`.nvmrc` + lockfile + base image), Dockerfile, a one-command way to run, `.env.example` (no real secrets)
2. Build the image, then run **the full set of real dependencies in the same process** as production will (e.g. load the real model + real search library + real DB) with a small smoke script — not stubs
3. Check that every version in the environment matches `contract.md` (runtime, main dependencies); mismatch = fail
4. Fail → report with logs and cause (e.g. library conflict, version unavailable on the pinned runtime) — **FE/BE must not start** until it passes or architect changes the stack
5. Hand off to the Orchestrator to merge `ops/<task>` as the base of `fe/<task>` and `be/<task>`

#### Smoke scope: start minimal, grow with the product
Keep the smoke a thin, fast gate. Do not test business logic in it — that belongs to qa-tester and the FE/BE unit tests.

**Stage 1 — Minimal smoke (first weeks, before any feature is done).** Check only:
1. **Compile/build passes** (type-check/compile for the pinned runtime)
2. **Docker build passes** (image builds from the pinned base image and lockfile)
3. **App starts and health check returns HTTP 200** (container up, health endpoint reachable)

Do not check internal logic yet. The "real dependencies, no stubs" rule above still applies: the app must boot with the real DB/model/library it will use, even if no feature code calls them.

**Stage 2 — Grow the smoke as features land.** When FE/BE finish a core function (e.g. login, the main API endpoint) and the Orchestrator tells you it is done, add that function to the smoke as **one** happy-path check (e.g. log in with a seeded test user → token returned; main endpoint → 200 + expected shape). Rules:
- Add only functions the Orchestrator/contract names as core; one happy-path check each, no edge cases
- Keep checks in a smoke script devops owns (e.g. `smoke/`), calling the running app over HTTP — never import or edit FE/BE code
- Use seeded test data/accounts only, never real secrets or production data
- If a check is flaky or slow, report it to the Orchestrator rather than deleting it silently
- Keep the whole smoke fast (target: a few minutes); if it outgrows that, tell the Orchestrator
- Record in the brain note which stage the smoke is at and which checks it now includes

### Mode 3: Deploy
Before starting: check that the runtime/version to deploy matches `deploy.md` and `contract.md`

Staging:
1. Build + deploy with the project's pipeline/scripts; if there is no staging, deploy to the near-production environment per `deploy.md` — **never skip this step**
2. Run migrations, health check, smoke test
3. Fail → collect logs and report (don't fix code yourself)

Production:
1. Check that migrations are reversible and there is a rollback plan
2. Deploy as a canary (e.g. 10%) if the infra supports it
3. Health check + error rate compared to baseline
4. Pass → expand to 100%; fail → **roll back immediately** and report

### All modes
Record in `<brain>/agents/devops/<task>.md`: date, mode, pinned runtime, environment/commit, smoke/health check results, whether rolled back, decisions + reasons, cost/token usage, open issues. For new rounds, append as a new section
