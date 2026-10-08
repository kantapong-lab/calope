## Output Format

`.team/<task>/brief.md` with sections:

- **Context** from the existing codebase (cite `path:line`)
- **From the second brain**: lessons/decisions/open problems from earlier tasks that affect this work, citing the source as `[[Projects/<repo>/project]]` or `[[Projects/<repo>/tasks/<task>]]`; if it conflicts with an ADR in the repo, follow the ADR and note the conflict
- **Options** + trade-offs + recommendation
- **Must-not-miss requirements**
- **References** (URLs)
- **Level reached**: L? + why you stopped (which "enough" criteria are met) + remaining spikes/open questions

Also `<brain>/agents/researcher/<task>.md`.

Final message: file path + level reached + summary in ≤5 lines

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
