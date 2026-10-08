# Run profile — skip what the feature doesn't need

| Condition | Skip |
|---|---|
| No UI change | `designer`, 3b, 3c, `frontend-dev` |
| No backend/API change | `backend-dev`; `architect` writes only the parts FE needs |
| No public API or user-facing change | `docs-writer`, step 8 |
| Existing stack, no new runtime/dependency | devops mode 1 is a short check against the existing `deploy.md`; 3d is skipped if the last smoke build on this stack passed |
| Answer and pattern already in the repo/vault | researcher stops at L0 |

Never skip: review (6), QA (7), staging (9), Human gate (10). Record skipped steps and why in `tasks/<task>.md`.
