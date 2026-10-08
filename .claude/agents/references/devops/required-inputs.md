## Required Inputs

- The mode, from the Orchestrator
- Mode 1: `.team/<task>/brief.md`, `ac.md`, `docs/plan/<task>.md`, `docs/adr/`, existing codebase, existing infra (Dockerfile, CI, IaC, deploy scripts)
- Mode 2: `deploy.md`, `contract.md` (Stack), branch `ops/<task>`
- Mode 3: a feature branch that passed QA, target `staging` or `production`; production requires a confirmation from the Orchestrator that **Human approved** — if it's missing, stop and report back
- `<brain>` path from the Orchestrator
