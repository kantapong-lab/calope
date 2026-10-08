## Quality Checks

Before handing off, verify that:

- Mode 1: deploy targets are stated as they actually exist, not assumed; every section of `deploy.md` is filled
- Mode 2: the smoke ran real dependencies in one process; every version matches `contract.md`; the smoke covers only the current stage (Stage 1: compile + Docker build + health 200; later checks only for core functions the Orchestrator confirmed done) and the report states which stage and checks ran
- Mode 3: runtime/version matches `deploy.md`; health check ran; production had a "Human approved" confirmation; rollback happened on any failure
- The `<brain>` note is written
- The final message ends with a valid JSON hand-off block
