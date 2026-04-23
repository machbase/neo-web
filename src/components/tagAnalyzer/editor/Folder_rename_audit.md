# Folder Rename Audit: `src/components/tagAnalyzer/editor`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `AddTagsModal.tsx`
- `EDITOR_FOLDER_AUDIT_CURRENT.md`
- `EditorChartPreview.tsx`
- `FOLDER_AUDIT.md`
- `OverlapTimeShiftControls.tsx`
- `PanelEditor.tsx`
- `PanelEditorConfigConverter.test.ts`
- `PanelEditorConfigConverter.ts`
- `EditorTypes.ts`
- `PanelEditorUtils.test.ts`
- `PanelEditorUtils.ts`

### Verify
- Direct file count: 11

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `AddTagsModal.tsx`
- `AddTagsModal` - line 22, arrow function
- `isSameSelectedTag` - line 38, arrow function
- `handleSelectTag` - line 48, arrow function
- `setPanels` - line 61, arrow function
- `onPageChange` - line 122, arrow function
- `onPageInputChange` - line 124, arrow function

#### `EditorChartPreview.tsx`
- `EditorChartPreview` - line 35, function
- `getPreviewNavigatorRange` - line 77, function
- `loadPreviewRanges` - line 90, function expression
- `toggleRawMode` - line 103, function expression
- `onSelection` - line 206, arrow function
- `onOpenHighlightRename` - line 207, arrow function

#### `OverlapTimeShiftControls.tsx`
- `OverlapTimeShiftControls` - line 28, arrow function
- `getShiftAmount` - line 51, arrow function
- `setUtcTime` - line 61, arrow function

#### `PanelEditor.tsx`
- `PanelEditor` - line 30, arrow function
- `applyEditorChanges` - line 60, arrow function
- `saveEditorChanges` - line 76, arrow function
- `confirmSaveIfNeeded` - line 87, arrow function

#### `PanelEditorConfigConverter.test.ts`
- `createEditorTimeConfig` - line 15, function

#### `PanelEditorConfigConverter.ts`
- `convertPanelInfoToEditorConfig` - line 18, function
- `mergeEditorConfigIntoPanelInfo` - line 101, function
- `mergeAxesDraftIntoPanelAxes` - line 138, function
- `mergeDisplayDraftIntoPanelDisplay` - line 211, function
- `normalizeDraftNumber` - line 228, function

#### `EditorTypes.ts`
- `parseEditorNumber` - line 32, arrow function

#### `PanelEditorUtils.test.ts`
- `createEditorTimeConfig` - line 27, function

#### `PanelEditorUtils.ts`
- `resolveEditorTimeBounds` - line 34, function
- `getEditorTimeRangeMode` - line 59, function
- `hasAbsoluteEditorTimeBounds` - line 77, function
- `resolveLastRelativeEditorTimeBounds` - line 89, function
- `createLegacyEditorTimeRangeInput` - line 113, function
- `resolveLastRelativeBoundaryRanges` - line 129, function
- `createLastRelativeEditorTimeBounds` - line 143, function
- `resolveNowRelativeEditorTimeBounds` - line 160, function
- `resolveAbsoluteEditorTimeBounds` - line 177, function

### Verify
- Direct code files inspected: 9
- Named functions recorded: 36
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `AddTagsModal.tsx`
- `AddTagsModal` line 22: `pCloseModal` (used), `pTagSet` (used), `pOnChangeTagSet` (used), `pTables` (used)
- `isSameSelectedTag` line 38: `aItem` (used), `bItem` (used)
- `handleSelectTag` line 48: `aValue` (used)
- `setPanels` line 61: no parameters
- `onPageChange` line 122: `page` (used)
- `onPageInputChange` line 124: `value` (used)

#### `EditorChartPreview.tsx`
- `EditorChartPreview` line 35: `pPanelInfo` (used), `pFooterRange` (used), `pPreviewRange` (used), `pRollupTableList` (used)
- `getPreviewNavigatorRange` line 77: no parameters
- `loadPreviewRanges` line 90: no parameters
- `toggleRawMode` line 103: no parameters
- `onSelection` line 206: no parameters
- `onOpenHighlightRename` line 207: no parameters

#### `OverlapTimeShiftControls.tsx`
- `OverlapTimeShiftControls` line 28: `pColorIndex` (used), `pLabel` (used), `pStart` (used), `pDuration` (used), `pOnShiftTime` (used)
- `getShiftAmount` line 51: no parameters
- `setUtcTime` line 61: `sTime` (used)

#### `PanelEditor.tsx`
- `PanelEditor` line 30: `pInitialEditorConfig` (used), `pOnSavePanel` (used), `pPanelInfo` (used), `pSetEditPanel` (used), `pSetSaveEditedInfo` (used), `pNavigatorRange` (used), `pRollupTableList` (used), `pTables` (used)
- `applyEditorChanges` line 60: no parameters
- `saveEditorChanges` line 76: no parameters
- `confirmSaveIfNeeded` line 87: no parameters

#### `PanelEditorConfigConverter.test.ts`
- `createEditorTimeConfig` line 15: `aStart` (used), `aEnd` (used)

#### `PanelEditorConfigConverter.ts`
- `convertPanelInfoToEditorConfig` line 18: `aPanelInfo` (used)
- `mergeEditorConfigIntoPanelInfo` line 101: `aBasePanelInfo` (used), `aEditorConfig` (used)
- `mergeAxesDraftIntoPanelAxes` line 138: `aAxesDraft` (used)
- `mergeDisplayDraftIntoPanelDisplay` line 211: `aDisplayDraft` (used)
- `normalizeDraftNumber` line 228: `aValue` (used)

#### `EditorTypes.ts`
- `parseEditorNumber` line 32: `aValue` (used)

#### `PanelEditorUtils.test.ts`
- `createEditorTimeConfig` line 27: `aStart` (used), `aEnd` (used)

#### `PanelEditorUtils.ts`
- `resolveEditorTimeBounds` line 34: `timeConfig` (used), `tag_set` (used), `navigatorRange` (used)
- `getEditorTimeRangeMode` line 59: `aTimeConfig` (used)
- `hasAbsoluteEditorTimeBounds` line 77: `aTimeConfig` (used)
- `resolveLastRelativeEditorTimeBounds` line 89: `aTimeConfig` (used), `aTagSet` (used), `aFallbackRange` (used)
- `createLegacyEditorTimeRangeInput` line 113: `aTimeConfig` (used)
- `resolveLastRelativeBoundaryRanges` line 129: `aTagSet` (used), `aLegacyRange` (used)
- `createLastRelativeEditorTimeBounds` line 143: `aTimeConfig` (used), `aResolvedEndTime` (used)
- `resolveNowRelativeEditorTimeBounds` line 160: `aTimeConfig` (used)
- `resolveAbsoluteEditorTimeBounds` line 177: `aTimeConfig` (used)

### Verify
- Named functions checked: 36
- Parameters recorded: 53
- Parameters used: 53
- Parameters unused: 0

### Changed
- Recorded parameter usage for each named function in this folder.
## Step 4. Parameter Names

### Plan
- Decide whether each parameter name is explicit enough for its function role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded parameter names are accepted for now.

### Verify
- Parameter names reviewed: 53
- Parameter rename candidates: 0

### Changed
- No parameter rename candidates remain after the source cleanup.
## Step 5. Function Names

### Plan
- Decide whether each function name matches the function's role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded function names are accepted for now.

### Verify
- Function names reviewed: 36
- Function rename candidates: 0

### Changed
- No function rename candidates remain after the source cleanup.
## Step 6. Unneeded Parameters

### Plan
- Review the unused parameters found in Step 3.
- Remove only parameters that are not required by callbacks, interfaces, tests, or external call signatures.

### Execute
- No unused parameters found in the recorded named functions.

### Verify
- Unused parameter candidates reviewed: 0

### Changed
- No source parameters needed removal in this cleanup pass.
## Step 7. Unneeded Functions

### Plan
- Review each named function for evidence that it is still needed.
- Use a static name scan only as a candidate finder, not as proof that deletion is safe.

### Execute
- No unneeded functions were confirmed by the static scan.

### Verify
- Function removal candidates reviewed: 0

### Changed
- No function removal candidates remain after the source cleanup.
## Step 8. File Consolidation

### Plan
- Review direct files in this folder for consolidation opportunities.
- Consolidate only when it makes ownership clearer and reduces reasons to change.

### Execute
- Direct files reviewed: 11
- Code files: 9
- Test files: 2
- Style files: 0
- Documentation/data/other files: 2
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
