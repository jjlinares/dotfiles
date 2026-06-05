---
name: codex-review
description: This skill should be used when the user asks to "review code like Codex", "run a Codex-style review", "review this PR", "review my changes", "find bugs in this diff", "do a code review", or asks for review guidance focused on bugs, regressions, risks, and missing tests.
version: 0.1.0
---

# Codex Review

Run a Codex-style code review: prioritize concrete findings over summaries, focus on defects introduced by the change, and avoid speculative or stylistic feedback.

Use this skill for PR reviews, branch reviews, commit reviews, local diffs, or explanations of how to review code with Codex's shipped review rubric.

## Review Mindset

Start from the assumption that the author wants actionable defects, not broad commentary.

Prioritize:

- Bugs introduced by the change.
- Behavioral regressions.
- Security, data-loss, correctness, performance, and maintainability risks.
- Missing tests only when the gap protects important changed behavior.
- Broken contracts across public APIs, CLI flags, config formats, persistence, or integrations.

Avoid:

- General codebase critique not caused by the change.
- Style nits unless they obscure behavior or violate documented standards.
- Speculative issues that require unstated assumptions.
- Broad rewrites or architecture preferences without a concrete failure mode.
- Findings outside the reviewed diff unless needed to prove the changed code breaks an existing caller.

## Review Process

1. Identify the review target: uncommitted changes, branch diff, commit, PR diff, or user-specified scope.
2. Read the relevant diff first, then inspect adjacent code only to verify behavior.
3. Check project instructions and nearby conventions before judging maintainability.
4. Trace affected call paths, data shapes, error paths, and boundary conditions.
5. Validate each potential issue against the Codex finding bar in `references/rubric.md`.
6. Return findings first, ordered by severity, with exact file and line references.
7. If no findings qualify, state that no actionable findings were found and mention residual risk or unverified tests briefly.

## Finding Bar

Report a finding only when all are true:

- The issue meaningfully affects correctness, security, performance, reliability, or maintainability.
- The issue is discrete and actionable.
- The issue was introduced or exposed by this change.
- The author would likely fix it if informed.
- The issue does not rely on guessing intent.
- The affected code path or caller can be identified.
- The finding is not merely an intentional behavior change.

Prefer no findings over low-confidence noise.

## Severity

Use Codex-style priorities:

- `P0`: Blocks release, operations, or major usage universally.
- `P1`: Urgent; should be fixed in the next cycle.
- `P2`: Normal actionable defect; should be fixed eventually.
- `P3`: Low severity; useful but not blocking.

Use the lowest severity that still reflects the real impact. State conditions that make the issue appear.

## Comment Style

Write each finding as a concise reviewer comment:

- Explain why the issue is a bug.
- Mention the scenario, input, environment, or caller needed to trigger it.
- Keep the body to one short paragraph unless a tiny code fragment is required.
- Use a matter-of-fact tone.
- Avoid praise, blame, or overstatement.
- Keep the location as narrow as possible.

## Output Shape

For ordinary chat review, use:

```markdown
Findings
- [P1] Title — path/to/file.ext:123
  Explanation of the concrete defect and when it occurs.

Open Questions
- Question if any.

Residual Risk / Tests
- Brief note if no tests were run or coverage is uncertain.
```

When no findings qualify:

```markdown
No actionable findings found.

Residual risk: <briefly state unverified area or tests not run, if relevant>.
```

Do not include long summaries before findings. Keep summaries optional and secondary.

## Additional Resources

Read `references/rubric.md` when performing a serious review, calibrating severity, or deciding whether a borderline issue should be reported.
