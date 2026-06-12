# correctness-regression

Default reviewer for code changes. Focus on bugs introduced or exposed by the target.

Check:

- changed control flow, early returns, fallback branches
- async ordering, cancellation, cleanup, retries
- null/empty/default handling
- data shape changes, serialization, migrations, backwards compatibility
- public contracts: APIs, CLI flags, config, protocols, persistence
- integration breakage with existing callers
- performance regressions that cause incorrect behavior or obvious user impact

Report only concrete regressions with a trigger. Do not report style, broad maintainability, or pre-existing issues unless the target makes them newly reachable.
