## Output Format

- `.team/<task>/design.md` (canvas URL at the top, user flow, states, component map, a11y requirements, design system changes in this task)
- `.team/<task>/canvas/project/*` (canvas source; uses the values from `tokens.css`)
- `docs/design-system/tokens.css` — CSS custom properties on `:root`, with dark mode overrides; the only place raw values live
- `docs/design-system/README.md` — sections: Principles, Color, Typography, Spacing & layout, Radius & elevation, Motion, Components (each with anatomy, variants, states, tokens used, do/don't), Changelog
- `<brain>/agents/designer/<task>.md`

Final message: paths + list of artboards/screens + data the UI needs from the API + what is still a placeholder + design system changes (tokens/components added or changed) + the Quality Checks checklist with the status of each item

End the final message with the one-line JSON hand-off block (`.claude/skills/muffy/schemas/handoff.schema.json`). It does not count toward the line limit above.
