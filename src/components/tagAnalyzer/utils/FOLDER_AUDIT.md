# Folder Audit: `utils`

## Summary
- Date: 2026-04-22
- Direct files: `3`
- Direct subfolders: `utils/fetch`, `utils/legacy`, `utils/persistence`, `utils/series`, `utils/time`
- Responsibility: This folder owns shared Tag Analyzer types plus older utils audit documents.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `utils/panelRuntimeTypes.ts` (128 lines)
- Helper hotspot: none

## Files

### `boardTypes.ts`
- Path: `utils/boardTypes.ts`
- Lines: 95
- Role: Defines board-level state, actions, and payload types used across the Tag Analyzer workspace.
- Similar files: `utils/panelModelTypes.ts`, `utils/panelRuntimeTypes.ts`
- Combine note: Keep separate while each type file clearly belongs to a different boundary; combine only if the same fields start repeating.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `panelModelTypes.ts`
- Path: `utils/panelModelTypes.ts`
- Lines: 77
- Role: Defines the normalized panel model used by the UI, editor, chart layer, and persistence layer.
- Similar files: `utils/boardTypes.ts`, `utils/panelRuntimeTypes.ts`
- Combine note: Keep separate while each type file clearly belongs to a different boundary; combine only if the same fields start repeating.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `panelRuntimeTypes.ts`
- Path: `utils/panelRuntimeTypes.ts`
- Lines: 128
- Role: Defines runtime-only panel chart handles, range events, and navigate-state types.
- Similar files: `utils/boardTypes.ts`, `utils/panelModelTypes.ts`
- Combine note: Keep separate while each type file clearly belongs to a different boundary; combine only if the same fields start repeating.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

