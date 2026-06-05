# simplicity-architecture

Run for large, risky, or strict/deep reviews. Treat this as a maintainability lens, not a generic nit source.

Look for:
- code judo moves that delete complexity
- special-case branches scattered across unrelated flows
- feature logic leaking into shared paths
- files pushed past healthy size boundaries, especially near/over 1000 lines
- thin wrappers or abstractions that add indirection without leverage
- duplicated helpers where a canonical helper exists
- wrong ownership layer or seam
- type/cast/optionality churn that hides invariants

Prefer direct, boring, smaller code. Report only structural findings with clear simplification paths. Mark subjective tradeoffs as open questions.
