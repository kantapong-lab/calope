# Token discipline

- **Prompt template** — every subagent prompt is only this, no pasted file contents (parsed shape: [prompt-envelope.schema.json](../schemas/prompt-envelope.schema.json)):
  ```
  Goal: <one line>
  Task: <task>  Brain: <brain>  [Vault: <vault> — researcher only]  [Mode: — devops only]
  Read: <paths>
  Write: <paths>
  Don't touch: <paths/scope>
  [Checkpoint: .team/<task>/checkpoint.md — from round 2 on; read only ## Goal and ## Open blockers]
  Final message: ≤ 10 lines — verdict/status, paths written, blockers. Details belong in files. End with the one-line JSON hand-off block (.claude/skills/muffy/schemas/handoff.schema.json)
  ```
- **Hand-off block**: every agent ends with one line of JSON. Save it as `.team/<task>/handoff/<step>-<role>-r<round>.json` and run `node .claude/skills/muffy/scripts/validate-handoff.mjs <file>` before acting on it. Route on the JSON (`status`, `verdict`, `blockers[].owner`), not by re-reading prose. Invalid → fallback ladder in [loops.md](loops.md)
- **Lazy loading**: read a reference only at the step that needs it — `SKILL.md` links each one to its step; `closing.md` only at step 12; `hooks-enforcement.md` only at setup; `loops.md` only when a reject/fail happens; this file and `memory-model.md` once at setup. Agents follow the "Load on demand" table in their own definition: `purpose`, `required-inputs` and `rules-and-guardrails` at start, `workflow` before acting, `output-format` before the first write, `quality-checks` before hand-off, `principles` only on judgment calls, `when-to-use` never after spawn. Don't ask an agent to "read all references"
- **Fix rounds continue the same agent** with `SendMessage` (its context is still loaded) and send only that owner's blockers/bugs as a list. Spawn fresh only if the agent is gone
- **Incremental diffs**: export each round as `diff-<n>.patch` containing only the changes since the last review
- **Read narrowly**: for gates and traceability checks, grep or read only the section needed (e.g. the `AC id →` table) instead of whole files; don't re-read a file you already checked unless it changed
- **Don't relay**: never copy one agent's output into another's prompt — give the path
- **Checkpoint instead of history**: from round 2 on, point to `checkpoint.md`; don't replay earlier rounds ([memory-model.md](memory-model.md#checkpoint))
- **Model tiers**: only `haiku` and `sonnet` are allowed — never pass `opus` or `fable`. Agent frontmatter sets the default (`docs-writer` = haiku, the rest = sonnet). When spawning fresh (not `SendMessage`), pass `model: "haiku"` for:
  - `qa-tester` re-running existing tests only (no new tests to write)
  - `frontend-dev` / `backend-dev` fix rounds where every bug names a file + line and the expected fix
  - `researcher` when the run profile asks for codebase-only / minimal research
- **Never downgrade** `code-reviewer`, `architect`, or `devops` in production mode — a miss there costs more than the tokens saved
