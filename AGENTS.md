## Graphify
Knowledge graph lives in `graphify-out/`. Use it when `graphify-out/graph.json` exists and the `graphify` CLI works; otherwise fall back to normal search.

- Before the first grep/search/file read for any codebase question, run `graphify query "<question>"`. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for a single concept.
- For broad navigation use `graphify-out/wiki/index.md` if present. Read `GRAPH_REPORT.md` only for architecture review or when the commands above are not enough.
- Treat the graph as a hint, not truth: always read the actual source before modifying it. If graph and source disagree, trust the source.
- After modifying code, run `graphify update .`.
- Dirty `graphify-out/` files are expected; do not skip graphify because of them and do not flag large `graph.json` diffs as churn.
- Pass these rules to any subagent that explores code.
- `/graphify` invokes the installed graphify skill; follow it first.

## Progress
Record progress in the `project/project_progress` file
- Keep the information as concise and brief as possible; there's no need to go into detail on every point. 

## Testing
- Add new tests only if you truly believe it is necessary.
- Adding new tests unnecessarily is strictly prohibited.


## Protected files

Do not modify: `project/ideas.md`, `project/prompts.md`, `project/plugins.md`, `project/help.md`, `README.md`
