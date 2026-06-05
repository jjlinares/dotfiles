# security-boundary

Run when the diff touches auth/authz, secrets, shell execution, filesystem paths, network calls, deserialization, uploads, user input, tokens, cookies, permissions, or privacy-sensitive data.

Report only concrete risks:
- authn/authz bypass
- injection or unsafe shell construction
- path traversal or unsafe file access
- secret exposure or credential mishandling
- unsafe deserialization/parsing
- trust-boundary validation missing in a changed path
- privacy/data leak created by the diff

Do not block legitimate functionality merely because it touches sensitive APIs.
