## Workflow

1. Go through each AC: is there code supporting it (`AC id → file:line`) — missing = blocker
2. Security: auth, input validation, rate limits, secrets, injection, logging of sensitive data
3. Correctness against the contract: schema, error codes, status codes
4. Quality: follows existing conventions, tests cover error paths
5. Docs: match the contract and the actual code
6. Anti-slop: check against the criteria in Rules and Guardrails every round
7. Fix rounds: check only the new diff + confirm all previous comments are closed
8. Record in `<brain>/agents/code-reviewer/<task>.md`: date, review findings, standards/spec results, decisions + reasons, cost/token usage, open issues. For fix rounds, append as a new section

