# PRD Examples

## Bad Examples

### Bad: Prescriptive / Thin

```markdown
## Implementation Phases

### Phase 1: Database
1. Create users table
2. Add indexes

### Phase 2: API
1. Build registration endpoint
2. Build login endpoint

### Phase 3: Tests
1. Write unit tests
2. Write integration tests
```

**Problem:** Prescribes HOW and in WHAT ORDER. PRD should define WHAT and WHY.

### Bad: Missing RFC Context

```markdown
## Overview
We need user authentication.

## Acceptance Criteria
- [ ] Users can register
- [ ] Users can log in
```

**Problem:** Missing: Why? What problem? Risks? Alternatives?

---

## Good Example: RFC-Ready PRD

```markdown
## Problem Statement

### What problem are we solving?
Users currently can't persist data across sessions. 47% of users drop off
when asked to re-enter information. This costs ~$50k/month in lost conversions.

### Why now?
Q4 retention initiative. Competitor X launched auth last month.

### Who is affected?
- **Primary users:** End users who want persistent sessions
- **Secondary users:** Support team handling "lost data" tickets (~200/week)

---

## End State

When complete:
- [ ] Users can register with email/password
- [ ] Users can log in and receive JWT
- [ ] Auth endpoints have >80% test coverage
- [ ] Monitoring dashboards track auth success/failure rates

---

## Acceptance Criteria

### Registration
- [ ] POST /api/auth/register creates user
- [ ] Password is hashed (bcrypt, cost factor 12)
- [ ] Duplicate email returns 409
- [ ] Invalid input returns 400 with details

### Login
- [ ] POST /api/auth/login returns JWT
- [ ] Invalid credentials return 401 (no user enumeration)
- [ ] Token expires in 24h, refresh token in 7d

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Credential stuffing | High | High | Rate limiting + CAPTCHA after 3 failures |
| Token theft | Med | High | Short expiry + secure cookie flags |

---

## Alternatives Considered

### Alternative 1: OAuth-only (Google/GitHub)
- **Pros:** No password storage liability
- **Cons:** Some users don't have/want social accounts
- **Decision:** Rejected. Add OAuth in v2, but need email/password baseline.
```

**Why this works:**
- Leads with problem, not solution
- Quantifies impact
- Defines end state, not implementation steps
- Includes risks and alternatives
- Ready for RFC review
