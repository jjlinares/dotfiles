# type-design

Run when public types, schemas, domain models, validators, contracts, or API payloads change.

Analyze:
- invariants made explicit or hidden
- illegal states made possible
- optionality/nullability/casts/unknown/any that obscure real contracts
- construction and mutation boundaries
- compatibility of serialized or external shapes

Recommend pragmatic improvements. Prefer compile-time guarantees when they simplify code. Do not propose elaborate type machinery unless it clearly removes real risk.
