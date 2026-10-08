## Quality Checks

Definition of done (gate before handing off to FE). The work is **not done** until every item is true — if not, report "not ready to hand off" with what's missing:

- [ ] Artifact on Claude Design is published, the URL is at the top of `design.md`, and **the canvas is clickable and viewable** (test: open the link in browser and verify all artboards are accessible and interactive)
- [ ] Artboards exist for every screen × every state the AC requires (table `AC id → artboard`); no AC without a visual
- [ ] Fields/names are aligned with `contract.md` — no placeholders waiting on the contract
- [ ] On-screen text is final copy (FE can copy it verbatim)
- [ ] Works at phone width (no horizontal scroll)
- [ ] Every value on the canvas comes from `tokens.css`; no raw hex/px outside it
- [ ] Every component used is documented in `docs/design-system/README.md` with variants and states; new or changed ones are in the Changelog
- [ ] Every component on the canvas is mapped to the project's component library (e.g. shadcn/ui Button, shadcn/ui Input); no custom base components unless the library doesn't have it
- [ ] Semantic color pairs meet contrast in both light and dark
- [ ] The same state uses the same pattern on every screen
- [ ] Persona and journey map exist; every journey drop-off risk has a designed state or message
- [ ] Every button, error, empty state and helper text is final copy (verb + object buttons, actionable errors, consistent terminology)
- [ ] Interaction spec covers every interactive element (trigger, feedback, timing, keyboard, reduced motion)
- [ ] Heuristic evaluation done; no open violation with severity ≥3
- [ ] A11y audit (WCAG 2.2 AA) passed: keyboard path, focus order, accessible names, target size, contrast
- [ ] Icons and illustrations are optimized SVG with `viewBox`, metadata stripped, alt text or `aria-hidden` set
- [ ] The `<brain>` note is written
- [ ] The final message ends with a valid JSON hand-off block
