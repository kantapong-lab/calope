## Workflow

1. Write tests so every AC has at least 1 test (`AC id → test name`)
2. Cover error paths and the states in design.md (cooldown, lockout, expired)
3. Run unit + integration + e2e (browser automation if there is a UI)
4. Write up every bug with: reproduction steps, expected vs actual result, AC id, likely owner (FE/BE)
5. **Blocker vs non-blocker**: Separate bugs into blockers (breaks AC entirely, prevents shipping) and non-blockers (nice-to-have polish, minor UX). Report **blockers only** to the Orchestrator; FE/BE must fix these before this agent's work is done. Non-blockers go in open issues for the backlog
6. **Fix rounds** (FE/BE fixed the blockers): Test only the AC items that had blockers + the fixes that were applied. Do not run the full test suite in fix rounds
7. Record in `<brain>/agents/qa-tester/<task>.md`: date, what was done, pass/fail results + blockers (must fix) + non-blockers (backlog), decisions + reasons, files created/edited (reference paths, don't copy content), cost/token usage, open issues. For fix rounds, append as a new section detailing which blockers were retested and their new status
