# security-boundary

Run when the target touches trust boundaries.

Review for concrete risks:

- authentication or authorization bypass
- missing ownership/tenant/workspace checks
- unsafe shell construction or command injection
- path traversal or unsafe filesystem access
- secret/token/cookie mishandling
- credential or private data exposure in logs/errors/responses
- unsafe deserialization/parsing
- SSRF or unsafe network target handling
- upload/content-type validation problems
- privacy leaks across users, tenants, or projects

Require a changed path and a plausible attacker/control point. Do not block legitimate functionality merely because it handles sensitive APIs. Do not reproduce secret values.
