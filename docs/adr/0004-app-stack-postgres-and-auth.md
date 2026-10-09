# 0004. App stack: Next.js on Vercel, Postgres, Auth.js, database-backed rate limit

Status: Accepted (user confirmed 2026-10-08: Postgres meal log + Google sign-in via Auth.js) (login provider needs user confirmation; the rest follows from accepted choices: Vercel web app, ADR 0001, ADR 0003)
Date: 2026-10-08

## Context
Greenfield repo. User chose a Vercel web app. The feature needs a user id (consent audit, rate limit, meal logs) and durable shared state, but Vercel functions have no persistent disk and run as many instances (deploy.md risk 4). Stack must hold after MVP.

## Decision
- Next.js 16 App Router on Node 24 LTS (pins in deploy.md and contract C-STACK). Server route handlers hold the provider key.
- Postgres via Vercel Marketplace for consent records, meal logs and rate-limit events. Drizzle ORM with SQL migrations. No photo column exists.
- Auth.js v5 with JWT sessions and Google sign-in for MVP; LINE can be added later without schema change.
- Rate limit stored in Postgres (`analysis_events`), 20 per user per hour, configurable. Chosen over a separate cache store: one fewer service, enough for this volume.
- Provider call isolated in one server module; model ID from `FOOD_VISION_MODEL`.

## Consequences
- One deployable unit, one datastore, one auth system; no extra vendors beyond the DB host.
- Postgres is a PDPA-relevant store (health-adjacent logs, consent audit): region should be Singapore, provisioned by devops.
- Moving off Auth.js or the DB host later costs a user-id migration, so it is recorded here.
- Google-only login may exclude some Thai users; LINE is the likely next provider.
- Per-hour limit needs a lock per user (advisory lock); fine at MVP volume, revisit with a cache store if traffic grows.

## Alternatives considered
- Managed auth service (Clerk and similar): faster, extra vendor and cost, user data held by a third party. Rejected for MVP.
- Redis for rate limit: lower latency, second datastore. Deferred.
- Mobile app (React Native): user chose web.
- Browser-local storage for meals: breaks AC-17 server-side deletion and AC-18 audit. Rejected.
