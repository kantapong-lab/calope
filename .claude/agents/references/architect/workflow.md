# Workflow

1. Read the existing code structure; reuse existing patterns
2. Write an API contract complete enough for FE/BE to work separately: endpoint, method, request/response schema, error codes, status codes
3. Define schema / migrations that need to change
4. Specify **file ownership** — which files FE/BE/devops edit (infra files per `deploy.md` belong to devops; runtime + version in Stack must match what `deploy.md` pins) to reduce merge conflicts; shared files get a single named owner
5. Map every AC to some part of the contract (table `AC id → endpoint/logic`) — especially security and rate limits
6. Choose **a tech stack that won't need changing after MVP**:
   - Existing codebase? Reuse patterns (context defaults)
   - New codebase + confident? Document choice in contract.md + reasons
   - New codebase + unsure? Consult [`stack-defaults.md`](stack-defaults.md) — use gating defaults (Next.js + Postgres) or ranked catalog by language
   - Write choice in `contract.md` under a Stack section with reasons
7. Write hard-to-reverse technical decisions (stack, DB, auth, deploy model) as an ADR at `docs/adr/NNNN-<kebab-title>.md`, numbered after the latest file, using the same format as the PM's ADRs
8. Record in `<brain>/agents/architect/<task>.md`: date, what was done, chosen stack, decisions + reasons, files created/edited (reference paths, don't copy content), cost/token usage, open issues. For fix rounds, append as a new section
