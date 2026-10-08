# Principles: Design System Leadership

These principles guide every design decision:

## 1. Accessibility is the Baseline
- Every design must be usable by people with disabilities
- Color must not be the only way to convey information (also use shape, text, pattern)
- Contrast ≥4.5:1 for text; test with tools
- Keyboard navigation must work; test without mouse
- Screen reader users must understand the content

## 2. Design System is Binding
- If it's in the design system, use it — no exceptions without an ADR
- Inconsistency multiplies design debt across the product
- New components go through design system review before shipping
- Components live in the system; designers and devs update them together

## 3. Every State Must Be Designed
- Empty state (no data), loading state, error state, success state, disabled state
- Don't design the happy path and hope other states look okay
- Every state is part of the user experience; design all of them
- If you can't see a state in the design, it's missing

## 4. Design Decisions Have Reasons
- "I like this better" is not a reason
- Reasons: accessibility, consistency, user research, performance, brand
- Document why you chose a pattern; it helps the next designer
- Design is not art; it's solving problems with constraints

## 5. User Research Informs Design
- Assumptions are wrong 70% of the time
- Test designs with users before dev starts
- Usability testing reveals problems; fix them in design, not in code
- "Users want X" without research is a guess

## 6. Design Precision Reduces Rework
- Specify: spacing, typography, colors (hex, not "blue-ish"), corner radius, shadows
- Designs without precision lead to "let me adjust this" rounds in dev
- Dev should not guess what you meant; values must be exact
- Use design tokens from the system; don't invent new colors

## 7. Research Grounds the Flow
- Synthesize research into insights (observation → pain/goal → evidence → design implication); raw quotes alone are not insights
- Personas are built from evidence, not invented: goal, context, constraints, and the job they hire the product for
- Map the user journey per persona: stages, touchpoints, emotion, drop-off risk; every drop-off risk gets a state or message in the design

## 8. Words Are Part of the Design
- Every label, button, helper text, error, empty state and success message is written deliberately, not left as placeholder
- Buttons use verb + object ("Save address", not "OK" or "Submit"); errors say what happened and how to fix it
- Plain, short, one idea per sentence; no filler ("seamless", "powerful"); same term for the same thing everywhere (terminology is part of the design system)

## 9. Visual Foundations Come From the System
- Color and typography are chosen from the system's tokens; specify exact values (hex, size, weight, line height, letter-spacing)
- Brand consistency is checked, not assumed: compare each screen against the brand guide and existing screens before handoff

## 10. Structure Before Style
- Wireframe the layout (grid, reading order, visual hierarchy, content priority) before applying color and polish
- Every interactive element has an interaction spec: trigger, behavior, feedback, timing, keyboard behavior, and a reduced-motion alternative

## 11. Critique Against Heuristics, Constructively
- Run a heuristic evaluation (Nielsen's 10 usability heuristics) on every screen before handoff; record each violation with its heuristic and a severity 0–4
- Critique the work, not the person: state what works, what fails, which principle it breaks, and a concrete fix

## 12. Accessibility and Assets Are Audited
- Run an a11y audit against WCAG 2.2 AA: keyboard path and focus order, visible focus, labels, contrast, target size ≥24px (aim 44px), motion, and accessible names for every icon
- Optimize assets before handoff: SVG with `viewBox`, editor metadata stripped, icons reused as symbols, alt text or `aria-hidden` set for every image and icon
