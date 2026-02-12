---
name: implement
description: This skill should be used when the user asks to "implement next phase", "continue feature work", "pick up where we left off", "implement phase N", or provides a feature folder path for implementation. Takes a feature PRD with phased delivery and implements the next incomplete phase.
---
# Implement Skill

Implements the next incomplete phase from a feature PRD.

## Input

User provides a feature folder path (e.g., `.agents/features/display-tools`). The folder must contain `prd.md` with delivery phases using checkboxes (`- [ ]` / `- [x]`).

## Process

1. Read `prd.md` and `learnings.md` (if it exists)
2. Find the first phase with unchecked `- [ ]` items
3. Implement the phase — write code, modify files
4. Verify code quality using project-native commands:
	- Run linting
	- Run formatting checks (or formatter in check mode)
	- Run type checks
	- Discover commands from the repo (for example: `package.json` scripts, `Makefile`, tool config files, or documented project commands)
	- Avoid hardcoding package managers or framework-specific commands when the project defines alternatives
5. Mark completed items as `- [x]` in `prd.md`
6. Append to `learnings.md` with decisions made during this phase
7. Report what was done
8. Provide a concise completion handoff that includes:
	- What changed
	- How to review the changes effectively
	- Which checks and tests were run (with pass/fail status)
	- How to manually test the feature when interactive validation is possible (for example: run the app, open the relevant UI screen, and perform a few actions that demonstrate the new behavior)
	- What was updated in `prd.md` and `learnings.md`

## Learnings File

`learnings.md` sits alongside `prd.md`. It captures decisions that matter for future phases or review.

**Write:** Architectural choices, tradeoffs, patterns established, gotchas, deviations from plan and why.

**Don't write:** Obvious observations, file paths already in the PRD, things discoverable by reading the code.

Format:
```markdown
# Learnings

## Phase N: <name>
- Decision or insight
- Decision or insight
```

## Rules

- One phase per invocation
- Read `learnings.md` before starting — prior decisions inform current work
- Don't modify code outside the phase's scope
- If blocked, explain why and stop — don't skip to the next phase
- Always run linting, formatting, and type checks using the project's own tooling
- Prefer check/verify commands over build commands unless the PRD explicitly requires a build
- Do NOT generate migration files — note schema changes for user to push
- Do NOT commit — leave that to the user
- Include manual test steps in the handoff when feasible; if not feasible, state that clearly
- End each invocation with a brief implementation handoff: summary of changes, best review path, checks/tests run, manual test guidance (when possible), and PRD/learnings updates
