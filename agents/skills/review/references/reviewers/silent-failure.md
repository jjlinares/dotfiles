# silent-failure

Run when the diff touches error handling, fallback/default behavior, logging, retries, null/undefined handling, optional chaining, catch blocks, or swallowed results.

Check:
- empty or broad catches
- errors logged but hidden from callers/users when they should propagate
- fallback behavior that masks real failure
- missing context in logs/errors
- retries without final actionable failure
- production fallback to fake/mock/stub behavior

Report concrete hidden failures and user/debugging impact. Avoid insisting every recoverable condition must be fatal.
