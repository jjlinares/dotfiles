---
name: review
description: This skill should be used when the user asks to "review local changes", "review this PR", "review my branch", "review a commit", "review the codebase", "run review subagents", "turn review findings into plans", or wants an orchestrated multi-perspective review across correctness, security, tests, architecture, conventions, and specs.
version: 0.1.0
---

# Review

Run an orchestrated review of a target. Treat subagents as lead generators, not judges. The orchestrator resolves the target, launches narrow read-only reviewers, validates every candidate finding, rejects noise, then writes implementation plans for accepted issues.

The orchestrator's job is judgment: scope the review, choose reviewers, validate evidence, reject noise, and write plans. It does not implement fixes or delegate final judgment.

The first output adapter is **plans**. Future adapters may publish PR comments, review comments, GitHub issues, or PRs, but keep that outside the core review contract.

## Vocabulary

- **Review** — inspect a specific target and accept only issues introduced or exposed by it.
- **Audit** — inspect a codebase area without a diff; pre-existing high-leverage issues may be accepted.
- **Plan** — self-contained implementation handoff for an accepted finding.

## Core Contract

- Default to review-only. Never edit source code, even when the user says "review and fix".
- When asked to fix, complete the review, write plans for accepted findings, and recommend handing those plans to an implementation skill or executor.
- Allow writes only under `.agents/reviews/<run-id>/` for manifests, reports, adjudication notes, and plans.
- Resolve the target before launching reviewers. Never let subagents infer scope.
- Keep subagents read-only. Do not give them edit/write tools. For `bash`, allow inspection commands only: `git diff`, `git show`, `git log`, `grep`, `find`, `ls`, `pwd`.
- Treat every subagent finding as untrusted. Subagents do not vote; agreement between subagents is not evidence. Accept a finding only after independently verifying the code path, target provenance, trigger, and impact.
- For diff targets, accept only issues introduced or exposed by the target.
- For `codebase` target, accept pre-existing issues only when evidence, impact, and leverage are clear.
- Prefer fewer high-confidence findings over completeness theater.
- Write a plan for every accepted finding. If a candidate is not plan-worthy, reject it or mark it `needs-user-decision` instead of accepting it.
- Never reproduce secret values. Cite location and credential type only; recommend rotation.

## Workflow

### 1. Resolve target

Identify the exact target: `local`, `commit <ref>`, `branch [base]`, `pr [number|url]`, `since <ref>`, or `codebase`.

Use `references/target-selection.md`. Ask one short question when ambiguous.

For commit, branch, and PR reviews, prefer a pinned clean checkout/worktree. For local reviews, use the live working tree because staged, unstaged, and untracked files matter.

### 2. Create run directory

Create:

```text
.agents/reviews/<timestamp>/
  target.md
  context.md
  reports/
  findings.md
  plans/
  report.md
```

Record exact SHAs, diff/log commands, checkout path, changed files, PR/spec metadata, cleanup commands for temporary worktrees, and the selected reviewer plan.

### 3. Recon and context

Read only context needed to judge the target:

- Project instructions: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `STANDARDS.md`.
- Domain docs: `docs/context.md`, `docs/context-map.md`, local context docs.
- Decisions: `docs/adr/**` and context-specific ADRs.
- Specs: PR body, issue body, PRD, feature docs, branch-matching specs.
- Tooling: package scripts, Makefile, test/lint/type configs.
- Touched files, nearby callers, nearby tests.

Write the useful facts into `context.md`: commands, conventions, spec sources, domain terms, risks, what was intentionally skipped.

### 4. Select reviewers

Use `references/reviewer-selection.md`.

Always run `correctness-regression` unless the target is documentation-only. Add conditional reviewers for security, tests, standards, spec, silent failure, type contracts, architecture, performance, and docs/DX.

Run focused reviewers only. A reviewer with no relevant trigger creates noise.

### 5. Launch subagents

Use `references/subagent-protocol.md` and `references/orchestration.md`.

Give each subagent exactly one role, the target manifest, the context manifest, the role brief, and the output format. Require candidate findings only. Require line references and confidence. Require `No findings.` when clean.

If parallel subagents are unavailable, run the same reviewer briefs sequentially in the parent and record that no external subagents were launched.

### 6. Adjudicate

Use `references/finding-bar.md`.

For every candidate:

1. Open cited code and adjacent context.
2. Confirm target provenance using `target.md` commands.
3. Trace a concrete caller/input/state/requirement.
4. Check relevant spec, standards, ADRs, or domain docs.
5. Accept, reject, or mark `needs-user-decision`.
6. Deduplicate overlapping findings.
7. Rank accepted findings by severity, confidence, impact, effort, and leverage.

Record accepted and rejected findings in `findings.md`. Rejection reasons matter; they prevent repeated false positives.

### 7. Write implementation plans

Write one plan per accepted finding under `.agents/reviews/<run-id>/plans/` using `references/plan-template.md`.

Treat acceptance as a commitment to plan. Plans must be self-contained for a fresh executor: evidence, current behavior, target files, exact steps, tests, verification commands, non-goals, and stop conditions.

Do not let subagents write final plans. Subagents provide leads; the orchestrator writes plans from validated evidence.

### 8. Report

Final response shape:

```markdown
## Review target
- <target, base/head, checkout>

## Reviewers run
- <role>: <reported>/<accepted>

## Accepted findings
- [P1] <title> — <path:line> → <plan path>

## Plans written
- <plan path>: <one-line goal>

## Rejected findings
- <title> — <reason>

## Needs decision
- <question or None>

## Residual risk
- <tests not run, skipped areas, missing spec>

## Next action
- <recommended next step>
```

If no findings qualify, say `No actionable findings accepted.` Include residual risk.

## Modes

- `low`, `medium`, `high`, `extra-high` — subagent thinking level only. Default to the orchestrator agent's current thinking level.
- `strict` / `architecture` — include architecture-simplicity with a higher maintainability bar.
- `security`, `tests`, `performance`, `docs` — focused review plus correctness only when useful.
- `codebase` — improvement audit mode; pre-existing findings allowed when high-leverage.
- `plan-only` — skip final report detail and write plans for accepted findings.

## Resources

- `references/target-selection.md` — target resolution and run manifest rules.
- `references/reviewer-selection.md` — reviewer matrix and role triggers.
- `references/subagent-protocol.md` — prompt shape and report format.
- `references/orchestration.md` — pi/tmux launch patterns and fallback.
- `references/finding-bar.md` — acceptance, rejection, severity, adjudication.
- `references/plan-template.md` — implementation plan format.
- `references/reviewers/*.md` — role briefs loaded only when selected.
