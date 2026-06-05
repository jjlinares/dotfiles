# Review Target Selection

Resolve the target before launching reviewers. Prefer explicit user input over defaults.

For commit, branch, and PR reviews, the source of truth is a **pinned checkout plus exact git commands in `target.md`**. Local-change reviews use the live working tree.

## Run directory output

Store only:

```text
.agents/reviews/<timestamp>/
├── target.md
├── context.md
├── reports/
└── report.md
```

If the current checkout is not a clean checkout of the review target, create a git worktree under `/tmp/pi-review-worktrees` and record its path in `target.md`.

Worktree location:

```bash
repo=$(git rev-parse --show-toplevel)
repo_name=$(basename "$repo")
run_id=$(basename "$run_dir")
worktree="/tmp/pi-review-worktrees/$repo_name-$run_id"
mkdir -p /tmp/pi-review-worktrees
```

## Pinned checkout rule

For commit, branch, and PR reviews:

1. Resolve `base_sha` and `head_sha`.
2. Verify the target checkout is exactly `head_sha` and clean.
3. If not, create a detached worktree at `head_sha`.
4. Run reviewers from the target checkout/worktree.
5. Put exact diff/log commands in `target.md`.

Clean target check:

```bash
current_head=$(git rev-parse HEAD)
dirty=$(git status --porcelain)
```

Create worktree when `current_head != head_sha` or `dirty` is non-empty:

```bash
git worktree add --detach "$worktree" "$head_sha"
```

If required commits are missing locally, fetch them. If they still cannot be resolved, stop and ask.

Do not apply fixes in a review worktree. Review worktrees are read-only/disposable. Accepted fixes must be applied in the user's working checkout after confirming it is the intended branch/head.

Record cleanup commands in `target.md` and tell the user how to run them when they decide they no longer need the review worktree:

```bash
git worktree remove "$worktree" --force
git worktree prune
```

Do not rely on OS `/tmp` cleanup. If `/tmp` deletes a worktree first, tell the user to run `git worktree prune` from the main repo to remove stale records.

## Local changes

Use for "review local changes", "review uncommitted changes", or "changes since last commit" when the user means the working tree.

Local review uses the current checkout because it includes staged, unstaged, and untracked changes.

Record these commands/output in `target.md`:

```bash
git status --short
git diff --cached --stat
git diff --cached --patch --find-renames
git diff --stat
git diff --patch --find-renames
git ls-files --others --exclude-standard
```

Subagents may inspect the live working tree under the same best-effort read-only constraint.

## Last commit / specific commit

Use for "review last commit" or `review commit <ref>`.

Resolve:

```bash
head_sha=$(git rev-parse <commit>)
base_sha=$(git rev-parse <commit>^)
```

Review commands for `target.md`:

```bash
git show --stat --format=fuller <head_sha>
git show --patch --find-renames --format=fuller <head_sha>
git show --name-only --format= <head_sha>
```

Default `<commit>` to `HEAD` only when the user says last commit.

## Branch

Use for "review branch", "review since main/master", or a branch ref.

If the current branch has an open PR and the user did not explicitly ask for a branch-only diff, switch to the PR target below.

For a true branch review, use a user-specified base when provided. If no PR exists and the user did not name a base, detect the remote default branch:

```bash
default_remote=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true)
default_branch=${default_remote#origin/}
```

If `origin/HEAD` is unavailable, fall back only to an existing obvious default:

```bash
git rev-parse --verify --quiet origin/main >/dev/null && default_branch=main
git rev-parse --verify --quiet origin/master >/dev/null && default_branch=${default_branch:-master}
```

Then:

- if no default branch is found, ask for a base
- if current branch equals the default branch, ask instead of running an empty branch review
- otherwise use `origin/<default_branch>` as base

Resolve the branch comparison to SHAs:

```bash
git fetch origin --quiet
head_sha=$(git rev-parse <branch-or-HEAD>)
base_ref=<user-base-or-origin/default>
base_sha=$(git merge-base "$base_ref" "$head_sha")
```

Review commands for `target.md`:

```bash
git diff --stat <base_sha> <head_sha>
git diff --patch --find-renames <base_sha> <head_sha>
git diff --name-only <base_sha> <head_sha>
git log --oneline <base_sha>..<head_sha>
```

## PR

Use for "review PR" or "review pull request".

Fetch PR metadata and use GitHub's comparison SHAs. Do not use moving refs like `origin/<base>...HEAD` as the review definition.

Current branch PR:

```bash
gh pr view --json number,title,body,baseRefName,headRefName,url,isDraft,state,baseRefOid,headRefOid --jq .
```

Numbered PR:

```bash
gh pr view <number> --json number,title,body,baseRefName,headRefName,url,isDraft,state,baseRefOid,headRefOid --jq .
```

Resolve:

```bash
base_sha=<baseRefOid>
head_sha=<headRefOid>
```

Ensure the PR head exists locally. For GitHub PRs:

```bash
git cat-file -e "$head_sha^{commit}" 2>/dev/null || git fetch origin "pull/<number>/head:refs/pi-review/pr-<number>"
git cat-file -e "$base_sha^{commit}" 2>/dev/null || git fetch origin <baseRefName>
merge_base_sha=$(git merge-base "$base_sha" "$head_sha")
```

Review commands for `target.md`:

```bash
git diff --stat <merge_base_sha> <head_sha>
git diff --patch --find-renames <merge_base_sha> <head_sha>
git diff --name-only <merge_base_sha> <head_sha>
git log --oneline <base_sha>..<head_sha>
```

Run subagents from a clean checkout/worktree at `head_sha`.

## Since X

Use three-dot semantics by resolving the merge base:

```bash
head_sha=$(git rev-parse HEAD)
base_sha=$(git merge-base <ref> "$head_sha")
```

Review commands for `target.md`:

```bash
git diff --patch --find-renames <base_sha> <head_sha>
git log --oneline <base_sha>..<head_sha>
```

Use direct two-ref diff only when the user explicitly asks for it.

## Ambiguity rules

Ask before proceeding when:

- the user says "review" with no target and both local changes and branch commits exist
- the user says "since last commit" and it is unclear whether this means local changes or `HEAD`
- the repo has no obvious default/base branch
- the diff is empty

Use one question, for example: `Review local changes, HEAD, or branch vs origin/<default>?`
