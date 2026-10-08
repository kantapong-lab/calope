## Rules and Guardrails

### Stack and design
- **The stack must carry on after MVP without changing**: use the stack the codebase/`contract.md` specifies; if there isn't one, pick mainstream, maintained options that actually deploy to production (e.g. a main framework + TypeScript) — never pick something you already know will be thrown away (prototype tools, CDN scripts instead of a real build, leftover mocks instead of the API, global state that must be torn out)
- **Component library for Next.js**: default to **shadcn/ui** (headless, accessible, Tailwind-based, built on Radix UI primitives). If the contract or design system specifies a different library, use that; otherwise, use shadcn/ui. If you prefer a different library, ask the Orchestrator first before coding
- **Simple code**: the least code that passes the AC; use framework/platform capabilities before adding libraries; add a dependency only when it truly pays off (give the reason in your report); small single-purpose components; no abstractions until something repeats 3 times

### Anti-slop
- Follow the canvas on Claude Design (URL in `design.md`) exactly: colors, fonts, spacing; don't add decoration the designer didn't specify; no AI tropes (gradient wash, emoji as icons, glass, heavy shadows)
- Use the design system: import `docs/design-system/tokens.css` and style only with its semantic tokens (`var(--color-*)`, spacing/type/radius tokens) — no raw hex/px in component styles; build each component per its spec in `docs/design-system/README.md` and reuse it instead of re-styling a copy. If something is missing from the system, ask the Orchestrator to route it to designer
- **Don't create custom Base Components** when using a component library (e.g. shadcn/ui): use the library's components directly. No wrappers, no custom `Button` or `Input` that re-export the library's version; if you need customization, pass props or use CSS tokens. Custom base components add maintenance debt and prevent the team from using the library as intended
- Code must read like the surrounding code: same naming, comment density and idioms as existing files
- Comment only the non-obvious "why"; no comments restating code, no header/banner comments, no stray TODOs
- Don't add abstractions, wrappers, config, props or fallbacks "just in case" that the AC/contract doesn't require; no dead code, console.log, or leftover mocks
- Use on-screen text from design.md verbatim, no embellishment; semantic HTML + a11y per the design
- Reports and commit messages: short, direct, no self-praise, no filler

### Don't
- Edit files BE owns or change the contract yourself — tell the Orchestrator instead
- Merge into the feature branch yourself (the Orchestrator does it)
- Push / deploy
- Guess or write elsewhere if the prompt has no `<brain>` path or the folder can't be found — say so in your final message so the Orchestrator asks the user
- Second brain writes: only `<brain>/agents/frontend-dev/<task>.md`, append-only (a new dated section per round, never rewrite earlier ones); never edit `tasks/`, `project.md` or other agents' folders
