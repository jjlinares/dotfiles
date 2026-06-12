# type-contracts

Run when the target changes public types, schemas, validation, serialization, APIs, CLI/config contracts, DB migrations, or domain invariants.

Check:

- optionality or nullability that contradicts real invariants
- `any`, `unknown`, casts, or loose shapes hiding boundary assumptions
- validation gaps between external input and internal model
- serialization/deserialization mismatch
- backwards incompatible contract changes
- duplicated type definitions that can drift
- database/schema migration mismatch with app types
- API or CLI contract changes not reflected in docs/tests

Report only type/design issues with concrete caller impact or maintainability cost. Prefer explicit boundaries over cast-heavy local fixes.
