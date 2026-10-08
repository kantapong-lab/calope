# Calope design system

Source of values: `tokens.css`. Component base: shadcn/ui (assumed; stack not chosen yet, devops/architect to confirm; map changes if a different library is picked). Created in task food-photo-calories.

## Principles
- Honest uncertainty: estimates are ranges, never one precise number.
- Thai first: all copy Thai, dish names Thai + English. Line height 1.6 so tone marks do not clip.
- One primary action per view. Primary > secondary > ghost everywhere.
- Color never the only signal: status = icon + text + color.
- Phone width first (360px), single column, max 40rem on larger screens.

## Color
Two layers. Primitives (neutral, brand teal, status) feed semantic roles (`--color-bg/-surface/-text/-text-muted/-border/-primary/-focus/-success|warning|danger|info-bg|-text`). Components use semantic tokens only. Meanings: danger = error or destructive; warning = uncertainty/caution (assumptions, disclaimer, low confidence); info = neutral notice (not food, consent info); success = saved. Contrast: text pairs designed for >= 4.5:1 light and dark; verify with a checker at build.

## Typography
IBM Plex Sans Thai (fallback Noto Sans Thai). Scale: 13 / 15 / 16 / 22 / 26 / 32. Weights 400/500/600. Body 16/1.6. Measure 65ch.

## Spacing & layout
4px scale `--space-1..12`. Touch target >= 44px (`--target-min`). Single column, `--layout-max`.

## Radius & elevation
sm 8 (inputs, chips), md 12 (panels, dialogs), full (badges, pills). Borders over shadows; one overlay shadow.

## Motion
`--duration-fast` 120ms, `--duration-base` 220ms, `--ease-out`. Reduced motion: durations 0, crossfade only.

## Components
Loading pattern: skeleton for result content, inline spinner inside buttons. Error: page-level `Alert` (danger) with action; field error under field. Empty: short text plus one action.

| Component | Library source | Variants | States | Notes |
|---|---|---|---|---|
| Button | shadcn/ui Button | primary, secondary, ghost, danger | default, hover, focus-visible, active, disabled, loading | min height 44px |
| Input / Textarea | shadcn/ui Input | text, number | default, focus, error, disabled | label always visible |
| Checkbox | shadcn/ui Checkbox | default | unchecked (default), checked, focus, disabled | consent never pre-ticked |
| Alert | shadcn/ui Alert | info, warning, danger, success | static | icon + title + body + optional action |
| Badge | shadcn/ui Badge | confidence high/medium/low | static | text label plus icon, not color alone |
| Dialog / Sheet | shadcn/ui Dialog, Sheet | confirm, bottom-sheet on phone | open, closing | focus trap, Esc closes |
| Skeleton | shadcn/ui Skeleton | line, block | pulse (static if reduced motion) | |
| Toast | shadcn/ui Sonner | success, danger | | role=status |
| Switch | shadcn/ui Switch | default | on, off, focus | settings consent toggle |
| Combobox | shadcn/ui Command + Popover | dish picker with free text | closed, open, empty results | free text allowed |
| KcalRange (new) | custom, built on tokens | default, stale | default, recalculating | shows "420 - 580 kcal", range bar; never single number |
| PortionStepper (new) | custom, shadcn Input + Button | grams, servings | default, focus, error (out of range) | -/+ buttons 44px, input editable |
| DishCard (new) | custom composition | estimated, edited, manual | default, editing | Thai name, English name, KcalRange, confidence Badge, assumptions list |
| ConsentPanel (new) | custom composition | first-time, re-consent | default | processor, transfer, purpose, retention, withdraw |

Do: one KcalRange per dish and one total range. Don't: show a lone kcal number, pre-tick consent, rely on color alone.

## Changelog
- 2026-10-08: Initial tokens and components for food-photo-calories (no earlier UI existed). New components: KcalRange, PortionStepper, DishCard, ConsentPanel.
- 2026-10-08 (r2): DishCard gains a "history" variant (time, edited/manual badge, per-item delete); manual rows show one number labelled "ที่คุณกรอก".
