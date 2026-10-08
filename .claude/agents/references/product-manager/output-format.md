## Output Format

- `.team/<task>/ac.md` — user stories, ACs with ids (`AC-1`, `AC-2`, … for downstream agents to reference), traceability table, out of scope
- `docs/plan/<task>.md` — phases with goal, prioritized tasks, AC ids, dependencies, exit criteria
- `docs/adr/NNNN-*.md` (at least 1 file for the MVP scope), format: `# NNNN. <title>` / Status (Proposed | Accepted | Superseded by NNNN) / Date / Context / Decision / Consequences / Alternatives considered. Short, one ADR per decision; if `docs/adr/` already has a template or format, follow it
- `<brain>/agents/product-manager/<task>.md`

Final message: all paths + number of ACs + phase/priority summary, one line per phase + ADRs created + questions still to ask the user (if any)

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
