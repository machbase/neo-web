# Recoil Usage

## What matters for TagAnalyzer

TagAnalyzer does not keep its chart runtime in Recoil.

It uses Recoil mainly to read and update shared app state that already belongs to the wider workspace:

- `gTables`
  Available source tables used by tag search and panel creation.

- `gRollupTableList`
  Rollup-table metadata used when fetch logic decides whether a rollup path is valid.

- `gBoardList`
  Board-owned panel storage for the current workspace.

- `gSelectedTab`
  The currently active board tab id.

That split is important:

- Recoil holds app-level board and table metadata.
- Local React state holds panel ranges, preview state, modal state, and chart interaction state.

## Why TagAnalyzer uses it

- It needs table and rollup-table metadata to build tag search and fetch requests.
- It needs board-list and selected-tab state to load, save, and switch board-owned panels.
- It should share those app-level dependencies with the rest of the workspace instead of duplicating them locally.

## What Recoil is not doing here

Recoil is not the main chart-runtime engine for TagAnalyzer.

The live panel controller, preview controller, range math, and fetch orchestration still live in local component state plus TagAnalyzer helper modules.

## Practical takeaway

If you are tracing TagAnalyzer behavior:

1. Check Recoil when the question is about shared board or table state.
2. Check local component state and TagAnalyzer helpers when the question is about chart interaction, preview behavior, or fetch timing.
