# Folder Audit: `panel`

## Summary
- Date: 2026-04-22
- Direct files: `4`
- Direct subfolders: none
- Responsibility: This folder owns the auditable production files for this area.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `panel/BoardPanel.tsx` (710 lines)
- Helper hotspot: `panel/BoardPanel.tsx` (17 named functions)

## Files

### `BoardPanel.tsx`
- Path: `panel/BoardPanel.tsx`
- Lines: 710
- Role: Renders one board panel and coordinates panel chart loading, raw/highlight modes, context-menu state, and panel-level actions.
- Similar files: `TagAnalyzerBoard.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `hasLoadedPanelChartData` (3 lines, line 87) - Returns whether the panel has already resolved a chart range option. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `BoardPanel` (576 lines, line 99) - Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `makeResetParams` (9 lines, line 157) - Builds the reset and initialization inputs shared by the panel time-range helpers. Needs edit: No. This function is small enough and focused enough for now.
  - `handlePanelRangeApplied` (18 lines, line 174) - Persists the applied panel range through the board lane after the shared runtime controller finishes loading. Needs edit: No. This function is small enough and focused enough for now.
  - `initialize` (17 lines, line 219) - Initializes the board panel from the resolved panel and navigator ranges. Needs edit: No. This function is small enough and focused enough for now.
  - `reset` (5 lines, line 242) - Resets the current panel back to the board-resolved visible range. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; check whether this tiny abstraction is carrying enough meaning to keep.
  - `toggleDragSelect` (12 lines, line 255) - Toggles drag-select mode and closes the FFT modal when drag-select is disabled. Needs edit: No. This function is small enough and focused enough for now.
  - `toggleHighlight` (11 lines, line 273) - Toggles highlight-selection mode and disables drag-select-only actions while highlighting. Needs edit: No. This function is small enough and focused enough for now.
  - `handleDragSelectStateChange` (9 lines, line 292) - Applies drag-select state changes reported by the chart body. Needs edit: No. This function is small enough and focused enough for now.
  - `handleHighlightSelection` (26 lines, line 309) - Saves a new unnamed highlight range into the current panel. Needs edit: No. This function is small enough and focused enough for now.
  - `toggleRaw` (16 lines, line 341) - Toggles raw mode for the board panel and refreshes the affected datasets. Needs edit: No. This function is small enough and focused enough for now.
  - `handlePanelContextMenu` (13 lines, line 411) - Opens the panel context menu at the cursor position. Needs edit: No. This function is small enough and focused enough for now.
  - `closeContextMenu` (6 lines, line 430) - Closes the panel context menu without changing any other state. Needs edit: No. This function is small enough and focused enough for now.
  - `closeHighlightRenamePopover` (3 lines, line 442) - Closes the highlight rename popup. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a UI event or state change a clear name.
  - `handleOpenHighlightRename` (16 lines, line 452) - Opens the rename popup for the selected saved highlight. Needs edit: No. This function is small enough and focused enough for now.
  - `applyHighlightRename` (30 lines, line 474) - Persists the edited highlight label back into the current panel. Needs edit: No. This function is small enough and focused enough for now.
  - `areBoardPanelPropsEqual` (24 lines, line 683) - Compares two panel container prop snapshots for memoization. Needs edit: No. This function is small enough and focused enough for now.

### `BoardPanelContextMenu.tsx`
- Path: `panel/BoardPanelContextMenu.tsx`
- Lines: 136
- Role: Renders the right-click panel context menu and routes delete and rename actions.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `BoardPanelContextMenu` (96 lines, line 37) - Renders the right-click action menu for a TagAnalyzer panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `runActionAfterClose` (4 lines, line 67) - Closes the menu first, then runs the chosen action. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; check whether this tiny abstraction is carrying enough meaning to keep.
  - `handleDeleteConfirmOpen` (4 lines, line 77) - Closes the menu first, then opens the delete confirmation flow. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; check whether this tiny abstraction is carrying enough meaning to keep.

### `BoardPanelHeader.tsx`
- Path: `panel/BoardPanelHeader.tsx`
- Lines: 222
- Role: Renders the panel header and exposes title, edit, and delete controls.
- Similar files: `chart/ChartHeader.scss`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `BoardPanelHeader` (187 lines, line 33) - Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode, and time actions. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `handleDelete` (4 lines, line 54) - Opens the delete confirmation modal after stopping header click propagation. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; check whether this tiny abstraction is carrying enough meaning to keep.

### `HighlightRenamePopover.tsx`
- Path: `panel/HighlightRenamePopover.tsx`
- Lines: 104
- Role: Renders the small popover used to rename one highlight label.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `HighlightRenamePopover` (79 lines, line 23) - Renders the small highlight rename popup with an input and apply action. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `handleKeyDown` (10 lines, line 48) - Applies the rename when the user presses Enter and closes on Escape. Needs edit: No. This function is small enough and focused enough for now.

