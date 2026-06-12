# review

`review` is an orchestrated review skill. It reviews a target, launches focused read-only review subagents, adjudicates their findings, and writes implementation-handoff plans for accepted issues.

The skill is intentionally split into small pieces. Improve one piece at a time; do not rewrite the whole skill unless the core contract changes.

## Core idea

```text
target
→ context/recon
→ selected reviewers
→ subagent candidate findings
→ orchestrator adjudication
→ accepted findings
→ implementation plans
→ final report
```

Subagents generate leads. The orchestrator decides what is real.

## File map

```text
review/
  SKILL.md
  references/
    target-selection.md
    reviewer-selection.md
    subagent-protocol.md
    orchestration.md
    finding-bar.md
    plan-template.md
    reviewers/
      correctness-regression.md
      security-boundary.md
      test-coverage.md
      standards-conventions.md
      spec-compliance.md
      silent-failure.md
      type-contracts.md
      architecture-simplicity.md
      performance.md
      docs-dx.md
      codebase-direction.md
```

## Sections

### 1. Contract / target semantics

Lives mostly in `SKILL.md`.

Defines what the skill is allowed to do:

- review-only by default
- no source edits
- writes only review artifacts/plans
- diff targets accept only introduced/exposed issues
- codebase target can accept pre-existing high-leverage issues
- current output is plans, not PR comments/issues

Improve this only when the identity of the skill changes.

### 2. Target selection

Lives in `references/target-selection.md`.

Defines supported targets:

- `local`
- `commit <ref>`
- `branch [base]`
- `pr [number|url]`
- `since <ref>`
- `codebase`

Also defines pinned checkout/worktree rules and ambiguity handling.

Improve this when target resolution is wrong, unsafe, ambiguous, or missing a target kind.

### 3. Reviewer matrix

Lives in `references/reviewer-selection.md` and `references/reviewers/*.md`.

Defines which reviewer lenses exist and when to use them.

The orchestrator chooses reviewers by default. User-requested reviewers/focus areas override automation.

Improve this by changing one reviewer brief or one trigger rule. Do not expand the default reviewer set casually; more reviewers often means more noise.

### 4. Subagent protocol / orchestration

Lives in `references/subagent-protocol.md` and `references/orchestration.md`.

Defines how review subagents are launched, what they receive, and what output shape they return.

This section is currently deferred because orchestration should likely lean on `pi-subagents` directly instead of hand-written `pi`/`tmux` patterns.

Improve this when deciding the real runtime mechanism: `subagent(...)`, async behavior, thinking level propagation, output files, and fallback behavior.

### 5. Finding bar / adjudication

Lives in `references/finding-bar.md`.

Defines what counts as an accepted finding, what gets rejected, severity levels, and adjudication steps.

This is the anti-garbage filter. Improve this when reviews are too noisy, too timid, or accepting the wrong class of issue.

### 6. Plan template

Lives in `references/plan-template.md`.

Defines the implementation-handoff plan written for each accepted issue.

Current shape:

- `Issue`
- `Evidence`
- `Manual verification`
- `Goal`
- `Scope`
- `Implementation phases`
- `Stop conditions`
- `Review notes`

Improve this when plans are hard to execute, too verbose, not issue-like enough, or missing verification detail.

### 7. Final report

Lives in `SKILL.md` report section.

Defines the user-facing summary after review:

- target
- reviewers run
- accepted findings
- plans written
- rejected findings
- decisions needed
- residual risk
- next action

Improve this when the final response is too noisy or not actionable.

### 8. Real dry run

Not a skill file. Track in `docs/plans/review-skill.md`.

Use real review runs to find where instructions are vague, where subagents over-report, and where plans fail as handoffs.

## Maintainer rule

When improving the skill:

1. Identify which section failed.
2. Patch that file only.
3. Avoid duplicating instructions across `SKILL.md` and references.
4. Keep `SKILL.md` lean; move details into references.
5. Prefer stricter evidence requirements over more reviewer roles.

## Current known gap

Section 4 is intentionally unresolved. `pi-subagents` likely should be the primary orchestration mechanism. Do not polish the old tmux-style orchestration too much before deciding that.