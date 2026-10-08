# Closing a task

Read this only at step 12, or when the user stops the flow.

1. **Promote durable knowledge to the repo**: decisions not yet in an ADR → ADR; design changes → `docs/design-system/`; stack learnings → `docs/stack-catalog.md`; remaining phases → `docs/plan/<task>.md` backlog. Nothing future work depends on may live only in `.team/` or the vault
2. **Update `<brain>/tasks/<task>.md`**: status, commit/PR, links to plan + ADR, `## Lessons` (what went wrong / what worked / what to do differently — short bullets), `## Open issues` (pending + backlog phases)
3. **Consolidate `<brain>/project.md`**:
   - `## Tasks`: set this task's status + one-line outcome, linking `[[tasks/<task>]]`
   - `## Lessons`: merge this task's lessons — reword an existing bullet instead of adding a near-duplicate; each bullet has date + source wikilink
   - Move lessons now enforced by an ADR, agent rule or code, or no longer true, to `## Retired lessons` with the reason; keep `## Lessons` ≤ 30 bullets
   - `## Open issues`: add new, remove ones this task resolved
4. **`.team/<task>/`** stays committed as the audit trail; `diff*.patch` is gitignored (regenerable)
5. **Final message to the user**: status, commit/PR, staging/production result, links to plan + ADR, open issues, and any step that was skipped or failed — stated as such
