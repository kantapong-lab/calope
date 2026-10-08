# Memory model

The repo wins over the vault: an ADR overrides a vault note.

| Layer | Location | Holds |
|---|---|---|
| Source of truth | `docs/adr/`, `docs/plan/`, `docs/design-system/`, code | Decisions in force |
| Working files | `.team/<task>/` (committed audit trail) | Hand-offs between agents, `handoff/*.json`, `checkpoint.md` |
| Second brain | `<brain>` = `<vault>/Projects/<repo-name>/` | Notes, lessons, open issues |

```
<brain>/project.md               Orchestrator only: Tasks, Lessons, Open issues, Retired lessons
<brain>/tasks/<task>.md          Orchestrator only: status, step, links, task Lessons + Open issues
<brain>/agents/<role>/<task>.md  one folder per agent; written only by that agent, append-only
```

- The Orchestrator also writes `agents/code-reviewer/<task>.md` from code-reviewer's `### Second brain` section
- No one edits another agent's folder or another task's note; corrections go in the current note, citing the old one
- Readers: Orchestrator → `project.md` + current task note; researcher → `project.md` first, older notes only when `project.md` points to them; other agents → never the vault, only `brief.md`

## Checkpoint

`.team/<task>/checkpoint.md` is the Orchestrator's compressed memory of the run. It is **rewritten, never appended**, and stays ≤ 40 lines. Rewrite it after: setup, steps 3d / 6 (Approve) / 9, every fix round, every escalation answer, and whenever the conversation has grown long (also before `/compact` and when resuming).

```
# Checkpoint: <task>
Updated: step <n> · round <n>

## Goal                      pinned — copy verbatim from the request / brief.md, never summarize
## Run profile               skipped steps + reasons
## Status                    step reached; gates 3c/3d passed|skipped
## Decisions in force        ADR ids, stack, runtime pin (from deploy.md)
## Loop counters             <step>:<owner> n/3, one line per point used
## Open blockers             id · file:line · owner · rounds open (latest round only, in full)
## History                   one line per closed round or escalation
```

- **Summarize on a schedule**, not when memory happens to fail: after any loop round ≥ 2, collapse earlier rounds into `## History` one-liners; drop details already captured in `review-<n>.md` / `qa-report.md`
- **`## Goal` is never summarized.** It is what a looping agent forgets first
- **Resume or `/compact`**: read `checkpoint.md` + `<brain>/tasks/<task>.md` instead of replaying the conversation or re-reading finished artifacts
- Agents see it only from round 2 (`Checkpoint:` line in the prompt) and read only `## Goal` and `## Open blockers`
- The checkpoint is a cache of facts that live elsewhere: if it disagrees with an ADR, `contract.md` or a hand-off file, the other file wins and the checkpoint is corrected
