# spec-compliance

Run when a PR body, issue, PRD, task, or user-provided requirement exists.

Check:

- required behavior missing or partial
- changed behavior outside requested scope
- acceptance criteria not implemented
- edge cases named in the spec ignored
- incompatible interpretation of domain terms
- implementation that appears to satisfy the spec but fails under a concrete scenario

Cite the requirement source and the changed code. Do not invent requirements. If the spec is ambiguous, report an open question or `needs-user-decision`, not a defect.
