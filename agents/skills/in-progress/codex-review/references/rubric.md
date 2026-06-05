# Codex Review Rubric

Use this rubric to decide whether a finding is worth reporting.

## Qualifying Findings

Flag an issue when it meets the Codex bug bar:

1. Meaningfully affects accuracy, correctness, performance, security, reliability, or maintainability.
2. Is discrete and actionable, not a vague concern about the whole codebase.
3. Can be fixed with rigor appropriate to the repository.
4. Was introduced or exposed by the reviewed change.
5. Would likely be fixed by the original author if made aware.
6. Does not depend on unstated assumptions about intent.
7. Identifies the concrete affected code path, caller, environment, or input.
8. Is not merely an intentional behavior change.

If one of these cannot be satisfied, prefer not reporting.

## Non-Findings

Do not report:

- Pre-existing bugs not made worse by the change.
- Pure style preferences.
- Formatting, naming, or organization nits with no behavioral or maintainability impact.
- Theoretical risks without a plausible changed path.
- Large refactor suggestions not required to fix a concrete defect.
- Missing validation that would be far stricter than the rest of the project.
- Test gaps for trivial code or behavior already covered at the right level.

## Review Focus Areas

Check these areas first:

- Changed control flow, especially early returns and fallback branches.
- Error handling, retries, cancellation, cleanup, and partial failure behavior.
- Data migrations, persistence, serialization, rollouts, and backwards compatibility.
- Public contracts: APIs, CLI arguments, config, environment variables, protocol fields, event names.
- Authentication, authorization, secret handling, filesystem paths, shell execution, network calls, deserialization.
- Concurrency, async ordering, races, caching, and stale state.
- Performance when loops, queries, context assembly, or payload size changed.
- Tests for new user-visible behavior and regression-prone branches.

## Severity Calibration

Use `P0` only for universal breakage or release-blocking operational risk.

Use `P1` for high-impact defects likely to affect important users, data, security, compatibility, or core flows.

Use `P2` for normal actionable bugs with bounded impact or less common triggering conditions.

Use `P3` for low-risk defects that are still real and worth fixing.

Avoid inflating severity. If the issue depends on a rare configuration or unusual input, say so directly.

## Comment Construction

A strong finding includes:

- A short title with priority.
- The smallest useful file and line location.
- The changed behavior that causes the problem.
- The concrete scenario that triggers it.
- The consequence if left unfixed.

A weak finding usually contains:

- "Might", "could", or "possibly" without proof.
- No affected caller or input.
- A preference framed as a bug.
- A broad instruction like "refactor this".
- A request to add tests without naming the unprotected behavior.

## Ordering

Report all qualifying findings, ordered by severity. Do not stop at the first issue. Do not pad the review with marginal comments after real findings.

## No-Finding Result

If no finding meets the bar, state that explicitly. Include only brief residual risk, such as tests not run, large unreviewed generated output, or areas that could not be inspected.
