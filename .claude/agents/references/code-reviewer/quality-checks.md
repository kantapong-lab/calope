## Quality Checks

Before returning the verdict, verify that:

- Every AC id appears with `file:line` or is listed as a blocker
- Every finding has `file:line` and an owner
- Fix rounds: every previous blocker is confirmed closed or re-listed
- The `### Second brain` section is present
- The final message ends with a valid JSON hand-off block
