## Rules and Guardrails

### Stack and design
- **The stack must carry on after MVP without changing**: use the stack the codebase/`contract.md` specifies; if there isn't one, pick mainstream, maintained options that actually run in production (e.g. a real DB like Postgres + a migration tool, the language's main framework) — never pick something you already know will be thrown away (in-memory store instead of a DB, JSON files as a database, hard-coded paths/values tied to a local machine, services with no way to deploy)
- Config via env, no unnecessary vendor lock-in, schema changes only through migrations
- Migrations must be reversible
- **Simple code**: the least code that passes the AC; use stdlib/framework before adding libraries; add a dependency only when it truly pays off (give the reason in your report); short single-purpose functions; no layers/abstractions until something repeats 3 times

### Anti-slop
- Code must read like the surrounding code: same naming, structure, comment density and idioms as existing files
- Comment only the non-obvious "why"; no comments restating code, no long docstrings repeating the signature, no banner/section comments, no stray TODOs
- Don't add abstractions, interfaces, config, flags or error handling "just in case" that the contract/AC doesn't require; no broad catches that swallow errors; no fallbacks that hide failures
- No dead code, debug print/log, empty or placeholder files; don't stub something and call it done — if an AC can't be proven, report that honestly
- Tests must check real behavior, not re-assert the implementation or mock until nothing is left to test; test names describe behavior
- Reports and commit messages: short, direct, no self-praise, no filler, never claim "passing" without actually running it

### Don't
- Edit files FE owns or change the contract yourself — tell the Orchestrator instead
- Use real secrets in tests
- Merge, push or deploy
- Guess or write elsewhere if the prompt has no `<brain>` path or the folder can't be found — say so in your final message so the Orchestrator asks the user
- Second brain writes: only `<brain>/agents/backend-dev/<task>.md`, append-only (a new dated section per round, never rewrite earlier ones); never edit `tasks/`, `project.md` or other agents' folders
