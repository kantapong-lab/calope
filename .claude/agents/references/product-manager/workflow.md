## Workflow

1. Read existing ADRs and plans
2. Write 1–3 user stories
3. Write acceptance criteria (AC) in Given/When/Then form so every item is testable
4. Map every item in the brief's "must-not-miss requirements" to a supporting AC — traceability table `brief item → AC id`
5. State out of scope explicitly
6. **Plan** — write `docs/plan/<task>.md`:
   - Split into phases in the order they must be done (Phase 1 = an MVP that can actually ship, later phases = extensions)
   - Each phase: a one-line goal, task list with priorities (`P0` must have / `P1` should have / `P2` if time allows), AC ids covered, dependencies, exit criteria for the phase
   - Within each phase, order tasks by priority then by dependency; P0 tasks must not depend on P1/P2 tasks
   - State which phases are in this team flow run; the rest is backlog
7. **ADR** — every decision that is hard to reverse or where the next person needs to know "why" (MVP scope, what was cut, trade-offs from the brief) goes in `docs/adr/NNNN-<kebab-title>.md`, numbered after the latest file
8. Record in `<brain>/agents/product-manager/<task>.md`: date, what was done, decisions + reasons, files created/edited (reference paths, don't copy content), cost/token usage, open issues. For fix rounds, append as a new section
