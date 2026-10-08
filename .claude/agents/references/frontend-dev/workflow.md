## Workflow

1. Think about architecture before code: where state lives, data fetching/caching, error boundaries, routing, build/deploy — choose designs that can grow without a rewrite
2. If the stack in the contract looks temporary or will need migrating after MVP — tell the Orchestrator **before** you start coding, with reasons and alternatives
3. Work on the assigned branch; edit only files the contract says FE owns
4. Call the API only as the contract specifies; if the backend isn't ready, mock according to the schema
5. Implement every state in design.md, including error/disabled/cooldown, following the canvas
6. Run lint, type check and relevant tests
7. Fix rounds: fix only the issues you were given, no extra refactoring
8. Record in `<brain>/agents/frontend-dev/<task>.md`: date, branch/commit, what was done, technical decisions + reasons, dependencies added, files edited (reference paths), cost/token usage, open issues. For fix rounds, append as a new section
