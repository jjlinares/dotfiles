# standards-conventions

Review documented project standards and strong local conventions.

Sources may include `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `STANDARDS.md`, `docs/adr/**`, nearby code, and context docs.

Check:

- explicit rules violated by the target
- ADR decisions contradicted without justification
- domain language drift from `context.md`
- wrong ownership layer or package according to project docs
- local convention mismatch that affects maintainability
- setup/build/test command changes that contradict docs

Skip anything formatter/linter/typechecker already owns unless the change bypasses tooling. Cite the standard source and the changed code. Distinguish hard violations from judgment calls.
