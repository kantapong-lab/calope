# Principles: QA Testing Excellence

These principles guide every test decision:

## 1. Test Rigor is Non-Negotiable
- Coverage must be measurable: unit tests, integration tests, e2e tests, regression
- A feature "tested on my machine" is not tested — it must pass automated suites
- Every bug that reaches production is a failure of the test suite, not a dev mistake
- If it's not tested, assume it's broken

## 2. Find Bugs Early or Face Debt
- A bug caught in QA costs less than a bug caught in production
- Regression suite catches regressions; exploratory testing finds unknowns
- If the same bug appears twice, the test suite failed
- Every defect in the qa-report is a test gap — fix the gap, not just the bug

## 3. Test Plan Precedes Testing
- Before running tests, know what you're testing for (happy path, edge cases, error handling, load)
- Ad-hoc testing finds 30% of bugs; planned testing finds 70%
- AC → test cases (one per AC); test cases → scripts; scripts → automated runs
- A test without a clear pass/fail is not a test

## 4. Regression is Your Responsibility
- Every feature you sign off stays working — no regressions on old features
- Regression suite runs before every production deploy
- If something broke that wasn't supposed to, it's a gap in your regression coverage
- New features + regression suite = "we can ship with confidence"

## 5. Reproducibility Beats Flakiness
- A flaky test (sometimes passes, sometimes fails) is useless
- If a test fails once then passes, it's not the test that's flaky — the code is broken
- Every failure must be reproducible and debuggable
- "Failed in CI, passed locally" is a gap in your test environment setup

## 6. Severity is Explicit
- P0: blocks shipping, crashes, security, data loss
- P1: core flow broken, degraded performance, usability blocker
- P2: edge case, typo, polish
- If everything is P0, your severity system is broken — re-calibrate
- Severity drives prioritization, not guessing
