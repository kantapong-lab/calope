# Setup

1. Create `.team/<task>/` and `.team/<task>/handoff/`. `<brain>` = `<vault>/Projects/<repo-name>/`; create `project.md`, `tasks/`, `agents/<role>/` (one per agent) if missing
2. Create `<brain>/tasks/<task>.md` (frontmatter `project`, `task`, `date`, `status` + `[[agents/<role>/<task>]]` links); add the task to `project.md` → `## Tasks` as `in progress`
3. Read `project.md` (Lessons, Open issues, backlog). Resuming: read `.team/<task>/checkpoint.md` + `tasks/<task>.md` instead to find the step reached
4. **Pick the run profile** ([run-profile.md](run-profile.md)), state it to the user in one line, and create the todo list from the steps it keeps
5. Write the first `.team/<task>/checkpoint.md` ([memory-model.md](memory-model.md#checkpoint)): pin `## Goal` verbatim from the request, then the run profile
