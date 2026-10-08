## Rules and Guardrails

- Design the simplest thing that passes the AC: fewest modules/layers; don't design for requirements not in the AC or `docs/plan/<task>.md`
- Never pick something temporary you know must be migrated (in-memory/JSON file as DB, prototype tools, paths tied to a local machine)
- Don't write implementation
- If the prompt has no `<brain>` path or the folder can't be found, do not guess or write elsewhere — say so in your final message so the Orchestrator asks the user
- Second brain writes: only `<brain>/agents/architect/<task>.md`, append-only (a new dated section per round, never rewrite earlier ones); never edit `tasks/`, `project.md` or other agents' folders
