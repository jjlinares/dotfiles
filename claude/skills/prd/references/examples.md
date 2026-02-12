# PRD Examples

## Bad Examples

### Bad: Task-Level Phases

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

**Problem:** Phases are task lists (HOW), not deliverable slices (WHAT). Phases organized by layer (DB → API → tests) instead of by user-facing capability. No acceptance criteria.

Compare with a good phased approach — phases should define what EXISTS, not what to DO:

```markdown
## Delivery Phases

### Phase 1: Tracer Bullet — Email/Password Login
**Scope:** User can register and log in with email/password.
**Why first:** Validates auth architecture end-to-end before adding OAuth.

#### Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can log in and receive a session token
- [ ] Invalid credentials return error without leaking user existence

### Phase 2: Token Refresh & Persistence
**Scope:** Sessions survive browser close.
**Depends on:** Phase 1

#### Acceptance Criteria
- [ ] Token refreshes silently before expiry
- [ ] User stays logged in across browser restarts
```

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

## End State (Full Vision)

When all phases complete:
- [ ] Users can register with email/password
- [ ] Users can log in and receive JWT
- [ ] Sessions persist across browser restarts
- [ ] Auth endpoints have >80% test coverage
- [ ] Monitoring dashboards track auth success/failure rates

---

## Delivery Phases

### Phase 1: Tracer Bullet — Registration + Login
**Scope:** User can register and log in. Token returned on success.
**Why first:** Validates auth architecture, password hashing, and JWT flow end-to-end.

#### Acceptance Criteria
- [ ] POST /api/auth/register creates user
- [ ] Password is hashed (bcrypt, cost factor 12)
- [ ] Duplicate email returns 409
- [ ] POST /api/auth/login returns JWT
- [ ] Invalid credentials return 401 (no user enumeration)

### Phase 2: Token Lifecycle
**Scope:** Refresh tokens, expiry, persistent sessions.
**Depends on:** Phase 1

#### Acceptance Criteria
- [ ] Token expires in 24h, refresh token in 7d
- [ ] Silent refresh before expiry
- [ ] Revocation on logout

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
- Phases define WHAT exists, not HOW to build it
- Phase 1 is the thinnest slice that validates the architecture
- Each phase has its own acceptance criteria and is independently shippable
- Includes risks and alternatives
- Ready for RFC review
