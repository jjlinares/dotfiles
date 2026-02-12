---
name: prd
description: This skill should be used when the user asks to "create a PRD", "write a product requirements document", "plan a feature", "document requirements for X", "create an RFC", "spec out a feature", or needs structured feature planning with acceptance criteria.
---
# PRD Creation Skill

Create Product Requirements Documents suitable for RFC review by Principal Engineers, Designers, and Product Owners.

PRDs describe WHAT to build and WHY. They break delivery into thin vertical slices (tracer bullets) — each phase defines what EXISTS when done, not how to build it.

## Phase 1: Discovery

**Goal:** Understand what the user wants to document.

1. Identify the feature or problem from user's request
2. Create a todo list tracking all phases
3. Ask user for any existing context (docs, issues, sketches, conversations)

## Phase 2: Codebase Exploration

**Goal:** Build technical understanding of the feature area before asking questions.

Launch 2-3 code-explorer agents in parallel:

- "Find similar features and trace their implementation patterns"
- "Map architecture and dependencies for [feature area]"
- "Identify integration points, data models, and constraints relevant to [feature]"

After agents return, read the key files they identify. Note patterns, conventions, and constraints discovered.

## Phase 3: Clarifying Questions

**CRITICAL: DO NOT SKIP THIS PHASE.**

**Goal:** Fill knowledge gaps with 5-7 targeted questions across these domains.

**Problem & Motivation**
- What problem does this solve? Who experiences it?
- Cost of NOT solving? (user pain, revenue, tech debt)
- Why now? What triggered this work?

**Users & Stakeholders**
- Primary users? Secondary users?

**End State**
- What does "done" look like? How will users interact with it?

**Scope & Boundaries**
- What's explicitly OUT of scope?
- What's deferred to future iterations?
- Adjacent features that must NOT be affected?
- What's the thinnest slice that proves the approach works end-to-end?

**Constraints**
- Performance requirements?
- Security requirements? (auth, data sensitivity, compliance)
- Compatibility requirements? (browsers, versions, APIs)
- Accessibility requirements? (WCAG level)

**Risks & Dependencies**
- What could go wrong? Technical risks?
- External service dependencies?
- Open/contentious decisions?

**DO NOT PROCEED WITHOUT USER ANSWERS.** If user says "whatever you think is best", provide your recommendation and get explicit confirmation before continuing.

## Phase 4: PRD Generation

**Goal:** Produce the final PRD document.

1. Create folder: `.agents/features/<feature-name>/`
2. Generate PRD to: `.agents/features/<feature-name>/prd.md`
3. Use template from `assets/prd-template.md`
4. Fill all sections from clarifying answers and codebase exploration
5. Remove "(if applicable)" sections that don't apply
6. Run verification checklist (below)
7. Tell user: `PRD saved to .agents/features/<feature-name>/prd.md`

## Key Principles

**Problem Before Solution** — Lead with problem, not solution. Quantify impact of NOT solving.

**Define End State, Not Process** — Describe WHAT exists when done, not how to build it. Phases define deliverable slices, not task lists.

**Tracer Bullets Over Big Bang** — Phase 1 is the thinnest end-to-end slice that validates the architecture. Each subsequent phase expands capability. Phases are ordered by risk reduction — prove the risky parts first.

**Technical Context Enables Autonomy** — Show existing patterns to follow. Reference key files. Enable informed decisions.

**Non-Goals Prevent Scope Creep** — Explicit boundaries keep focus. Prevent building deferred features.

**Risks & Alternatives Show Rigor** — Demonstrate thought-through failure modes. Show alternatives considered and why rejected.

## Verification Checklist

Before sharing, verify:
- [ ] Problem statement clear and compelling
- [ ] Scope boundaries explicit
- [ ] Delivery phases define WHAT exists, not HOW to build it
- [ ] Phase 1 is the thinnest possible end-to-end slice
- [ ] Phases ordered by risk reduction, not task dependency
- [ ] Each phase has its own acceptance criteria
- [ ] Technical risks identified and mitigated
- [ ] User flows documented (if applicable)
- [ ] Edge cases and error states covered (if applicable)
- [ ] Accessibility requirements specified (if applicable)

## Resources

- **`assets/prd-template.md`** — PRD template to copy and fill in
- **`references/examples.md`** — Good/bad PRD examples
