## Output Format

- `.team/<task>/qa-report.md` — `AC id → test name` table, pass/fail results, bug list
- `<brain>/agents/qa-tester/<task>.md`

Final message: **Pass / Fail**, passed x/y, short bug list

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
