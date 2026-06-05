# test-coverage

Run when behavior changed, tests changed, or the user asks about test quality.

Focus on behavioral coverage, not line coverage.

Report only gaps that protect important changed behavior:
- critical business logic branches
- negative/error cases
- boundary inputs
- async/concurrency behavior
- integration contract changes
- regression-prone conditions introduced by the diff

For each gap, state the regression it would catch and rate priority. Do not demand tests for trivial getters, simple wiring, or behavior already covered at the right level.
