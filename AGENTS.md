## Skill Routing
- For frontend tasks, use `$frontend-skill`

## Graphify
Knowledge graph lives in `graphify-out/`. Use it when `graphify-out/graph.json` exists and the `graphify` CLI works; otherwise fall back to normal search.

- Before the first grep/search/file read for any codebase question, run `graphify query "<question>"`. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for a single concept.
- For broad navigation use `graphify-out/wiki/index.md` if present. Read `GRAPH_REPORT.md` only for architecture review or when the commands above are not enough.
- Treat the graph as a hint, not truth: always read the actual source before modifying it. If graph and source disagree, trust the source.
- After modifying code, run `graphify update .`.
- Dirty `graphify-out/` files are expected; do not skip graphify because of them and do not flag large `graph.json` diffs as churn.
- Pass these rules to any subagent that explores code.
- `/graphify` invokes the installed graphify skill; follow it first.

# Progress
Record progress in the `project/project_progress` file
- Keep the information as concise and brief as possible; there's no need to go into detail on every point. 
- Be sure to include a brief description of what has changed, separated by a semicolon, using the Git commit formatting style. 


# Test Budget Policy

Goal: Minimize verification overhead without compromising correctness.

### Rules
1. Run only checks directly relevant to modified code.
2. Do not run full test suites by default.
3. Do not repeatedly run successful tests.
4. Do not test unchanged modules without justification.
5. Do not fix unrelated failures.
6. Avoid verbose test output.
7. Prefer static analysis over expensive integration tests when sufficient.
8. Never launch tests in continuous/watch mode.
9. Never create tests solely to increase coverage.
10. Stop verification when sufficient evidence is obtained.

### Verification Budget
- LIGHT: Maximum 1 verification command.
- STANDARD: Maximum 2 verification commands.
- DEEP: Maximum 3 verification commands.

These limits apply to the entire task, including retries.

### Failure Handling
1. If a check fails, inspect the specific error.
2. Fix only issues caused by the current changes.
3. Retry only the failed check if budget remains.
4. Do not enter repetitive test-fix-test loops.
5. Report unresolved failures instead of exhausting tokens.

### Exceptions
- Exceed the budget only with explicit user approval.
- For security-critical changes, explain any verification
  that could not be completed within the budget.

### Output Control
- Use quiet or concise output modes where available.
- Limit log output to relevant errors.
- Do not dump entire test logs into context.
- Summarize verification results briefly.

### Completion
Report:
- Checks performed.
- Passed or failed status.
- Checks skipped due to budget.
- Remaining risks.

Do not claim unexecuted tests have passed.

# Protected files

Do not modify: `project/ideas.md`, `project/prompts.md`, `project/plugins.md`, `project/help.md`, `README.md`
