# Reviewer Roles

Give each subagent exactly one role. Keep prompts narrow. Subagents report candidates only; the parent accepts or rejects.

## Shared subagent prompt skeleton

```markdown
# Role: <role-name>

Review the pinned target checkout for this role only.

Read-only constraints:
- Do not edit files.
- Do not run formatters, tests, package installs, generators, commits, pushes, or mutation commands.
- Use read/grep/find/ls and bash for inspection only. This is best-effort; `bash` is not sandboxed.
- Use the exact git diff/log commands in `target.md` to determine what changed.
- Treat the base/head SHAs in `target.md` as the review source of truth.

Inputs:
- Review cwd: <target checkout or worktree path>
- Target manifest: <target.md path>
- Review context: <context.md path>
- Reviewer brief: <references/reviewers/<role>.md path>
- Relevant source docs: <additional paths only if needed>

Return this exact markdown shape:

## Summary
<1-3 sentences>

## Findings
- [P0|P1|P2|P3] <title> — <path>:<line>
  <concrete issue, trigger, impact, and minimal fix direction>

If none, write: `No findings.`

## Open Questions
- <question or `None`>

## Confidence
<high|medium|low> and why.
```

Require line references from changed files whenever possible. For spec/standards findings, cite the source doc or quoted requirement.

## Role briefs

Load only selected role files:

- `reviewers/correctness-regression.md` — default bug/regression reviewer.
- `reviewers/spec-compliance.md` — spec, PRD, issue, PR body compliance.
- `reviewers/standards-compliance.md` — documented project standards compliance.
- `reviewers/test-coverage.md` — behavioral test gap reviewer.
- `reviewers/silent-failure.md` — error handling and hidden failure reviewer.
- `reviewers/security-boundary.md` — concrete trust-boundary/security reviewer.
- `reviewers/type-design.md` — type, schema, contract, invariant reviewer.
- `reviewers/simplicity-architecture.md` — strict simplicity and architecture reviewer.
