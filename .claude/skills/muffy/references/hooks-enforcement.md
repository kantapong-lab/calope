# Hooks Enforcement for Team Flow

Critical rules enforced automatically in `.claude/settings.local.json`:

## 1. Before Merge — Only Orchestrator
**Rule:** Only Orchestrator merges, saves reviews as `review-<n>.md`
```json
"before_merge": {
  "command": "echo '[team-flow] Is this the Orchestrator session? Non-Orchestrator cannot merge.' && exit 1"
}
```

## 2. Before Commit — Review/QA Artifact Required
**Rule:** Code changes must be committed with `review-N.md` or `qa-report.md`
```json
"before_commit": {
  "command": "git diff --cached --name-only | grep -E '\\.(ts|tsx|js|jsx|py)$' && (git diff --cached --name-only | grep -qE '(review-|qa-report)' || (echo '[team-flow] Code changes require review-N.md or qa-report.md' && exit 1)) || exit 0"
}
```

## 3. Before Push — Feature Branch Only
**Rule:** Cannot push directly to `main`, `production`, or `prod`
```json
"before_push": {
  "command": "BRANCH=$(git rev-parse --abbrev-ref HEAD); case \"$BRANCH\" in main|master|production|prod) echo '[team-flow] Push only to feature/<task> — Orchestrator merges.' && exit 1;; esac"
}
```

## 4. Before Merge — No Temporary Stack
**Rule:** Contract cannot contain "temporary", "prototype", "in-memory" without architect review
```json
"before_merge": {
  "command": "grep -q 'temporary\\|prototype\\|in-memory' .team/*/contract.md 2>/dev/null && (echo '[team-flow] Temporary stack in contract. Architect must update deploy.md first.' && exit 1) || exit 0"
}
```

## Setup

1. Copy template to settings: `cp team-flow-settings-template.json .claude/settings.local.json`
2. Edit `.claude/settings.local.json` and add the "hooks" block above
3. Hooks run automatically on every commit, merge, push

**Bypass only with Orchestrator approval:**
```bash
git commit --no-verify  # Skip commit check
git push --force        # Force to main (after Human gate approval)
```

All five rules are **non-negotiable**.
