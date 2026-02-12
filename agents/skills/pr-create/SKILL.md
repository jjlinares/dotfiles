---
name: pr-create
description: This skill should be used when the user asks to "create a PR", "open a pull request", "prepare PR description", "write a reviewer guide", "organize code review", or needs a structured PR package for a completed feature branch.
---
# PR Creation Skill

Prepare a pull request package that helps reviewers validate changes quickly and thoroughly.

## Input

Collect:
1. Branch scope or feature name
2. Target base branch
3. Any special reviewer concerns (performance, AI behavior, migrations, UX)

If using the standard feature-development workflow, treat `.agents/features/<feature-name>/` as canonical context and read:
- `.agents/features/<feature-name>/prd.md`
- `.agents/features/<feature-name>/learnings.md`

## Output Contract

Produce a PR package with these sections in this order:
1. Problem Statement
2. Outcome Summary
3. Change Areas
4. Non-goals / Deferred Scope
5. Review Order
6. How to Test
7. Evidence (optional)
8. Risk Hotspots

Keep each section concise and concrete.

Formatting requirements:
- Use section titles exactly as listed above.
- Prefer numbered lists for steps/checks.
- Under "Change Areas", group by domain and include exact file paths.
- Under "How to Test", use explicit subsections:
  - `### Command Checks`
  - `### Interactive Validation`
- Under "Evidence", use explicit subsections and omit empty ones:
  - `### In-Session Evidence`
  - `### PR Attachments`
  - `### External References` (for linked issues/docs, if relevant)
- Omit the entire "Evidence" section when no evidence exists for any subsection.
- Under "Risk Hotspots", include risk + concrete mitigation for each item.

## Process

1. If `.agents/features/<feature-name>/` exists, read `prd.md` and `learnings.md` first and align PR scope with them.
2. Summarize branch intent in 2-4 lines.
3. Group file changes into clear review domains.
4. Generate section content using repository terms and real paths.
5. Add explicit verification details in "How to Test":
- Add command checks with pass/fail status under `### Command Checks`.
- Add interactive/manual validation steps under `### Interactive Validation` when feasible.
- If interactive validation is not feasible, state that clearly in `### Interactive Validation`.
6. Highlight known deferred items and rollout risks.
7. Add "Evidence" only when there is actual evidence to report; omit empty subsections.
8. Add a final clarification checkpoint:
- Ask: `Is any section unclear or incomplete before you publish the PR?`
- If user points to a section, revise only that section and re-run the checkpoint.

## Quality Rules

- Prefer facts over narrative.
- Use exact file paths when citing implementation areas.
- Do not claim tests ran unless run in this session.
- Keep reviewer workload low: order from architectural risk to cosmetic changes.
- If migrations or manual deployment steps exist, call them out explicitly.
- Keep hierarchy explicit: use markdown subsections for grouped content in "How to Test" and "Evidence".
- Omit empty sections/subsections; do not include placeholders like "none" unless user asks for explicit empty markers.

## Additional Resources

- `references/example.md` — canonical PR output example and formatting style.
