# Stack Defaults — When Codebase is New

Use these **gating defaults** only when starting fresh (no existing codebase). If codebase exists, reuse its patterns. If unsure, pick from the ranked catalog.

## Frontend (Gating Default)

**Default: Next.js**

Reasoning: 
- Full-stack capable (SSR, API routes, built-in auth patterns)
- Scales from prototype to enterprise
- Boring & maintained (Vercel, wide adoption)
- If team has strong React expertise, immediate productivity

**When to pick differently:**
- Team is Vue/Svelte focused → Nuxt / SvelteKit
- Static site only → Astro
- Mobile-first → React Native / Flutter
- Lightweight preferred → Astro / Qwik

---

## Database (Gating Default)

**Default: PostgreSQL**

Reasoning:
- ACID transactions (data integrity first)
- Scales reasonably (handle 99% of cases)
- Migrations + schema versioning
- Rich query language (JSON support, window functions)

**When to pick differently:**
- NoSQL required (unstructured data) → MongoDB
- Real-time sync needed → Firebase Realtime / Firestore
- Time-series → TimescaleDB / ClickHouse
- Graph data → Neo4j

---

## Backend — Language-Specific Catalogs

When architect chooses backend language, consult the ranked list below. Pick option 1 unless team expertise or AC constraints justify otherwise.

### Python

1. **FastAPI** — async-first, fast, OpenAPI docs auto-generated, modern
2. **Django** — monolithic, batteries-included, large ecosystem
3. **Flask** — lightweight, bare minimum, legacy projects

### TypeScript / Node.js

1. **Express** — minimal, widely known, boring, scales
2. **Nest.js** — opinionated, TypeScript-first, enterprise patterns
3. **Fastify** — faster than Express, modern, smaller ecosystem

### Go

1. **Echo** — lightweight, fast, minimal boilerplate
2. **Gin** — similar to Echo, wide adoption
3. **Gorilla Mux** — standard library + router, educational

### Java

1. **Spring Boot** — default, ecosystem, widely known
2. **Quarkus** — cloud-native, GraalVM native images, newer

### Rust

1. **Axum** — modern, tokio-based, type-safe
2. **Actix** — fast, production-ready, solid
3. **Rocket** — nicer syntax, slightly slower

### PHP (if legacy/existing)

1. **Laravel** — modern, full-stack, most features
2. **Symfony** — modular, enterprise, steeper learning curve

---

## How to Use This

**Step 1:** Does codebase exist?  
→ Yes: **Reuse existing patterns** (context defaults)  
→ No: Continue to step 2

**Step 2:** Is architect confident in choice?  
→ Yes: Document reasons in contract.md  
→ No: Continue to step 3

**Step 3:** Consult this file  
→ For new codebase: use **gating defaults** (FE=Next.js, DB=Postgres)  
→ For backend: use **ranked catalog** by language

**Step 4:** Write choice + reasoning in contract.md, ADR if hard-to-reverse

---

## Updating This File

After every task close:
- Architect appends to `docs/stack-catalog.md`: "used X, learned Y"
- Quarterly: architect re-ranks if evidence justifies (e.g., "FastAPI hit scaling issue → move Django up")
- On adoption: if team adopts new framework, update ranking

This file is a starting point, not law.
