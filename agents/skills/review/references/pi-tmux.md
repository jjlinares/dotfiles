# pi + tmux Review Orchestration

Use pi as the only subagent harness. Use tmux only for parallel process management.

Keep the run directory small:

```text
.agents/reviews/<timestamp>/
├── target.md
├── context.md
├── reports/
└── report.md
```

Put durable context in `target.md` or `context.md`; put reviewer output in `reports/`.

## Run directory

```bash
run_dir=".agents/reviews/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$run_dir/reports"
touch "$run_dir/report.md"

repo="$(git rev-parse --show-toplevel)"
run_abs="$repo/$run_dir"
```

`target.md` must record the review checkout path. Use the current repo when it is the exact clean target; otherwise use a detached worktree under `/tmp/pi-review-worktrees/` and record cleanup commands so the user can decide when to run them.

```bash
review_cwd="<path recorded in target.md>"
```

## Subagent inputs

Each subagent prompt should reference:

- `$run_abs/target.md`
- `$run_abs/context.md`

Run subagents with cwd set to `$review_cwd`. Tell them to use the exact read-only git commands from `target.md` for diff/log inspection.

Include the shared skeleton from `reviewer-roles.md` and exactly one role brief from `reviewers/<role>.md`.

## Sequential launch

Good default when only one or two reviewers are needed:

```bash
role="correctness-regression"
pi -p --no-session --no-skills --no-context-files --tools read,grep,find,ls,bash <<PROMPT > "$run_abs/reports/$role.md" 2>&1
# Role: $role

Review from cwd: $review_cwd

Read these files:
- target: $run_abs/target.md
- context: $run_abs/context.md

Use only inspection commands. For bash, use commands like git diff/log/show/status, grep, find, ls, and pwd. Do not write files or mutate git state. This is best-effort because bash is not sandboxed.

<insert shared output format and reviewers/$role.md brief>
PROMPT
```

Run that command from `$review_cwd`.

## Parallel tmux launch

Use tmux for larger batches. Redirect stdout/stderr into `reports/<role>.md`.

```bash
session="review-$(date +%H%M%S)"
tmux new-session -d -s "$session" -c "$review_cwd"
tmux set-option -t "$session" remain-on-exit on

role="correctness-regression"
tmux new-window -t "$session:" -n "$role" -c "$review_cwd" "pi -p --no-session --no-skills --no-context-files --tools read,grep,find,ls,bash <<'PROMPT' > '$run_abs/reports/$role.md' 2>&1
# Role: correctness-regression

Review from cwd: $review_cwd

Read these files:
- target: $run_abs/target.md
- context: $run_abs/context.md

Use only inspection commands. For bash, use commands like git diff/log/show/status, grep, find, ls, and pwd. Do not write files or mutate git state. This is best-effort because bash is not sandboxed.

<insert shared output format and reviewers/$role.md brief>
PROMPT"
```

For multiple roles, launch one window per role. Use `tmux ls`, `tmux list-windows -t "$session"`, or attach to monitor. When all reviewer windows have exited, read `reports/*.md`.

## Safety notes

- Start reviewers only after `target.md` and `context.md` are complete.
- Do not edit code while reviewers are running.
- Never apply fixes in the review worktree; apply accepted fixes in the user's working checkout.
- Do not enable `edit` or `write` for subagents.
- Allow `bash` only for inspection commands; this is best-effort, not sandbox enforcement.
- If a report contains a launch/tool error instead of review output, retry that role or mark it not run in `report.md`.
- Rerun reviewers after fixes only for roles affected by the fixes.
- Tell the user the `/tmp/pi-review-worktrees/...` cleanup commands from `target.md`; let them decide when to run them.
