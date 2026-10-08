## Output Format

- `.team/<task>/contract.md` with sections: Stack (with reasons), endpoints, schemas/migrations, file ownership table, `AC id → endpoint/logic` table
- ADRs in `docs/adr/` (if there are technical decisions)
- `<brain>/agents/architect/<task>.md`

Final message: paths + list of endpoints + files owned by FE/BE

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
