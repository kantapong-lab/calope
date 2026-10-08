# Loops

- **Review reject** → owners fix → re-merge → reviewer checks only the new diff → until Approve
- **QA fail** → owner fixes → reviewer checks the fix diff → QA runs the full regression suite
- **Smoke fail (3d)** → architect changes stack + ADR → smoke again; FE/BE wait
- **Staging fail** → logs to the relevant dev → back to step 6
- **Human reject** → reasons to the relevant agents → redo review + QA
- **Production health fail** → devops rolls back; report to the user before anything else
- More than 3 loops at one point → stop and ask the user (see Fallback ladder)

## Loop budget

- A **loop point** is `<step>:<owner>`, e.g. `6:code-reviewer`, `7:qa-tester`, `3d:devops`. Count rejections per point in `.team/<task>/checkpoint.md` → `## Loop counters`
- 3 fix loops are allowed per point; the **4th rejection stops the flow**. Nothing raises the limit except the user's answer to an escalation
- Blockers keep a stable id (`B-1`, `B-2`…) across rounds. A fix round that closes a blocker drops it; one that doesn't re-lists it under the **same id**. Without stable ids the repeat check below cannot work

## Fallback ladder

Apply in order. Each rung applies to one loop point; the validator is `node .claude/skills/muffy/scripts/validate-handoff.mjs <file>`.

1. **Invalid or missing hand-off block** (validator fails, or no JSON block) → `SendMessage` the same agent with the validator's error lines, once. Invalid again → escalate `invalid-handoff`
2. **Agent reports `quality_checks.passed: false`** → `SendMessage` the failed items back, once. Fails again → escalate `quality-check-failed-twice`
3. **Same blocker id open in 3 consecutive rejects** (the owner has already failed two fix attempts at it) → escalate `repeated-blocker` right away instead of spending the 4th-rejection budget. One failed fix is normal and not an escalation. Default recommendation: `change-approach` (often the contract or AC is wrong → architect/PM decides)
4. **Fourth rejection at a point** → escalate `loop-limit`
5. **Agent unreachable** (`SendMessage` fails, agent gone) → spawn once fresh with `Checkpoint:` + the path of its last hand-off. Fails again → escalate `agent-unavailable`
6. **Human gate rejected** twice for the same reason → escalate `human-reject-limit`

A reject that is not repeated and is under the limit is handled by the loop bullets above, not by this ladder.

## Escalation

1. Write `.team/<task>/escalation-<n>.json` ([schema](../schemas/escalation.schema.json)): trigger, loops used, owner, open blockers with rounds open, one line per attempt, a recommendation, 2–4 options
2. Validate it: `node .claude/skills/muffy/scripts/validate-handoff.mjs <file> escalation`
3. Ask the user with `AskUserQuestion` (≤10 lines of context, recommended option first). Options, as relevant:
   - `extend-loops` — +2 loops at this point, asked again if it runs out
   - `change-approach` — send the root cause to the right owner (architect/PM/designer), then restart the point's counter
   - `reduce-scope` — move the failing AC to the backlog in `docs/plan/<task>.md`, update `ac.md`, re-run traceability
   - `fix-manually` — pause; the user edits, then resume at the same step
   - `abort-task` — close per [closing.md](closing.md) with status `aborted`; lessons still get promoted
4. Record the answer in `checkpoint.md` and `<brain>/tasks/<task>.md` → `## Lessons`. Never continue silently, never merge or deploy past an unresolved escalation

## Context checkpoints in loops

Long loops lose the original goal. After every fix round and at steps 3d, 6 (on Approve) and 9, rewrite `.team/<task>/checkpoint.md` per [memory-model.md](memory-model.md#checkpoint). From round 2 on, every prompt carries `Checkpoint: <path>` and the owner reads only its `## Goal` and `## Open blockers` sections. Keep only the latest round's blockers in full; older rounds shrink to one `## History` line each.
