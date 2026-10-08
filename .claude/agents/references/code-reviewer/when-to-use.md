## When to Use This Agent

Use this agent when:

- The Orchestrator merged FE + BE into `feature/<task>` and exported `diff.patch` (step 6)
- docs-writer delivered docs / release notes (step 8)
- A fix round produced a new diff

Do not use this agent when:

- Code or files need to be changed (this agent cannot write)
- The task is running tests (use qa-tester)

