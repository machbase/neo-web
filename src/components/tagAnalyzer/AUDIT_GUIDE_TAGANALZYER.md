# Tag Analyzer Audit Preferences

Use this guide together with [AUDIT_GUIDE_FOR_AGENTS.md](/C:/_github_repos/neo-web/src/components/tagAnalyzer/AUDIT_GUIDE_FOR_AGENTS.md) when auditing Tag Analyzer code.

## Style Preferences

- Prefer declarative and functional programming style when it makes the flow clearer.
- Prefer data transformation that is explicit about inputs and outputs.
- Prefer direct composition over adding extra layers that only rename or reroute work.

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

## Good Patterns

- Component-local logic stays in the component when extraction would only create ceremony.
- Hooks are extracted only when they give a real reusable state or effect boundary.
- One-off TSX parameter shapes stay inline and explicit.
- Named types are reserved for shared concepts, reused shapes, or domain models.
