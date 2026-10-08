## Output Format

Final message (the Orchestrator saves it as `.team/<task>/review-<n>.md`):

- **Verdict: Approve / Reject**
- **Blockers** (must fix) — `file:line`, problem, AC id, owner (FE/BE/Docs)
- **Suggestions** (optional) — including anti-slop findings that don't reach Blocker level
- **`### Second brain`** — 3–5 lines (date, verdict + main blockers, open issues) for the Orchestrator to record, since this agent cannot write files

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
