# Finding Bar

Use this bar when deciding whether to accept, reject, or defer subagent findings.

## Accept a finding only when all are true

- Introduced or exposed by the reviewed change.
- Meaningfully affects correctness, security, reliability, performance, maintainability, test confidence, or documented requirements.
- Discrete and actionable.
- Has an identifiable code path, caller, input, environment, or requirement.
- Does not depend on guessing the author's intent.
- Would likely be fixed by a senior author if informed.
- Can be fixed without a larger speculative rewrite, unless the user requested strict architecture review.

Prefer rejecting a low-confidence finding over padding the review.

## Reject by default

Reject findings that are:

- Pre-existing and not worsened by the change.
- Pure style preferences.
- Linter/formatter/typechecker output that tooling should catch.
- Broad rewrites without a concrete failure mode.
- Speculative edge cases with no plausible changed path.
- Missing tests for trivial behavior or already-covered behavior.
- Security concerns with no concrete trust-boundary risk.
- Architecture opinions that make the code more complex than the problem.
- Intentional behavior changes reflected in the spec/PR body.

## Severity

Use the lowest severity that honestly fits.

- `P0`: blocks release or breaks major usage universally.
- `P1`: urgent; likely affects important users, data, security, compatibility, or core flows.
- `P2`: normal actionable defect with bounded impact or less common trigger.
- `P3`: low severity but real and worth fixing.

For non-bug lenses, map severity to action:

- `P1`: should fix before merge.
- `P2`: should fix unless consciously waived.
- `P3`: optional cleanup or follow-up.

## Accepted finding shape

A good accepted finding includes:

- Priority and short title.
- Smallest useful file:line location.
- Changed behavior that causes the issue.
- Concrete scenario that triggers it.
- Consequence if unfixed.
- Minimal fix direction.

Example:

```markdown
- [P1] Missing permission check for imported projects — src/projects/import.ts:87
  The new import path calls `createProject` before verifying workspace membership, so a user with a valid import token can create projects in a workspace they do not belong to. Move the membership check before project creation and keep the existing error response.
```

## Rejection reasons

Record one concise reason when rejecting:

- `pre-existing`
- `not introduced by target`
- `speculative/no trigger`
- `intentional behavior`
- `tooling-owned`
- `style preference`
- `over-broad rewrite`
- `already covered by tests`
- `not worth complexity`
- `needs product decision`

## Parent adjudication checklist

For each subagent finding:

1. Read cited location and nearby code.
2. Check the exact diff command in `target.md` to confirm provenance.
3. Trace at least one caller or execution path when needed.
4. Check project docs/spec only for rules relevant to the changed file.
5. Decide accepted/rejected/needs-user-decision.
6. If accepted, describe the smallest safe fix.
7. If fixing, avoid broad refactors unless the finding itself is structural and accepted.

## No-finding result

When no findings are accepted, report:

```markdown
No actionable findings accepted.

Residual risk: <tests not run, generated files not deeply inspected, missing spec, or other real limitation>.
```
