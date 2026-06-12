# Orchestration

Use subagents when available. Use `pi` plus `tmux` when parallelism helps. If subagents are unavailable, run the same reviewer briefs sequentially in the parent and record that fallback.

## Run directory

```bash
run_dir=".agents/reviews/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$run_dir/reports" "$run_dir/plans"
touch "$run_dir/findings.md" "$run_dir/report.md"
repo="$(git rev-parse --show-toplevel)"
run_abs="$repo/$run_dir"
```

`target.md` must record `review_cwd`. For pinned targets this may be a detached worktree. For local targets it is the current repo.

## Sequential launch

Use when one or two reviewers are selected, or when tmux is not useful.

```bash
role="correctness-regression"
(
  cd "$review_cwd"
  pi -p --no-session --no-skills --no-context-files --tools read,grep,find,ls,bash <<PROMPT > "$run_abs/reports/$role.md" 2>&1
# Role: $role

Review cwd: $review_cwd
Target manifest: $run_abs/target.md
Review context: $run_abs/context.md
Reviewer brief: <absolute-skill-dir>/references/reviewers/$role.md

Use only inspection commands. Do not edit, install, format, generate, commit, push, or mutate git state.

<insert subagent protocol output format>
<insert role brief or tell agent to read the role brief path>
PROMPT
)
```

## Parallel tmux launch

Use for independent reviewers.

```bash
session="review-$(date +%H%M%S)"
tmux new-session -d -s "$session" -c "$review_cwd"
tmux set-option -t "$session" remain-on-exit on
```

For each role:

```bash
role="security-boundary"
tmux new-window -t "$session:" -n "$role" -c "$review_cwd" "pi -p --no-session --no-skills --no-context-files --tools read,grep,find,ls,bash <<'PROMPT' > '$run_abs/reports/$role.md' 2>&1
# Role: security-boundary

Review cwd: $review_cwd
Target manifest: $run_abs/target.md
Review context: $run_abs/context.md
Reviewer brief: <absolute-skill-dir>/references/reviewers/security-boundary.md

Use only inspection commands. Do not edit, install, format, generate, commit, push, or mutate git state.

<insert subagent protocol output format>
<insert role brief or tell agent to read the role brief path>
PROMPT"
```

Monitor:

```bash
tmux list-windows -t "$session"
```

When all windows exit, read `reports/*.md`.

## Safety rules

- Start reviewers only after `target.md` and `context.md` are complete.
- Do not edit source while reviewers are running.
- Do not enable `edit` or `write` for subagents.
- Do not apply fixes in review worktrees.
- Do not auto-remove worktrees; record cleanup commands for the user.
- If a report contains tool/launch errors, retry once or mark the role `not run`.
- If a reviewer reports plans or patches instead of findings, ignore those sections and adjudicate only concrete findings.

## Parent fallback

When no subagent mechanism exists:

1. Read each selected role brief.
2. Review the target once per role, clearing assumptions between passes.
3. Save notes in the matching `reports/<role>.md` file.
4. Mark `subagent_mode: parent-fallback` in `context.md`.

Do not pretend parallel independent review occurred.
