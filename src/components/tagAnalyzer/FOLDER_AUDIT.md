# Folder Audit: `tagAnalyzer`

## Summary
- Date: 2026-04-22
- Direct files: `3`
- Direct subfolders: `chart`, `common`, `editor`, `modal`, `panel`, `TestData`, `utils`
- Responsibility: This folder owns the auditable production files for this area.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `TagAnalyzer.tsx` (557 lines)

## Files

### `TagAnalyzer.tsx`
- Path: `TagAnalyzer.tsx`
- Lines: 557
- Role: Renders the top-level Tag Analyzer workspace and orchestrates board state, panel persistence, loading, and editor/modal routing.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `hasPersistedTimeRangeChanged` (15 lines, line 70) - Checks whether a panel's persisted time state differs from the pending update. Needs edit: No. This function is small enough and focused enough for now.
  - `applyPendingTimeRangeUpdates` (40 lines, line 93) - Applies queued panel time updates to the current board panel list. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `TagAnalyzer` (339 lines, line 140) - Renders the TagAnalyzer workspace and wires the top-level controller state. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `buildToolbarActionHandlers` (20 lines, line 492) - Builds the toolbar action handlers for the TagAnalyzer workspace. Needs edit: No. This function is small enough and focused enough for now.
  - `buildPanelBoardActions` (32 lines, line 525) - Builds the board-level action handlers for TagAnalyzer panels. Needs edit: No. This function is small enough and focused enough for now.

### `TagAnalyzerBoard.tsx`
- Path: `TagAnalyzerBoard.tsx`
- Lines: 131
- Role: Renders the board panel list and passes normalized board context and chart actions into each board panel.
- Similar files: `panel/BoardPanel.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `TagAnalyzerBoard` (109 lines, line 20) - Renders the board panels for the TagAnalyzer workspace. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.

### `TagAnalyzerBoardToolbar.tsx`
- Path: `TagAnalyzerBoardToolbar.tsx`
- Lines: 187
- Role: Renders the board-level toolbar actions for time range, refresh, save, and overlap workflows.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `TagAnalyzerBoardToolbar` (142 lines, line 29) - Renders the board-level action toolbar for TagAnalyzer. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `formatBoardRangeText` (7 lines, line 180) - Formats the board time range into the toolbar label text. Needs edit: No. This function is small enough and focused enough for now.

