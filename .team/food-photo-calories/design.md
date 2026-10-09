# Design: food-photo-calories (round 2)

Canvas URL: https://claude.ai/artifact/Fp7p4xvK1Fpv5ga6kdYp6X (published v2 by Orchestrator, private: owner-only until shared; source `canvas/project/`, entry `Main.dc.html`, 19 boards in `canvas.json`).
Platform: responsive web, phone-first (360px), single column to 40rem. Thai copy final and editable; FE puts strings in `src/copy/th.ts`.
Aligned to `contract.md` (architect r1). Design system: `docs/design-system/tokens.css`, `README.md` (created this task). Component base shadcn/ui (assumed).

## Persona and journey
Persona: Thai adult logging meals on a phone right after eating, in poor light, wary of sending a photo overseas.
| Stage | Touchpoint | Drop-off risk | Designed answer |
|---|---|---|---|
| Sign in | signin | friction | One Google button; says sign-in is not photo consent |
| Consent | consent | long legal text, distrust | Five labelled rows, unticked box, decline path to manual entry |
| Upload | Main, file-rejected | rejected file | Inline error stating limit |
| Wait | analysing | slow | Status, skeleton, cancel |
| Result | result | "number is wrong" | Range, confidence label, assumptions, edit |
| Edit | result-edit | rename confusion | Live recalc; rename says kcal unchanged |
| Fail | not-food, error-fallback, rate-limit | dead end | Manual route always present |
| Review | history | cannot remove a wrong entry | Per-item delete |
| Privacy | settings | cannot find withdraw | Settings: withdraw, delete all, sign out |

## Flow
signin -> (GET /api/consent active=false) consent -> POST /api/consent -> Main -> pick file -> client checks -> analysing (POST /api/analyze) -> result | not-food | error-fallback | rate-limit -> result-edit -> Save (POST /api/meals) -> saved -> history. Manual entry (POST /api/meals source=manual) needs sign-in only, no consent. Any 401 UNAUTHENTICATED -> signed-out. Version bump or 409 CONSENT_VERSION_MISMATCH -> consent screen with info Alert "ข้อความความยินยอมมีการปรับปรุง กรุณาอ่านและยินยอมอีกครั้ง" above the panel (same layout, no extra board). 403 CONSENT_REQUIRED from analyze -> consent screen. Withdraw -> DELETE /api/consent -> settings-withdrawn; capture then shows consent.

## AC to artboard
| AC | Board / state |
|---|---|
| AC-1 | Main (accepted types, 10 MB), file-rejected (type, size; client pre-check, codes INVALID_FILE_TYPE / FILE_TOO_LARGE use same copy) |
| AC-2, AC-3 | Main note only; behavior FE/BE |
| AC-4, AC-22 | result (name_th + name_en, grams, kcal range, confidence, assumptions) |
| AC-5 | result, result-edit, history, saved: ranges; manual rows show one user-entered number labelled "ที่คุณกรอก" (not an estimate, contract C-API-MEALS) |
| AC-6 | disclaimer visible on Main, analysing, result, result-edit, error-fallback, manual, saved, history |
| AC-7 | not-food |
| AC-8 | result-edit (free-text name, re-estimate via dish_hint, manual kcal link) |
| AC-9 | result-edit (grams or servings; client recalc, aria-live) |
| AC-10 | result Save, saved; badges: "แก้ไขโดยคุณ" when edited=true, "กรอกเอง" when source=manual |
| AC-11, AC-12 | analysing (silent retry), error-fallback for PROVIDER_ERROR, PROVIDER_INVALID_OUTPUT, PROVIDER_TIMEOUT (fallback "manual") |
| AC-13 | rate-limit (RATE_LIMITED, wait time from Retry-After) |
| AC-14 | consent, settings-withdrawn |
| AC-15 | consent |
| AC-16 | settings, settings-withdrawn |
| AC-17 | history + history-delete (one item), delete-confirm + settings (all) |
| AC-18 | consent shows CONSENT_VERSION; record is BE |
| AC-19, 20, 21, 23, 24 | no UI |

## Error code to state
| Code | State |
|---|---|
| INVALID_FILE_TYPE, FILE_TOO_LARGE | file-rejected (show message_th; copy on canvas is the fallback) |
| CONSENT_REQUIRED, CONSENT_VERSION_MISMATCH | consent |
| RATE_LIMITED | rate-limit |
| UNAUTHENTICATED | signed-out |
| PROVIDER_ERROR, PROVIDER_INVALID_OUTPUT, PROVIDER_TIMEOUT | error-fallback (retry button shown only when retryable=true) |
| BAD_ORIGIN, BAD_REQUEST, network, unlisted | generic danger toast "ทำรายการไม่สำเร็จ ลองอีกครั้ง" (FE copy; contract has no message for these) |
| is_food=false (200) | not-food |
| NOT_FOUND on DELETE /api/meals/{id} | treat as deleted: remove row, same success toast |

## Component map (board component -> library -> contract field -> AC)
| Component | Library | Contract field | AC |
|---|---|---|---|
| Buttons, Inputs, Alert, Badge, Toast, Switch-free settings | shadcn/ui Button, Input, Alert, Badge, Sonner | n/a | all |
| File capture | shadcn/ui Button + native input | photo | 1 |
| DishCard (result) | custom (new) | Dish: name_th, name_en, grams, kcal_low, kcal_high, confidence, assumptions | 4, 5 |
| KcalRange | custom (new) | kcal_low, kcal_high; total = client sum | 5, 9 |
| Confidence Badge | shadcn/ui Badge | confidence: >= 0.75 high, >= 0.5 medium, else low (contract C-FE-CLIENT); percent shown = confidence x 100 | 4 |
| Name input | shadcn/ui Input | dish_hint (1..80), dish_name_th (1..120) | 8 |
| PortionStepper | custom (new) over Input + Button | grams 1..5000; servings x baseGrams | 9 |
| HistoryRow | DishCard variant (new) | Meal: id, dish_name_th, dish_name_en, portion_grams, kcal_low, kcal_high, edited, source, created_at | 10, 17 |
| Load more | shadcn/ui Button | next_before | 17 |
| ConsentPanel + Checkbox | custom (new) + shadcn/ui Checkbox | required_version, version, consented_at, withdrawn_at, active | 14-16, 18 |
| AlertDialog | shadcn/ui AlertDialog | DELETE /api/meals/{id}; DELETE /api/meals?confirm=true | 17 |
| Manual form | shadcn/ui Input, Button | dish_name_th, portion_grams, kcal (sent as kcal_low = kcal_high), source=manual, edited=false | 11 |

Grouping by day on history is a client grouping of created_at; one row is one dish item (contract has no meal group id).

## Interaction spec (key items)
| Element | Behavior | Keyboard | Reduced motion |
|---|---|---|---|
| Capture | OS picker; client checks type and 10 MB; fail -> file-rejected, no network | Enter/Space | n/a |
| Consent checkbox | unticked default; enables primary; POST /api/consent | Space | none |
| Loading | spinner, status text, skeleton, cancel aborts request | Cancel focusable | static |
| Stepper | -/+ 25 g; recalc round(kcal x newG / baseG); clamp 1..5000; error text under field | arrows step, Enter commits | value crossfade |
| Rename | kcal unchanged + info Alert; "ประเมินใหม่จากชื่อนี้" sends dish_hint with held photo; or manual kcal | Tab order name, actions | none |
| Delete item / all | AlertDialog, Cancel focused; confirm -> request -> toast and row removal | focus trap, Esc cancels | fade only |
| Save | button loading, then saved; failure -> generic toast, edits kept | | |
| Load more | appends next page, focus moves to first new row | | |

## Accessibility (WCAG 2.2 AA)
Visible labels; real buttons/links; 44px targets; 3px focus ring; role=status/alert; range text is the primary signal, bar is decoration with text alternative; status never color only; Thai line-height 1.6; delete buttons name the dish (aria-label); dialogs trap focus. Contrast designed >= 4.5:1 light and dark but NOT yet measured with a tool (Orchestrator step).

## Heuristic evaluation (Nielsen)
No open severity >= 3. Status: loading, saved, toasts. Error recovery: every error has an action. Prevention: client file checks, disabled consent button with reason, delete confirm. Consistency: one Alert, one button hierarchy. Open severity 2: the range bar scale (0 to 1000 kcal) is illustrative, FE may drop it; "ความมั่นใจ" wording needs PM nod.

## Contract questions (gaps, not invented)
- Q1 (AC-8 "pick"): contract has no dish suggestion source; design is free-text only. Does PM want a pick list? If yes, needs data (static list is a licensing-sensitive question, AC-23).
- Q2: re-estimate returns `dishes[]`; which dish replaces the edited one? Design assumes the first; confirm, or add `dish_hint` semantics (single dish).
- Q3: no meal group id, so a photo with two dishes appears as two history rows deleted separately. Acceptable, or add a group id?
- Q4: if an AI row has kcal_low == kcal_high, history shows it as a range "N - N" (AC-5). Confirm.
- Q5: session fields (name/email) not in contract; settings shows no account name. Add if wanted.
- Q6: generic error copy for BAD_ORIGIN / BAD_REQUEST has no `message_th`; FE copy proposed above.

## Placeholders and open items
- Consent wording DRAFT, marked LEGAL-REVIEW in `consent.dc.html` (B-2 open, ADR 0002 Proposed). Version string shown is the contract example `2026-10-v1`.
- Sample dishes, kcal and times are illustrative. Rate-limit wait "12 นาที" is a sample of Retry-After.
- Login provider Google pending PM confirmation (contract B-2).
- IBM Plex Sans Thai must be loaded by FE. Canvas `tokens.css` is a copy of the system file; keep in sync.
- Contrast measured by Orchestrator (WCAG, oklch to sRGB, docs/design-system/tokens.css pairs): text 18.25:1, muted 14.89:1, on-primary 16.76:1, success/warning/danger/info text on their bg 9.81 to 13.48:1. All pass AA 4.5:1. Not measured: rendered canvas (type forbids verification).

## Design system changes
tokens.css and README.md created. New components: KcalRange, PortionStepper, DishCard (HistoryRow variant), ConsentPanel. No existing screens affected.
