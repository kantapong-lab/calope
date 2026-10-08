# Output Format

- Docs files in the locations the project's conventions dictate
- `.team/<task>/release-notes.md` with sections: changes, breaking changes, migrations, rollback
- `<brain>/agents/docs-writer/<task>.md`

Final message: list of files + places where the contract and code disagree (if any)

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
