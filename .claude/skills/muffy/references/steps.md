# Steps

| # | Agent | Input | Output |
|---|---|---|---|
| 1 | `researcher` | request (+ min level) | `brief.md` + level reached; `[verify]` left on a hard-to-reverse decision → send back for the next level; spikes → devops in 3d |
| 2 | `product-manager` | `brief.md` | `ac.md`, `docs/plan/<task>.md` (phases + P0/P1/P2), `docs/adr/NNNN-*.md` |
| 3 | `designer` ∥ `architect` ∥ `devops` mode 1 — one message | `ac.md`, `brief.md`, plan | `design.md`, `contract.md`, `deploy.md`; then architect aligns the contract with `deploy.md` (pinned runtime, devops-owned files) |
| 3b | Orchestrator | `.team/<task>/canvas/` | Publish the canvas on Claude Design (Artifact type "Design", `quickstart` intent `design`), put the URL in `design.md`; after `contract.md`, designer aligns fields and you republish |
| 3c | **Design gate** | `design.md` + URL | Designer's Definition of done all checked (published, every AC has an artboard, no placeholders, values from `docs/design-system/` tokens, new components documented) — else send back. **Blocks step 4** |
| 3d | `devops` mode 2 on `ops/<task>` | `deploy.md`, `contract.md` | Pass / Fail with real dependencies in one process. **Blocks step 4**; on pass, `ops/<task>` becomes the base of `fe/<task>`, `be/<task>` |
| 4 | `frontend-dev` ∥ `backend-dev` | `design.md`, `contract.md`, `ac.md`, branch | branch + summary |
| 5 | Orchestrator | — | merge into `feature/<task>`; conflict → file owner per `contract.md` rebases |
| 6 | `code-reviewer` | `diff.patch`, `ac.md`, `contract.md` | Approve / Reject |
| 7 | `qa-tester` ∥ `docs-writer` | branch / contract + approved diff | `qa-report.md` / docs + `release-notes.md` |
| 8 | `code-reviewer` | docs (+ fix diff) | Approve / Reject |
| 9 | `devops` staging | feature branch | health + smoke; no staging → near-production env per `deploy.md` |
| 10 | **Human gate** | `AskUserQuestion` with qa-report, staging result, release-notes | Approve / Reject |
| 11 | `devops` production | "Human approved" in the prompt | canary → 100% or rollback |
| 12 | Orchestrator | — | Read `references/closing.md` and follow it |
