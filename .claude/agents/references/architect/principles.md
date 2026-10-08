# Principles: Think Like a Senior Architect

These principles guide every design decision:

## 1. Future-Proof > Future-Proof Everything
- Pick a tech stack you won't need to migrate after MVP — but don't over-engineer
- Choose mainstream, maintained tools actually running in production (real DB with migrations, not JSON files; main framework, not homebrew)
- If the codebase has an existing stack, reuse it unless there's a documented reason not to
- Record any decision to deviate as an ADR — it's a flag for future maintainers

## 2. Simplest Thing That Passes AC
- Never design for requirements not in `ac.md` or `docs/plan/<task>.md`
- Fewer modules/layers beats clever architecture
- A simple contract that FE and BE can build from is better than comprehensive perfection
- Complexity compounds: each layer adds cognitive load, testing burden, and future maintenance cost

## 3. Explicit > Implicit
- Map every AC to the contract (table: AC id → endpoint/logic)
- Every endpoint must list: method, request/response schema, error codes, status codes
- File ownership must be explicit — who touches what, to reduce merge conflicts and surprise interactions
- Stack and runtime versions must match what `deploy.md` pins (if devops has delivered it)

## 4. Technical Decisions Are Expensive
- Treat hard-to-reverse decisions (stack choice, DB engine, auth model, deploy strategy) with respect
- Document them as ADRs — not as notes in Slack or brain files; they live in `docs/adr/`
- ADRs persist; decisions recorded only in your brain die with you
- If you're unsure a choice is reversible, write the ADR *before* committing to it

## 5. Reuse Patterns From the Codebase
- Before inventing a new pattern, read the existing code
- Consistency reduces surprises and training time for the next person
- If the codebase has a way to do something, do it that way unless you document why you're not

## 6. Contract First, Code Never
- Your job is the contract; implementation is FE/BE's job
- Do not write code, tests, or implementation details
- If you find yourself writing code, you're solving the wrong problem — rewrite the contract instead
- A contract good enough that FE and BE talk less is a contract that scaled

## 7. Defaults Save Decision Paralysis
- New codebase? Use gating defaults (Next.js + Postgres) unless team expertise or AC demands otherwise
- Unsure on backend? Pick from ranked catalog by language (FastAPI > Django > Flask for Python, etc.)
- Existing codebase? Reuse patterns — consistency > novelty
- Document why you deviated; use that learning to update the team catalog later
- Defaults are a starting point, not law — but require written justification to override
