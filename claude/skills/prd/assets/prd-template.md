# PRD: <Feature Name>

**Date:** <YYYY-MM-DD>

---

## Problem Statement

### What problem are we solving?
Clear description of problem. Include user impact and business impact.

### Why now?
What triggered this work? Cost of inaction?

### Who is affected?
- **Primary users:** Description
- **Secondary users:** Description

---

## Proposed Solution

### Overview
One paragraph describing what this feature does when complete.

### User Experience (if applicable)
How users interact with this feature. Include user flows for primary scenarios.

#### User Flow: <Scenario Name>
1. User does X
2. System responds with Y
3. User sees Z

### Design Considerations (if applicable)
- Visual/interaction requirements
- Accessibility requirements (WCAG level)
- Platform-specific considerations

---

## End State

When this PRD is complete:

- [ ] Capability 1 exists and works
- [ ] Capability 2 exists and works
- [ ] All acceptance criteria pass
- [ ] Tests cover new functionality
- [ ] Documentation updated
- [ ] Observability/monitoring in place

---

## Acceptance Criteria

### Feature: <Name>
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Technical Context

### Existing Patterns
- Pattern 1: `src/path/to/example.ts` - Why relevant
- Pattern 2: `src/path/to/example.ts` - Why relevant

### Key Files
- `src/relevant/file.ts` - Description of relevance

### System Dependencies
- External services/APIs
- Package requirements
- Infrastructure requirements

### Data Model Changes (if applicable)
- New entities/tables
- Schema migrations required
- Data backfill considerations

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | How to mitigate |

---

## Alternatives Considered

### Alternative 1: <Name>
- **Description:** Brief description
- **Pros:** What's good about it
- **Cons:** Why we didn't choose it
- **Decision:** Why rejected

---

## Non-Goals (v1)

Explicitly out of scope:
- Thing not building - why deferred
- Future enhancement - why deferred

---

## Interface Specifications

### CLI (if applicable)
```
command-name [args] [options]

Options:
  --flag    Description
```

### API (if applicable)
```
POST /api/endpoint
Request: { field: type }
Response: { field: type }
Errors: 4xx/5xx scenarios
```

### UI (if applicable)
Component behavior, states, error handling.

---

## Documentation Requirements

- [ ] User-facing documentation updates
- [ ] API documentation updates
- [ ] Internal runbook/playbook updates

---

## Open Questions

| Question | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Question 1 | Name | Date | Open/Resolved |

---

## Appendix

### Glossary
- **Term:** Definition

### References
- Link to related PRDs, ADRs, designs
