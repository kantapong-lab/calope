## Rules and Guardrails

### Design system consistency
The design system is the single source of truth for every task. Consistency beats novelty: a new screen must look like it belongs to the same product as the old ones.

**Component library reference**: every component on the canvas must be mapped to the project's component library (e.g. shadcn/ui, Material Design). Document the mapping in `design.md` (e.g. "Button: shadcn/ui Button primary variant"). Design only within the library's capabilities; if something is missing, propose adding it to the design system first before using a one-off custom component.

- **Tokens before values**: every color, font size, spacing, radius, shadow and duration on the canvas comes from a token in `tokens.css`. Raw hex/px values appear only inside `tokens.css`
- **Two-layer color system**:
  - *Primitive* palette — one neutral ramp + one brand/accent ramp + status ramps (success, warning, danger, info), each in steps (e.g. 50–900)
  - *Semantic* roles that reference primitives — `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-primary-hover`, `--color-on-primary`, `--color-focus`, `--color-success/-warning/-danger/-info` (+ `-bg` / `-text` pairs for badges and alerts)
  - Components use **semantic** tokens only, never primitives, so dark mode and rebranding change one layer
  - Each status color has exactly one meaning everywhere (e.g. danger = error/destructive only); color is never the only signal — pair it with text or an icon
  - Every text/background pair in the semantic layer meets 4.5:1 (3:1 for large text and UI borders) in both light and dark
- **Fixed scales, no in-between values**:
  - Typography: one type scale (e.g. 12/13/15/16/22/26/32) with set weights and line heights per step; 1–3 typefaces total
  - Spacing: 4px base scale (4, 8, 12, 16, 20, 24, 32, 40, 48); layout gaps and padding pick from it
  - Radius: a small set (e.g. sm 8 / md 12 / full 999) with a rule for which components use which
  - Elevation: at most 2–3 shadow levels; prefer borders/surface color over shadows
  - Motion: 1–2 durations + one easing; respect `prefers-reduced-motion`
- **Components are defined once and reused**: each component has a documented anatomy, variants (e.g. button: primary / secondary / ghost / danger), sizes, and all interactive states (default, hover, focus-visible, active, disabled, loading). The same job always uses the same component — never two different-looking buttons for the same action level
- **One primary action per view**; the hierarchy primary → secondary → ghost is consistent across screens
- **Consistent patterns**: the same state looks the same everywhere — one pattern each for loading (skeleton or spinner, pick one), empty, inline field error, page-level error, and success feedback
- **Changes go through the system, not around it**: if a screen needs something the system lacks, add or change the token/component in `docs/design-system/` first, note it in the Changelog with the reason, then use it. Never fork a one-off variant inside a single screen
- **Don't break existing screens**: changing an existing token or component is a breaking change — list the affected screens in `design.md` so the Orchestrator can route the follow-up to FE

### Anti-slop
- No AI tropes: gradient wash, cards with a colored left border, emoji as icons, Inter/Roboto/Arial fonts, purple-blue gradients, glassmorphism without reason
- The overall look is defined once in the design system (1–3 typefaces, 1 background color, 0–2 accent colors) and every task follows it
- No lorem ipsum, invented numbers/stats/reviews/logos; for data that doesn't exist yet, use clearly visible placeholders
- On-screen text: only what users need to read, short and direct, no filler ("seamless", "powerful", "Welcome to…"), no design-rationale text inside artboards
- Every element must have a purpose; remove pure decoration; touch targets ≥44px; contrast 4.5:1; use real `<button>`/`<a>`/`<label>`
- design.md: concise, don't repeat the AC wholesale, no empty sections

### Don't
- Edit production code
- Hard-code colors/spacing that design tokens already provide
- Write a separate HTML mockup outside the canvas as the primary deliverable (duplicates Claude Design)
- Guess or write elsewhere if the prompt has no `<brain>` path or the folder can't be found — say so in your final message so the Orchestrator asks the user
- Second brain writes: only `<brain>/agents/designer/<task>.md`, append-only (a new dated section per round, never rewrite earlier ones); never edit `tasks/`, `project.md` or other agents' folders
