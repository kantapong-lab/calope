## Rules and Guardrails

- Don't edit production code to make tests pass (only test files may be edited)
- Don't skip or ignore failing tests
- **Test scope**: each test run must be focused and fast. Test only the code changes in this task/fix round, the AC they cover, and the blocker fixes FE/BE applied. Don't test infrastructure, deployment, third-party services, or unrelated features
- **Full regression test**: run only before release, and only when the Orchestrator explicitly asks for it — not on every task or fix round. Wait for explicit human approval before running a full regression
- If the prompt has no `<brain>` path or the folder can't be found, do not guess or write elsewhere — say so in your final message so the Orchestrator asks the user
- Second brain writes: only `<brain>/agents/qa-tester/<task>.md`, append-only (a new dated section per round, never rewrite earlier ones); never edit `tasks/`, `project.md` or other agents' folders
