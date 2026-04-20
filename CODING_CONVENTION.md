# Coding Convention

- Give every non-trivial function a short JSDoc block with exactly two summary lines: one description line and one `Intent:` line.
- Document every parameter with `@param`, even when the type is already obvious from TypeScript.
- Document every return value with `@returns`, including `void`, unions, and early-return cases.
- Prefer explicit names and small single-purpose functions over compact but overloaded logic.
- Keep data transformation separate from side effects so fetch, mapping, and UI concerns stay easy to test.
