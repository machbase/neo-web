# Tag Analyzer Audit Preferences

Use this guide together with [AUDIT_GUIDE_FOR_AGENTS.md](/C:/_github_repos/neo-web/src/components/tagAnalyzer/AUDIT_GUIDE_FOR_AGENTS.md) when auditing Tag Analyzer code.

## Style Preferences

- Prefer declarative and functional programming style when it makes the flow clearer.
- Prefer data transformation that is explicit about inputs and outputs.
- Prefer direct composition over adding extra layers that only rename or reroute work.
- Prefer removing responsibilities from an owner over splitting one responsibility into more helper files.

## Responsibility Rule

When auditing a refactor, use this test:

- `Responsibility removed` means the original file no longer owns one category of decisions.
- `Helper added only` means code moved, but the same file still owns the same rules.

Good examples:

- A component no longer knows fetch setup and now only renders state and dispatches actions.
- A time resolver no longer performs backend calls and now only resolves range precedence.

Bad examples:

- A component still owns chart policy, validation, and save branching, but those branches now live in nearby helpers.
- A hook is extracted, but the original caller still knows the same workflow rules and just forwards more arguments.

## Hook Extraction

- Do not treat hook extraction as automatically good.
- Call it out as bad when a hook is extracted only to move a few lines out of a component without creating a real reusable boundary.
- Call it out as bad when a hook name hides a simple workflow behind vague names like `useUpdateWhenSave`, `useHandleSomething`, or `useDoWork`.
- Prefer keeping logic local when the logic belongs to one component and the extracted hook only adds navigation cost.
- Prefer extracted hooks only when they clearly own reusable stateful behavior, shared side-effect orchestration, or a real boundary that multiple callers benefit from.

## TSX Argument Types

- In TSX code, prefer inline anonymous object types for one local argument shape when the shape is small and only used once.
- Do not introduce a named object type only to hold one parameter list for one function or component.
- If the input is `value1`, `value2`, and `value3`, prefer `{ value1, value2, value3 }` directly in the function type instead of creating a separate `ValueCombine` type just for that one call shape.
- Call it out as bad when a named argument type adds indirection without reuse or clarity.
- Keep named types when they are reused, represent a real domain concept, or materially improve readability across files.

## Bad Patterns

- A hook file exists only to move component-local save/update logic into a name that is less clear than the original component code.
- A hook extraction creates files like `useUpdateWhenSave` that describe timing vaguely instead of naming a clear domain responsibility.
- A named props or argument type is created for one TSX function even though an inline object type would be shorter and clearer.
- A file introduces one-off wrapper types and one-off wrapper helpers together, making the flow more abstract instead of more explicit.
- A refactor increases file count and cross-file jumping without creating a clearer ownership boundary.
- A refactor adds helpers, but the same owner still knows fetch rules, persistence rules, and UI policy.
- A file keeps the same reasons to change after extraction, even if the line count drops.

## Good Patterns

- Component-local logic stays in the component when extraction would only create ceremony.
- Hooks are extracted only when they give a real reusable state or effect boundary.
- One-off TSX parameter shapes stay inline and explicit.
- Named types are reserved for shared concepts, reused shapes, or domain models.
- A refactor removes a whole category of knowledge from the original file.
- The caller has fewer branching decisions after the extraction than before.
