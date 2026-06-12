# docs-dx

Run when docs, examples, setup, scripts, CLIs, config, developer workflow, or onboarding changed.

Check:

- README/setup commands that no longer work
- missing required env/config documentation
- examples that do not compile or match current APIs
- CLI flags/options documented but not implemented, or implemented but undocumented
- migration docs missing for breaking behavior
- dev scripts that write unexpected files or require unstated tools
- confusing error messages or diagnostics introduced by the target

Report only issues that would mislead users or developers. Do not nitpick phrasing. Prefer executable mismatch over style commentary.
