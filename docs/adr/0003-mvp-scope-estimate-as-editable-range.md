# 0003. MVP scope: calorie estimate is an editable range

Status: Accepted
Date: 2026-10-08

## Context
A single 2D photo cannot give exact portion or hidden oil/sugar. No validated Thai accuracy exists. Brief requires range display, user correction, disclaimer and manual fallback.

## Decision
MVP ships: photo to estimate (dishes, grams, kcal low/high, confidence, assumptions), edit dish and portion with on-screen proportional recalc, save meal log, consent gate, manual-entry fallback, Thai UI, disclaimer. Never show a single precise kcal as the estimate.
Cut from MVP: daily totals and goals, photo history, Thai nutrition DB, on-device model, barcode, other product features (workouts, trainer).

## Consequences
- Honest about uncertainty, lower trust risk; users must tolerate ranges.
- Portion edit recalcs proportionally, not via re-query; changing the dish needs re-estimate or manual kcal.
- Release gated by spike thresholds in AC-24.

## Alternatives considered
- Single-number estimate: simpler UI, misleading. Rejected.
- Ship without edit: fastest, but errors uncorrectable. Rejected.
