# Folder Audit: `common/tagSelection`

## Summary
- Date: 2026-04-22
- Direct files: `7`
- Direct subfolders: none
- Responsibility: This folder owns shared tag-selection UI, selection presentation helpers, and tag-selection state logic.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Helper hotspot: none

## Files

### `index.ts`
- Path: `common/tagSelection/index.ts`
- Lines: 6
- Role: Re-exports the shared tag-selection UI entry points.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `TagSelectionModeRow.tsx`
- Path: `common/tagSelection/TagSelectionModeRow.tsx`
- Lines: 85
- Role: Renders one mode toggle row inside the shared tag-selection UI.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `TagSelectionModeRow` (49 lines, line 34) - Renders a selected tag row with its aggregation-mode selector. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `TagSelectionPanel.tsx`
- Path: `common/tagSelection/TagSelectionPanel.tsx`
- Lines: 240
- Role: Renders the shared tag-selection panel and coordinates search, paging, selection, and validation UI.
- Similar files: `common/tagSelection/tagSelectionTypes.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `TagSelectionPanel` (199 lines, line 39) - Renders the tag selection panel and selected-draft list. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `handleSelectedSeriesDraftKeyDown` (13 lines, line 81) - Handles keyboard removal for a selected draft row. Needs edit: No. This function is small enough and focused enough for now.

### `tagSelectionPanelHelpers.ts`
- Path: `common/tagSelection/tagSelectionPanelHelpers.ts`
- Lines: 62
- Role: Maps repository search rows and selected series into the list-item shapes used by the tag-selection UI.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `mapTagSearchItemsToListItems` (9 lines, line 23) - Maps tag search items into list-row view models. Needs edit: No. This function is small enough and focused enough for now.
  - `findTagById` (6 lines, line 40) - Finds a tag search item by its list id. Needs edit: No. This function is small enough and focused enough for now.
  - `mapSelectedSeriesDraftListItems` (9 lines, line 53) - Maps selected series drafts into list-row view models. Needs edit: No. This function is small enough and focused enough for now.

### `tagSelectionPresentation.ts`
- Path: `common/tagSelection/tagSelectionPresentation.ts`
- Lines: 63
- Role: Builds small presentation strings and colors for the tag-selection panel.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `buildTagSelectionLimitError` (3 lines, line 10) - Builds the selection-limit error message for the tag picker. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `getTagSelectionErrorMessage` (14 lines, line 21) - Resolves the current tag-selection validation message. Needs edit: No. This function is small enough and focused enough for now.
  - `getTagSelectionCountColor` (6 lines, line 43) - Chooses the color used for the selected-tag count label. Needs edit: No. This function is small enough and focused enough for now.
  - `buildTagSelectionCountLabel` (6 lines, line 57) - Builds the selected-tag count label text. Needs edit: No. This function is small enough and focused enough for now.

### `tagSelectionTypes.ts`
- Path: `common/tagSelection/tagSelectionTypes.ts`
- Lines: 35
- Role: Defines the local types used by the shared tag-selection UI and state hook.
- Similar files: `common/tagSelection/TagSelectionPanel.tsx`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `useTagSelectionState.ts`
- Path: `common/tagSelection/useTagSelectionState.ts`
- Lines: 314
- Role: Owns the tag-selection state machine for search text, paging, selected rows, and selection limits.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `useTagSelectionState` (289 lines, line 25) - Manages tag-selection search, pagination, and selected-draft state. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.

