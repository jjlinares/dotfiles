# standards-compliance

Run when project standards exist.

Report only documented standards violations that apply to changed files. Cite the exact standard file and rule. Skip rules enforced by formatter/linter/typechecker unless the change disables or bypasses that tooling.

Examples of valid standards sources:
- `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`
- `STYLE.md`, `STANDARDS.md`, project docs
- relevant ADRs
- package-local instructions in ancestor directories
