---
name: muffy
description: >
  Run a hub-and-spoke software development subagent team (main session = Orchestrator)
  from research to deploy. Use when building a feature end to end with parallel agents.
  Do not use for small fixes, single-file changes, or sequential iteration.
---

# Muffy — Feature Development Team

## Purpose

Orchestrate the subagents in `.claude/agents/` from research to deploy for one feature. The main session is the **Orchestrator**. Subagents never talk to each other — everything goes through the Orchestrator, and work is handed off as files in `.team/<task>/`.

## Inputs

- Feature request (+ minimum research level, if specified)
- `<task>` name (kebab-case)
- `<vault>`: env `SECOND_BRAIN_VAULT` (set in `.claude/settings.local.json`; ask with `AskUserQuestion` if missing)

## Workflow

Load lazily: open each reference only at the step that needs it, never all up front. Subagents do the same via the "Load on demand" table in their own definitions.

1. **Setup** — create working folders and task note: [references/setup.md](references/setup.md)
2. **Run profile** — pick which steps to skip, never skip review/QA/staging/Human gate: [references/run-profile.md](references/run-profile.md)
3. **Steps 1–12** — agent, input and output per step: [references/steps.md](references/steps.md)
4. **Loops** — read only when a reject/fail happens: fix loops (max 3), fallback ladder, escalation: [references/loops.md](references/loops.md)
5. **Token discipline** — read once at setup: prompt template, hand-off block, fix rounds, diffs: [references/token-discipline.md](references/token-discipline.md)
6. **Memory model** — read once at setup: repo vs `.team/` vs vault layout, `checkpoint.md`: [references/memory-model.md](references/memory-model.md)
7. **Closing** — step 12 only: final checks and message to the user: [references/closing.md](references/closing.md)

## Output Format

- `.team/<task>/`: `brief.md`, `ac.md`, `design.md`, `contract.md`, `deploy.md`, `review-<n>.md`, `qa-report.md`, `release-notes.md`, `checkpoint.md`, `handoff/<step>-<role>-r<round>.json`, `escalation-<n>.json` (only if a loop was cut off)
- Repo: `docs/plan/<task>.md`, `docs/adr/NNNN-*.md`, `docs/design-system/` (if changed), merged `feature/<task>`
- Vault: `tasks/<task>.md`, consolidated `project.md`
- Final message to the user: see `references/closing.md` step 5

## Rules and Guardrails

Critical rules — enforce with hooks: [references/hooks-enforcement.md](references/hooks-enforcement.md)

- Every agent ends with a JSON hand-off block; validate it ([schemas/](schemas/handoff.schema.json), `scripts/validate-handoff.mjs`) before acting on it; invalid twice → escalate, never guess
- A loop point that is rejected 4 times, or keeps the same blocker id open for 3 consecutive rejects, stops and asks the user: [references/loops.md](references/loops.md)
- Only the Orchestrator merges branches and saves reviews as `review-<n>.md`
- Run only the phases the plan marks for this run
- FE/BE report a temporary stack → stop, send to architect (+ ADR) before coding continues
- An agent writes outside its vault folder → revert it and resend its rule; an agent can't find `<brain>` → `AskUserQuestion`
- Never deploy to production without passing the Human gate

## Quality Checks

Verify after every step: [references/quality-checks.md](references/quality-checks.md)

---

**Not for:** small fixes, single-file edits, research-only or review-only requests, step-by-step iteration in main session
