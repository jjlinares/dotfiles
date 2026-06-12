# silent-failure

Run when the target touches error handling, fallbacks, retries, logging, cleanup, cancellation, background work, null/default handling, or catch blocks.

Check:

- swallowed exceptions that hide failed user-visible work
- fallback values that make bad state look valid
- retries without bounded failure or useful reporting
- cleanup paths skipped on error/cancellation
- logs that omit the useful context needed to debug
- broad catches that convert real failures into success
- default/null handling that masks malformed input

Report only failures with a concrete consequence. Do not require noisy logging for every expected miss. Prefer preserving existing error semantics unless the target changed them.
