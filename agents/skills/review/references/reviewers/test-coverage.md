# test-coverage

Review whether important changed behavior is protected by useful tests.

Check:

- new behavior without regression tests
- bug fixes without a test that fails before the fix
- public contract changes without caller/API/CLI/config tests
- error paths, edge cases, and fallback behavior changed without coverage
- tests that assert implementation details but miss behavior
- deleted or weakened tests
- flaky async/time/order assumptions

Report only test gaps that protect meaningful behavior. Do not ask for tests around trivial getters, pure wiring, generated code, or behavior already covered nearby. Cite the changed behavior and the nearest existing test pattern to follow.
