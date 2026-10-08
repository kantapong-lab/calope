# 0002. Photo storage, retention and PDPA consent

Status: Proposed (needs legal review; also depends on ADR 0001 confirmation)
Date: 2026-10-08

## Context
Food photos tied to fitness goals are likely health (sensitive) data under PDPA: explicit consent needed. Photos go to Anthropic (USA); API default is deletion within 30 days, no training use without permission, zero-data-retention is opt-in via sales. Brief source for PDPA is secondary; legal review required. PM decides retention.

## Decision
- No long-term photo storage in MVP. The backend handles the photo in memory (EXIF stripped), sends it to the provider, and discards it. Only the meal log (dish, grams, kcal range, edited flag, timestamp) is persisted. No thumbnail.
- Explicit, separate, unticked consent before first upload. Text in Thai names Anthropic as processor, overseas transfer to the USA, purpose, the provider's up to 30 day retention, right to withdraw and delete. Consent record: user id, version, timestamp, withdrawal timestamp.
- Withdrawal blocks further analysis; user can delete a meal or all food data. Deletion is hard delete of the user's meal logs.
- Never log image bytes. Consent text version bumps force re-consent.
- Ask Anthropic about ZDR if legal wants zero provider retention.

## Consequences
- Lowest PDPA surface: nothing to breach or delete server-side apart from logs.
- User cannot re-view the original photo later; accepted for MVP. Storing photos is a new ADR.
- Consent gate adds an onboarding step and blocks the feature for non-consenting users (manual entry still works with no photo, no transfer).
- Legal may reject USA transfer; then supersede with Bedrock APAC via ADR 0001.

## Alternatives considered
- Store photos for history: more value, larger PDPA scope, needs storage and deploy target. Deferred (P2 backlog).
- Implied consent via terms of use: not valid for sensitive data. Rejected.
- On-device only: avoids transfer, blocked by licence (ADR 0001).
