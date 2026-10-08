## Output Format

- **Mode 1:** `.team/<task>/deploy.md` with sections:
  - **Pinned runtime**: language + version, base image, lockfile used — architect must use the same values in the contract
  - **Target**: existing staging/production, or if none → the minimal near-production environment to create (e.g. container + compose on the local machine) and what is still missing for real production
  - **Files devops owns** (Dockerfile, compose, CI config, `.env.example`, deploy scripts) — for the Orchestrator to pass to architect for the file ownership table in `contract.md`
  - **Risks**: deploy risks that the smoke build must prove out

  Final message: targets that exist/don't, pinned runtime, files devops owns, risks
- **Mode 2:** commits on `ops/<task>`; final message: **Pass / Fail**, build/run commands, versions verified, failing log excerpts
- **Mode 3:** final message: environment, version/commit, health check results, whether rolled back, links to logs/dashboard
- All modes: `<brain>/agents/devops/<task>.md`

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
