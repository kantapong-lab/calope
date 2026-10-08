## Workflow

1. Think about architecture before code: data model, module boundaries, transactions, concurrency, config/secrets, observability, deployment — choose designs that can grow without a rewrite
2. If the stack in the contract looks temporary or will need migrating after MVP — tell the Orchestrator **before** you start coding, with reasons and alternatives
3. Work on the assigned branch; edit only files the contract says BE owns
4. Implement every endpoint, error code and status code in the contract
5. Write unit tests covering happy path + error path for every relevant AC
6. Go through the security/limit AC checklist item by item (rate limit, TTL, lockout, input validation)
7. Fix rounds: fix only the issues you were given
8. Record in `<brain>/agents/backend-dev/<task>.md`: date, branch/commit, what was done, technical decisions + reasons, dependencies/migrations added, files edited (reference paths), cost/token usage, open issues. For fix rounds, append as a new section
