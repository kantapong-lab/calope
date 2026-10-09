# Plan: food-photo-calories

Date: 2026-10-08. ACs: `.team/food-photo-calories/ac.md`. ADRs: 0001 (provider, Proposed), 0002 (storage/PDPA, Proposed), 0003 (MVP scope).
Phases in this team flow run: Phase 1 and Phase 2. Phase 3 is backlog.
Gate: ADR 0001 needs user confirmation before step 3d; deploy target open (blocks devops/deploy, not design).

## Phase 1: Shippable MVP
Goal: user consents, uploads a photo, sees an editable kcal range, saves the meal, with manual fallback.

| # | Task | Pri | ACs | Depends on |
|---|---|---|---|---|
| 1.1 | Confirm provider/model with user (ADR 0001) and legal question on USA transfer | P0 | AC-21 | none |
| 1.2 | Consent screen, consent record, withdraw, gate before upload | P0 | AC-14, AC-15, AC-16, AC-18 | none |
| 1.3 | Upload validation (type, size), client resize, EXIF strip | P0 | AC-1, AC-2, AC-3 | none |
| 1.4 | Backend analyse endpoint: provider call, JSON schema, validate + one retry, FOOD_VISION_MODEL config, key server-side | P0 | AC-4, AC-12, AC-19, AC-21 | 1.1 |
| 1.5 | Result screen: range, confidence, assumptions, disclaimer, Thai + English names, non-food state | P0 | AC-4, AC-5, AC-6, AC-7, AC-22 | 1.4 |
| 1.6 | Edit dish and portion, proportional recalc, save meal log | P0 | AC-8, AC-9, AC-10 | 1.5 |
| 1.7 | Error/timeout/overload handling and manual-entry fallback | P0 | AC-11 | 1.4 |
| 1.8 | Delete meal / all food data | P0 | AC-17 | 1.6 |
| 1.9 | Per-user rate limit | P0 | AC-13 | 1.4 |
| 1.10 | No image bytes in logs; licence audit (no Thai FCD/THFOOD) | P0 | AC-20, AC-23 | 1.4 |

Exit: all P0 ACs above pass in QA; consent text reviewed by legal; ADR 0001 and 0002 moved to Accepted or superseded.

## Phase 2: Accuracy validation (run in parallel with Phase 1 build, release-gating)
Goal: prove the estimate is good enough on Thai dishes and pick model.

| # | Task | Pri | ACs | Depends on |
|---|---|---|---|---|
| 2.1 | Smoke build: 30+ Thai dishes, weighed portions, 3 runs, effort low; record error, range hit, latency, cost | P0 | AC-24 | 1.4 |
| 2.2 | Haiku 5.5 comparison and image-token check (2000x1500) | P1 | AC-24 | 2.1 |
| 2.3 | Confirm INMU permission for internal evaluation data | P1 | AC-23 | none |
| 2.4 | Retirement alerts (Sonnet 2027-09-28, Haiku 2027-10-07) | P1 | n/a | 1.4 |

Exit: AC-24 thresholds met by the chosen model, or PM revises thresholds with the user. No P0 task here depends on P1/P2.

## Phase 3: Backlog (not in this run)
| # | Task | Pri | Notes |
|---|---|---|---|
| 3.1 | Photo history with stored photos | P2 | new ADR, storage + PDPA |
| 3.2 | Licensed Thai nutrition DB (INMU) for grounding | P2 | licence needed |
| 3.3 | Bedrock APAC variant | P2 | only if legal rejects USA transfer (then P0, supersede ADR 0001) |
| 3.4 | On-device pre-filter / offline mode | P2 | licence blocker |
| 3.5 | Daily totals and goals | P2 | joins other features |
