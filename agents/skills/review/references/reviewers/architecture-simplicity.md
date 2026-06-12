# architecture-simplicity

Run for strict/deep reviews, large diffs, cross-module changes, abstraction churn, file growth, duplicated helpers, or explicit architecture review.

Use architecture vocabulary precisely:

- Module: interface plus implementation.
- Interface: everything callers must know.
- Implementation: code behind the interface.
- Seam: where behavior can change without editing callers.
- Depth: leverage at the interface.
- Locality: change/bugs/knowledge concentrated in one place.

Check:

- code-judo moves that delete complexity
- special-case branches scattered across unrelated flows
- feature logic leaking into shared paths
- wrong ownership layer or seam
- shallow wrappers with no leverage
- duplicated helpers where a canonical helper exists
- files pushed toward/over 1000 lines
- type/cast/optionality churn hiding invariants
- refactors that move complexity around but do not reduce it

Report only structural findings with a clear simplification path and concrete cost. Mark subjective tradeoffs as open questions. Do not demand an abstraction when direct code is simpler.
