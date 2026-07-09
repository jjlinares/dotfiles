---
name: implement
description: Use when the user asks to implement, build, fix, modify, or continue a concrete scoped code change; says "do it", "implement this", "pick up", "next step", or provides an issue/checklist/plan to complete.
---
# Implement Skill

Implements a pre-agreed scope of work.

## Input

The user provides a concrete scope of work. The scope may come from a user message, issue, plan, PRD, checklist, or prior conversation.

If scope is unclear, stop and ask.

## Handoff

End each invocation with a concise handoff. If the scope came from a checklist or implementation plan, mark completed steps as done before handing off.

- What changed
- How to review effectively
- Checks/tests run, with pass/fail status
- Manual test guidance when relevant
- Checklist/implementation plan steps marked done, if provided
- Blockers, risks, or follow-up work

## Engineering Constraints

Use the `tdd` skill when the change benefits from test-first work. Not every change needs TDD; skip it for trivial edits or when no useful pre-agreed seam exists.

### Simplicity First

**Minimum code that satisfies the agreed scope. Nothing speculative.**

- No features beyond the agreed behavior
- No abstractions for single-use code
- No flexibility/configuration unless required
- No defensive handling for impossible scenarios
- Prefer direct, obvious implementation over clever generality
- If the implementation is bloated, simplify before continuing

Ask: "Would a senior engineer say this is overcomplicated for the agreed scope?" If yes, simplify.

### Surgical Changes

**Touch only what the agreed scope requires. Clean up only your own mess.**

- Don't improve adjacent code, comments, or formatting
- Don't refactor unrelated code
- Match existing style, even if you'd choose differently
- If you notice unrelated dead code, mention it; don't delete it
- Remove imports, variables, functions, and tests made unused by your change
- Don't remove pre-existing dead code unless asked

Every changed line should trace directly to the agreed scope.
