---
name: review
description: This skill should be used when the user asks to "review this PR", "review my branch", "review last commit", "review local changes", "review since X", "run review agents", "do a code review", "review and fix", or wants a parent agent to orchestrate specialized review subagents and decide which findings to accept.
version: 0.1.0
---

# Review

Run a parent-orchestrated code review for a PR, branch, commit, or local changes. Treat subagents as advisory reviewers. The parent agent owns target selection, reviewer selection, finding validation, user reporting, and any follow-up edits.

Use pi only. Launch review subagents with `pi` in `tmux` when parallelism helps. Do not support Codex, Claude Code, or other harness-specific flows.

## Core Contract

- Default to review-only. Edit only when the user explicitly asks to fix accepted findings.
- Resolve the review target before launching subagents. Do not let subagents infer scope.
- Keep subagents best-effort read-only: no `edit`, `write`, formatters, package installs, generators, commits, pushes, or mutation commands. `bash` is not sandboxed, so enforce this through allowed tools plus explicit prompts.
- Treat every subagent report as untrusted. Validate each finding against the real code path before surfacing it as accepted.
- Reject speculative, pre-existing, lint-only, stylistic, or overcomplicated suggestions.
- Prefer fewer high-conviction findings over noisy completeness.
- If fixes are made, run focused tests/checks and rerun only relevant reviewers.

## Process

### 1. Resolve target

Identify exactly what is being reviewed. If ambiguous, ask one short question.

Use `references/target-selection.md` for commands.

Common targets:

- `local`: staged, unstaged, and untracked changes relative to `HEAD`.
- `commit`: one commit, usually `HEAD` for "last commit".
- `branch`: merge-base diff, usually the PR base or `origin/<default-branch>...HEAD`.
- `pr`: current branch's open GitHub PR, using its actual base.
- `since X`: `git diff X...HEAD` unless user explicitly requests two-dot.

### 2. Create a review run directory

Create `.agents/reviews/<timestamp>/` and store only:

- `target.md` — target, exact base/head SHAs, review checkout/worktree path, diff/log commands, commit list, PR metadata, changed files, and PR/spec body if available.
- `context.md` — discovered standards/spec/test commands and selected reviewer plan.
- `reports/<role>.md` — subagent outputs.
- `report.md` — parent accepted/rejected findings and fix status.

For commit, branch, and PR reviews, subagents inspect a clean checkout pinned to the target head and run exact read-only git diff commands from `target.md`. If the current checkout is not the exact clean target, create a detached git worktree under `/tmp/pi-review-worktrees/` and record it in `target.md` with cleanup commands so the user can decide when to run them.

### 3. Discover context

Gather only context needed for the target:

- Project instructions: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `STANDARDS.md`.
- Architecture/product docs: `context.md`, `docs/adr/`, `.agents/features/**/prd.md`, specs matching branch/issue names.
- Tooling signals: package scripts, Makefile, lint/type/test configs. Do not re-check what tooling obviously owns.
- PR/issue body when available.

If no spec exists, skip the spec reviewer and state that spec compliance was not reviewed.

### 4. Select reviewers

Load `references/reviewer-roles.md` to select reviewers, then load only the selected `references/reviewers/<role>.md` files.

Always run:

- `correctness-regression`

Conditionally run:

- `spec-compliance` when a spec, PRD, issue, or PR body exists.
- `standards-compliance` when project standards are found.
- `test-coverage` when behavior changed or tests were added/modified.
- `silent-failure` when error handling, fallback logic, retries, logging, null/default handling, or catch blocks changed.
- `security-boundary` when auth, permissions, secrets, shell, filesystem, network, deserialization, user input, or path handling changed.
- `type-design` when public types, schemas, contracts, domain models, or validation boundaries changed.
- `simplicity-architecture` when the diff is large, structurally complex, crosses ownership seams, grows large files, or the user asks for strict/deep review.

Default batching:

1. Batch 1: correctness, security if relevant, spec if available.
2. Batch 2: standards, tests, silent-failure, type-design as relevant.
3. Batch 3: simplicity-architecture only for strict/deep/large-risk review, or after correctness is clean.

Run independent reviewers in parallel. Run later batches only when their output can change decisions.

### 5. Launch pi subagents

Use `references/pi-tmux.md` for exact launch patterns. Run each subagent from the review checkout/worktree. Provide:

- `target.md` path
- `context.md` path
- selected `references/reviewers/<role>.md` brief
- output format
- best-effort read-only constraint

Pass the prompt inline or through stdin. Enable only read-only tools plus `bash` for inspection commands such as `git diff`, `git log`, `git show`, `grep`, and `find`; never enable write/edit tools. Treat this as best-effort because `bash` can mutate if misused.

### 6. Adjudicate findings

Load `references/finding-bar.md`. For each reported issue:

1. Read the cited diff hunk with the exact commands in `target.md`, then inspect adjacent code in the review checkout.
2. Confirm the issue was introduced or exposed by the target change.
3. Identify the concrete caller/input/state that triggers it.
4. Decide: `accepted`, `rejected`, or `needs-user-decision`.
5. Record a one-line reason, especially for rejections.

Do not surface raw subagent output as final truth. The final review is the parent decision.

### 7. Report to user

Use this shape:

```markdown
## Review target
- <target and base/ref>

## Accepted findings
- [P1] Title — path:line
  Why it matters. Suggested fix.

## Rejected findings
- Title — rejected because <reason>.

## Needs user decision
- Question/tradeoff if any.

## Reviewers run
- correctness-regression: N reported, M accepted
- ...

## Next action
- Recommended action, or "No changes needed."
```

If no accepted findings exist, say `No actionable findings accepted.` Include residual risk briefly.

### 8. Fix loop, only when requested

When the user asks to fix:

1. Never apply fixes in the review worktree. Treat review worktrees as read-only/disposable.
2. Apply accepted fixes in the user's working checkout.
3. Before editing, verify the user's checkout is the reviewed branch/head or ask for confirmation if it drifted.
4. Fix accepted findings only.
5. Keep edits surgical and at the right ownership boundary.
6. Run focused tests/checks in the user's checkout.
7. Rerun only reviewers relevant to changed areas against the new HEAD/local diff. Create a new review run or update `target.md` to the new target.
8. Repeat until no accepted actionable findings remain or a user decision is needed.
9. Final report: edits made, tests/checks run, rerun result, remaining rejected/waived findings.

## Additional Resources

- `references/target-selection.md` — target commands for local, commit, branch, PR, and since-X review.
- `references/reviewer-roles.md` — shared prompt skeleton and reviewer index.
- `references/reviewers/*.md` — one reviewer brief per file.
- `references/finding-bar.md` — acceptance bar, severities, rejection reasons.
- `references/pi-tmux.md` — pi + tmux orchestration pattern.
