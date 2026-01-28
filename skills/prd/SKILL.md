---
name: prd
description: This skill should be used when the user asks to "create a PRD", "write a product requirements document", "plan a feature", "document requirements for X", "create an RFC", "spec out a feature", or needs structured feature planning with acceptance criteria.
---
# PRD Creation Skill

Create Product Requirements Documents suitable for RFC review by Principal Engineers, Designers, and Product Owners.

PRDs describe WHAT to build and WHY, not HOW or in WHAT ORDER.

## Workflow

1. User requests PRD for a feature
2. Ask clarifying questions to build full understanding
3. Explore codebase to understand patterns, constraints, dependencies
4. Create folder `.specs/prds/<feature-name>/`
5. Generate PRD to `.specs/prds/<feature-name>/prd.md`

## Clarifying Questions

Ask 5-7 questions across these domains:

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

**Constraints**
- Performance requirements?
- Security requirements? (auth, data sensitivity, compliance)
- Compatibility requirements? (browsers, versions, APIs)
- Accessibility requirements? (WCAG level)

**Risks & Dependencies**
- What could go wrong? Technical risks?
- External service dependencies?
- Open/contentious decisions?

## Output Format

1. Create folder: `.specs/prds/<feature-name>/`
2. Save PRD to: `.specs/prds/<feature-name>/prd.md`

Use template from `assets/prd-template.md`. Fill in all sections based on clarifying questions and codebase exploration. Remove "(if applicable)" sections that don't apply.

## Key Principles

**Problem Before Solution**
- Lead with problem, not solution
- Quantify impact of NOT solving
- Make the case for why this matters

**Define End State, Not Process**
- Describe WHAT exists when done
- Never prescribe implementation order
- Never assign priorities or create phases

**Technical Context Enables Autonomy**
- Show existing patterns to follow
- Reference key files to explore
- Enable informed implementation decisions

**Non-Goals Prevent Scope Creep**
- Explicit boundaries keep focus
- Prevent accidentally building deferred features

**Risks & Alternatives Show Rigor**
- Demonstrate thought-through failure modes
- Show alternatives considered and why rejected
- Build confidence in proposed approach

## After PRD Creation

Verify before sharing:
- [ ] Technical risks identified and mitigated
- [ ] User flows documented (if applicable)
- [ ] Edge cases and error states covered (if applicable)
- [ ] Accessibility requirements specified (if applicable)
- [ ] Problem statement clear and compelling
- [ ] Scope boundaries explicit

Tell user: `PRD saved to .specs/prds/<feature-name>/prd.md`

## Resources

- **`assets/prd-template.md`** - PRD template to copy and fill in
- **`references/examples.md`** - Good/bad PRD examples
