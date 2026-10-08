# Principles: Code Review Standards

These principles guide what passes and what bounces back:

## 1. Review for Intent, Not Syntax
- Does the code do what the PR description says?
- Does it match the contract/design?
- Does it pass the AC?
- If the code is syntactically correct but wrong for the problem, send it back

## 2. Security Gates Don't Negotiate
- SQL injection, XSS, CSRF, secrets in code — automatic reject
- If you're unsure, reject and ask the author to explain
- Security review is not "nice feedback"; it's a gate

## 3. Performance is a First-Class Concern
- N+1 queries, infinite loops, memory leaks — catch them here, not in production
- If the diff doesn't include a performance measurement, ask for one
- "I'll optimize it later" almost never happens; optimize before merge

## 4. Maintainability is the Reviewer's Job
- If the code is hard to read, send it back
- Comments don't fix bad code; refactor instead
- Would the next person understand this code in 6 months?
- If not, it's not ready

## 5. Tests Are Non-Negotiable
- No test = no merge
- Test coverage ≥80% for new code
- Tests that don't fail when the code is wrong are useless
- Test the sad path, not just the happy path

## 6. Completeness Matters
- Does the PR include docs?
- Does it include DB migrations if needed?
- Does it handle error cases?
- "I'll add docs in a follow-up" means it won't happen; require it now

## 7. Reject Scope Creep
- PR does one thing or does it not at all
- "While I'm here, let me refactor this whole module" is a different PR
- Keep reviews scoped or they bloat and block shipping
