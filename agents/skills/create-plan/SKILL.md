---
name: create-plan
description: This skill should be used when the user asks to "create a plan", "write a plan file", "make an implementation plan", "draft phases", "plan this work", or wants a docs/ plan with goals, verifiable phases, open questions, and future decisions.
version: 0.1.0
---

# Create Plan

Create concise implementation plans that separate intent, execution, and unresolved decisions.

## Required Plan Shape

Use exactly these top-level sections unless the user explicitly asks otherwise:

1. `Goal`
2. `Phases`
3. `Open questions and future decisions`

Write plan files under `docs/plans/` unless the user gives another path.

## Workflow

Start by identifying what is already decided. Do not put decided items in future decisions. Treat user corrections as decisions and update the plan accordingly.

Before writing, resolve obvious contradictions:

- If a technology choice is settled, state it in `Goal` or the relevant phase, not in future decisions.
- If a phase depends on an undecided choice, name that choice in `Open questions and future decisions`.
- If implementation scope is local-dev only, do not imply production deployment in the goal.
- If production deployment is later, keep it as a future decision or later phase.

## Section Guidance

### Goal

State the intent of the current implementation, not every possible future feature.

Include:

- What this plan is trying to prove or build now.
- Key constraints already decided.
- Explicit non-goals when confusion is likely.
- Chosen architecture or technology when already decided.

Avoid:

- Background dumps.
- Future optional work.
- Re-litigating decisions the user already made.

### Phases

Make phases small enough for the user to verify manually.

Each phase should include:

- Short phase title.
- One-sentence purpose.
- `Tasks:` bullet list.
- `Verification:` bullet list.

Use `Verification`, not vague exit criteria, when the user wants to personally verify progress.

Good phase pattern:

```markdown
### Phase 1 — local service spike

Prove the local service can receive input and return useful output.

Tasks:

- Start a local server.
- Accept the minimal message shape.
- Log useful diagnostics.

Verification:

- Run the server locally.
- Send a sample message.
- See the expected response in logs or UI.
```

Phase rules:

- Order phases by dependency, not by ideal architecture.
- Keep the first phase as a narrow proof.
- Do not hide risky work in broad phases like "integration".
- Include failure/cleanup lifecycle before persistence when relevant.
- Put persistence after live behavior unless persistence is the central goal.
- Put summaries/reporting after source data capture unless summary is the central goal.

### Open questions and future decisions

List only unresolved items or decisions intentionally deferred.

Include:

- Choices blocked by implementation evidence.
- Production concerns not needed for local validation.
- Performance, cost, scaling, auth, deployment, or ownership decisions deferred until after the spike.

Do not include:

- Decisions already made by the user.
- Restatements of the selected technology.
- Generic risks with no decision attached.
- Questions answered in the `Goal` or `Phases` sections.

Phrase future decisions as concrete decision points:

```markdown
- Transport format: base64 JSON is the spike default; switch to binary frames only if bandwidth or CPU becomes a problem.
```

Not:

```markdown
- Need to think about transport.
```

## Editing Existing Plans

When revising a plan:

- Preserve the three-section shape.
- Remove stale assumptions immediately.
- Move decided future items into `Goal` or `Phases`.
- Keep wording direct and current.
- Avoid expanding scope while cleaning up.

## Style

Use concise, concrete bullets. Prefer implementation language over strategy language. Avoid praise, filler, and generic project-management boilerplate.
