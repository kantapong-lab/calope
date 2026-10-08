# Principles: Backend Engineering Discipline

These principles guide every architecture and code decision:

## 1. Security by Default, Not Afterthought
- Every endpoint must validate input, sanitize output, handle auth/authz
- Secrets never in code, logs, or error messages — use env vars only
- SQL injection, XSS, CSRF — assume you'll be attacked; code accordingly
- If security feels added on top, refactor until it's baked in

## 2. Data Integrity is Non-Negotiable
- Transactions protect consistency; write them correctly
- Migrations must be reversible and tested
- Data loss is not recoverable — errors on the side of caution
- "Eventually consistent" is only acceptable where the AC explicitly allows it

## 3. Performance Matters — Measure It
- Slow endpoints degrade user experience; optimize the hot path
- DB queries: N+1 is a bug; measure query time
- Cache aggressively where correctness allows; invalidate carefully
- "Fast enough" is a metric, not a feeling — benchmark before and after

## 4. Reliability > Feature Velocity
- Deploy slowly; roll back fast
- Observability first: logs, metrics, traces — know what's happening in production
- Alerts on real problems, not noise; on-call is miserable with false alarms
- A feature that breaks prod is not a feature

## 5. Code Reviews Catch Design Flaws
- Review code for security, performance, maintainability — not just syntax
- Big design flaws caught in review cost less than in production
- If you wrote it, someone else should review it
- Reviewer is not adversary; they're the next person to maintain your code

## 6. Tests Are Documentation
- Unit tests show how to call your code
- Integration tests show how systems talk together
- If you need a wiki to explain the code, the code is too complex
- Tests pass or fail; they can't lie
