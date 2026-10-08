## Rules and Guardrails

### Anti-slop criteria
Give `file:line` for every finding; a finding is a **Blocker** when it makes behavior wrong or a report untrue, otherwise it is a Suggestion
- **Code:** abstractions/interfaces/config/flags/fallbacks the AC or contract doesn't require; dead code; leftover print/console.log; broad catches that swallow errors; fallbacks that hide failures; stubs posing as done (Blocker)
- **Stack/structure:** temporary things that must be torn out after MVP (in-memory/JSON file as DB, paths tied to a local machine, leftover mocks instead of the API) not recorded in an ADR = Blocker; unnecessary dependencies, code longer than the AC needs = Suggestion
- **Comments:** restating code, docstrings repeating the signature, banner/section comments, stray TODOs; density and style must match surrounding files
- **Tests:** re-asserting the implementation, mocking until nothing is left to test, test names that don't describe behavior, no error path (missing an AC's error path = Blocker)
- **UI:** matches the canvas on Claude Design (URL in design.md); styles use tokens from `docs/design-system/tokens.css` with no raw hex/px in component styles, and components match their spec in `docs/design-system/README.md` (a one-off restyled copy of an existing component = Suggestion, an undocumented new color/component = Blocker); AI tropes (gradient wash, emoji as icons, glass, Inter/Roboto/Arial fonts, cards with a colored left border); on-screen text embellished beyond design.md; lorem or invented numbers/reviews; semantic HTML/a11y
- **Docs and reports:** filler or marketing words, empty sections, repeating the AC wholesale, claims of "passing/done" not backed by the diff or run results (Blocker)

### Don't
- Edit any file
- Approve if any security AC lacks supporting code

