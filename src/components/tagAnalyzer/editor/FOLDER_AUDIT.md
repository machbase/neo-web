# Folder Audit: `editor`

## Summary
- Date: 2026-04-22
- Direct files: `8`
- Direct subfolders: `editor/sections`
- Responsibility: This folder owns the auditable production files for this area.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `editor/PanelEditor.tsx` (240 lines)
- Helper hotspot: `editor/PanelEditorUtils.ts` (9 named functions)

## Files

### `AddTagsModal.tsx`
- Path: `editor/AddTagsModal.tsx`
- Lines: 156
- Role: Renders the add-tags modal and merges selected tags into the working panel draft.
- Similar files: `modal/CreateChartModal.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `AddTagsModal` (130 lines, line 24) - Renders the modal for adding tags to an existing panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `handleSelectTag` (7 lines, line 49) - Adds one selected tag to the pending tag list. Needs edit: No. This function is small enough and focused enough for now.
  - `setPanels` (13 lines, line 62) - Commits the selected tags into the current panel tag set. Needs edit: No. This function is small enough and focused enough for now.

### `EditorChartPreview.tsx`
- Path: `editor/EditorChartPreview.tsx`
- Lines: 229
- Role: Renders the editor-side chart preview and reuses the shared chart runtime hook for preview data loads.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `EditorChartPreview` (192 lines, line 36) - Renders the editor preview shell and keeps preview-only initialization logic outside the shared runtime controller. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `getPreviewNavigatorRange` (7 lines, line 78) - Resolves the navigator range to use for the preview shell. Needs edit: No. This function is small enough and focused enough for now.
  - `loadPreviewRanges` (7 lines, line 91) - Loads the preview chart ranges into the editor shell. Needs edit: No. This function is small enough and focused enough for now.
  - `toggleRawMode` (5 lines, line 104) - Toggles the preview shell between raw and aggregated data. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; check whether this tiny abstraction is carrying enough meaning to keep.

### `OverlapTimeShiftControls.tsx`
- Path: `editor/OverlapTimeShiftControls.tsx`
- Lines: 200
- Role: Renders the time-shift controls used while comparing overlap panels.
- Similar files: `chart/options/OverlapChartOption.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `OverlapTimeShiftControls` (171 lines, line 28) - Renders the per-series offset controls used inside the overlap modal. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `getShiftAmount` (3 lines, line 51) - Converts the current shift unit and value into milliseconds. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `setUtcTime` (3 lines, line 61) - Converts one local timestamp into UTC chart time. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a UI event or state change a clear name.

### `PanelEditor.tsx`
- Path: `editor/PanelEditor.tsx`
- Lines: 240
- Role: Renders the panel editor shell and coordinates tabs, draft edits, preview, and save/apply actions.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `PanelEditor` (206 lines, line 31) - Renders the full editor shell for one panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `applyEditorChanges` (10 lines, line 56) - Applies the current editor draft into the preview chart state and preview time bounds. Needs edit: No. This function is small enough and focused enough for now.
  - `saveEditorChanges` (5 lines, line 72) - Saves the currently applied preview panel back into the selected board. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; check whether this tiny abstraction is carrying enough meaning to keep.
  - `confirmSaveIfNeeded` (8 lines, line 83) - Opens the confirm modal when the draft differs from the applied preview panel. Needs edit: No. This function is small enough and focused enough for now.

### `PanelEditorConfigConverter.ts`
- Path: `editor/PanelEditorConfigConverter.ts`
- Lines: 178
- Role: Converts between normalized PanelInfo objects and the editor draft configuration shape.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `convertPanelInfoToEditorConfig` (50 lines, line 18) - Converts one persisted panel model into the editor draft grouped by editor tabs. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `mergeEditorConfigIntoPanelInfo` (30 lines, line 76) - Merges one editor draft back into the persisted panel model while preserving non-editor fields. Needs edit: No. This function is small enough and focused enough for now.
  - `mergeAxesDraftIntoPanelAxes` (38 lines, line 113) - Converts one editor axes draft into the persisted panel-axes shape. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `mergeDisplayDraftIntoPanelDisplay` (10 lines, line 158) - Converts one editor display draft into the persisted panel-display shape. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeDraftNumber` (3 lines, line 175) - Normalizes one draft number field so blank inputs still round-trip into numeric panel values. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.

### `EditorTypes.ts`
- Path: `editor/EditorTypes.ts`
- Lines: 106
- Role: Defines small editor-only helper types and parsing utilities.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `parseEditorNumber` (3 lines, line 28) - Parses one editor field into either a number or an empty draft value. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.

### `PanelEditorUtils.ts`
- Path: `editor/PanelEditorUtils.ts`
- Lines: 183
- Role: Resolves editor time modes and converts editor time inputs into normalized panel time settings.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Warning. This file has enough helpers that naming and responsibility boundaries should be watched closely.
- Functions:
  - `resolveEditorTimeBounds` (18 lines, line 34) - Resolves the concrete preview bounds used by the editor time controls. Needs edit: No. This function is small enough and focused enough for now.
  - `getEditorTimeRangeMode` (11 lines, line 59) - Classifies the editor time config into the resolution path it should use. Needs edit: No. This function is small enough and focused enough for now.
  - `hasAbsoluteEditorTimeBounds` (3 lines, line 77) - Checks whether the editor config already contains a usable concrete numeric range. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `resolveLastRelativeEditorTimeBounds` (17 lines, line 89) - Resolves last-relative editor ranges against the fetched last available end timestamp. Needs edit: No. This function is small enough and focused enough for now.
  - `createLegacyEditorTimeRangeInput` (8 lines, line 113) - Converts the editor's normalized time config into the legacy boundary shape. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveLastRelativeBoundaryRanges` (6 lines, line 129) - Fetches the concrete boundary ranges needed for last-relative editor ranges. Needs edit: No. This function is small enough and focused enough for now.
  - `createLastRelativeEditorTimeBounds` (10 lines, line 143) - Builds the preview range for a last-relative config from the fetched end timestamp. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveNowRelativeEditorTimeBounds` (10 lines, line 160) - Resolves now-relative editor ranges against the current time. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveAbsoluteEditorTimeBounds` (6 lines, line 177) - Returns the literal numeric editor range as-is. Needs edit: No. This function is small enough and focused enough for now.

### `useSavePanelToGlobalRecoilState.ts`
- Path: `editor/useSavePanelToGlobalRecoilState.ts`
- Lines: 29
- Role: Writes the latest saved panel state into the shared global Recoil store.
- Similar files: `tagSelection/useTagSelectionState.ts`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `useSavePanelToGlobalRecoilState` (18 lines, line 11) - Returns a save handler that persists one normalized panel into the selected board. Needs edit: No. This function is small enough and focused enough for now.

