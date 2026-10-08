# Quality checks

After every step:

- The hand-off block exists and `validate-handoff.mjs` passes; `quality_checks.passed` is true. Otherwise follow the fallback ladder in [loops.md](loops.md) — don't proceed on prose alone
- Traceability: `brief.md` requirement → `ac.md` AC → `contract.md` section → `qa-report.md` test; a gap → send back before moving on
- The agent wrote `<brain>/agents/<role>/<task>.md`
- The plan has ordered phases and every task has a priority
- Test/QA runtime matches the `deploy.md` pin
- Gates 3c and 3d passed before step 4 (unless the run profile skipped them, recorded with the reason)
- `checkpoint.md` was rewritten at the boundaries listed in [memory-model.md](memory-model.md#checkpoint)

Before finishing: every check in `closing.md` is done, and skipped or failed steps are reported as such.
