---
name: implement
description: Use when the user asks to "implement next phase", "continue feature work", "pick up where we left off", "implement phase N", or provides a feature folder path for implementation. Takes a feature PRD with phased delivery and implements the next incomplete phase.
---
# Implement Skill

Implements the next incomplete phase from a feature PRD.

## Input

User provides a feature folder path (e.g., `.agents/features/display-tools`). The folder must contain `prd.md` with delivery phases using checkboxes (`- [ ]` / `- [x]`).

## Process

1. Read `prd.md` and `learnings.md` (if it exists)
2. Find the first phase with unchecked `- [ ]` items
3. Implement the phase — write code, modify files
4. Verify with `pnpm check`
5. Mark completed items as `- [x]` in `prd.md`
6. Append to `learnings.md` with decisions made during this phase
7. Report what was done

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
- Verify with `pnpm check` (not `pnpm build`)
- Do NOT generate migration files — note schema changes for user to push
- Do NOT commit — leave that to the user
