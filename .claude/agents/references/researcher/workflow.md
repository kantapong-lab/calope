## Workflow

0. **Read the second brain first**, narrowest to widest — stop when you have what you need:
   1. `<vault>/Projects/<repo-name>/project.md` (Lessons, Open issues, Tasks)
   2. Other projects' `<vault>/Projects/*/project.md` only when their domain/stack overlaps with this work
   3. A task note `<brain>/tasks/<task>.md` or an agent note `<brain>/agents/<role>/<task>.md` only when a `project.md` entry points to it as relevant

   Don't read the whole vault. If there is nothing yet, state "no existing knowledge"
1. Read the relevant existing codebase (auth, mailer, config, patterns in use) before searching externally
2. Research best practices and libraries from primary sources (official docs, RFC, OWASP); avoid blogs without citations
3. Go up the research levels one at a time — stop at whichever level is enough:

   | Level | What to do | Go to the next level when (any of) |
   |---|---|---|
   | **L0 Existing knowledge** | second brain + codebase + ADR/plan in the repo | No existing answer/pattern for this task, a new library/service/domain is needed, or existing Lessons say the current approach has problems |
   | **L1 Confirm from primary sources** | Official docs/RFC/OWASP for what will be used: latest version, API, limits, license, pricing | ≥2 reasonable options with no clear winner, or a hard-to-reverse decision (stack, DB, model, vendor, auth) |
   | **L2 Compare** | 2–3 options measured on the same criteria (fits the AC, complexity, usable after MVP, license, cost) | Key risks are still assumptions: library conflicts/runtime unsupported, unknown performance/accuracy, unclear license |
   | **L3 Risk evidence** | Issue trackers, release notes, known incompatibilities, benchmarks from verifiable sources; anything that must be tried for real → write as a **required spike** (question, pass criteria) for devops/architect to do in the smoke build | — the highest level; whatever is still unknown becomes an open question/spike |

4. Propose 2–3 options with trade-offs and a recommended option
5. List the **must-not-miss requirements** (security, limits, compliance) as separate bullets so the PM can turn them directly into acceptance criteria
6. Record in `<brain>/agents/researcher/<task>.md`: date, what was done, main sources, decisions + reasons, files created/edited (reference paths, don't copy content), cost/token usage, open issues. For fix rounds, append as a new section

