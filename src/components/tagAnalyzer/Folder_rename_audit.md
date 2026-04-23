# Folder Rename Audit: `src/components/tagAnalyzer`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `AUDIT_GUIDE_FOR_AGENTS.md`
- `AUDIT_GUIDE_TAGANALZYER.md`
- `ECHARTS_INTERACTION_NOTES.md`
- `FILE_RESPONSIBILITIES.md`
- `FOLDER_AUDIT.md`
- `HIGHLIGHT_IMPLEMENTATION.md`
- `MaximumUpdateDepthReport.md`
- `TAG_ANALYZER_UTILS_FILE_AND_FUNCTION_REFERENCE.md`
- `TagAnalyzer.test.tsx`
- `TagAnalyzer.tsx`
- `TagAnalyzerBoard.tsx`
- `TagAnalyzerBoardToolbar.test.tsx`
- `TagAnalyzerBoardToolbar.tsx`
- `TAZ_LOAD_SAVE_AND_ANNOTATIONS.md`
- `TIME_HIGHLIGHT_ANNOTATION_REPORT.md`

### Verify
- Direct file count: 15

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `TagAnalyzer.test.tsx`
- `MockDesignSystemPage` - line 92, arrow function
- `MockDesignSystemButton` - line 107, arrow function
- `MockTagAnalyzerBoardToolbar` - line 130, arrow function
- `MockTagAnalyzerBoard` - line 167, arrow function
- `MockCreateChartModal` - line 202, arrow function
- `MockOverlapModal` - line 215, arrow function
- `MockTimeRangeModal` - line 229, arrow function
- `MockPanelEditor` - line 258, arrow function
- `createProps` - line 277, arrow function

#### `TagAnalyzer.tsx`
- `hasPersistedTimeRangeChanged` - line 71, function
- `applyPendingTimeRangeUpdates` - line 94, function
- `isSameTimeBoundaryRanges` - line 142, function
- `TagAnalyzer` - line 168, arrow function
- `buildToolbarActionHandlers` - line 573, function
- `onOpenTimeRangeModal` - line 585, arrow function
- `onRefreshData` - line 586, arrow function
- `onRefreshTime` - line 587, arrow function
- `onOpenSaveModal` - line 589, arrow function
- `onOpenOverlapModal` - line 590, arrow function
- `buildPanelBoardActions` - line 606, function
- `onOverlapSelectionChange` - line 615, arrow function
- `onDeletePanel` - line 617, arrow function
- `onSavePanel` - line 620, arrow function
- `onSetGlobalTimeRange` - line 629, arrow function

#### `TagAnalyzerBoard.tsx`
- `TagAnalyzerBoard` - line 20, function expression

#### `TagAnalyzerBoardToolbar.test.tsx`
- `Calendar` - line 7, arrow function
- `Save` - line 8, arrow function
- `Refresh` - line 9, arrow function
- `SaveAs` - line 10, arrow function
- `MdOutlineStackedLineChart` - line 11, arrow function
- `LuTimerReset` - line 12, arrow function
- `Header` - line 25, arrow function
- `Space` - line 26, arrow function
- `Group` - line 50, arrow function
- `createActionHandlers` - line 63, arrow function

#### `TagAnalyzerBoardToolbar.tsx`
- `TagAnalyzerBoardToolbar` - line 29, arrow function
- `formatBoardRangeText` - line 180, function

### Verify
- Direct code files inspected: 5
- Named functions recorded: 37
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `TagAnalyzer.test.tsx`
- `MockDesignSystemPage` line 92: `children` (used)
- `MockDesignSystemButton` line 107: `children` (used), `onClick` (used)
- `MockTagAnalyzerBoardToolbar` line 130: `props` (used)
- `MockTagAnalyzerBoard` line 167: `props` (used)
- `MockCreateChartModal` line 202: no parameters
- `MockOverlapModal` line 215: no parameters
- `MockTimeRangeModal` line 229: `pSetTimeRangeModal` (used), `pSaveCallback` (used)
- `MockPanelEditor` line 258: `pSetEditPanel` (used)
- `createProps` line 277: `aOverrides = default` (used)

#### `TagAnalyzer.tsx`
- `hasPersistedTimeRangeChanged` line 71: `aPanel` (used), `aTimeInfo` (used), `aIsRaw` (used)
- `applyPendingTimeRangeUpdates` line 94: `aPanels` (used), `aPendingUpdates` (used)
- `isSameTimeBoundaryRanges` line 142: `aLeft` (used), `aRight` (used)
- `TagAnalyzer` line 168: `pInfo` (used), `pHandleSaveModalOpen` (used), `pSetIsSaveModal` (used)
- `buildToolbarActionHandlers` line 573: `setTimeRangeModal` (used), `setRefreshCount` (used), `refreshTopLevelTimeRange` (used), `pHandleSaveModalOpen` (used), `pSetIsSaveModal` (used), `setIsOverlapModalOpen` (used)
- `onOpenTimeRangeModal` line 585: no parameters
- `onRefreshData` line 586: no parameters
- `onRefreshTime` line 587: no parameters
- `onOpenSaveModal` line 589: no parameters
- `onOpenOverlapModal` line 590: no parameters
- `buildPanelBoardActions` line 606: `setOverlapPanels` (used), `setBoardList` (used), `sBoardInfo` (used), `onPersistPanelState` (used), `setGlobalDataAndNavigatorTime` (used), `setEditingPanel` (used)
- `onOverlapSelectionChange` line 615: `aPayload` (used)
- `onDeletePanel` line 617: `panelKey` (used)
- `onSavePanel` line 620: `aPanelInfo` (used)
- `onSetGlobalTimeRange` line 629: `dataTime` (used), `navigatorTime` (used), `interval` (used)

#### `TagAnalyzerBoard.tsx`
- `TagAnalyzerBoard` line 20: `pInfo` (used), `pIsActiveTab` (used), `pPanelBoardState` (used), `pPanelBoardActions` (used), `pRollupTableList` (used)

#### `TagAnalyzerBoardToolbar.test.tsx`
- `Calendar` line 7: no parameters
- `Save` line 8: no parameters
- `Refresh` line 9: no parameters
- `SaveAs` line 10: no parameters
- `MdOutlineStackedLineChart` line 11: no parameters
- `LuTimerReset` line 12: no parameters
- `Header` line 25: `children` (used)
- `Space` line 26: no parameters
- `Group` line 50: `children` (used)
- `createActionHandlers` line 63: no parameters

#### `TagAnalyzerBoardToolbar.tsx`
- `TagAnalyzerBoardToolbar` line 29: `pRange` (used), `pPanelsInfoCount` (used), `pActionHandlers` (used)
- `formatBoardRangeText` line 180: `aRange` (used)

### Verify
- Named functions checked: 37
- Parameters recorded: 48
- Parameters used: 48
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
- Parameter names reviewed: 48
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
- Function names reviewed: 37
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
- Direct files reviewed: 15
- Code files: 5
- Test files: 2
- Style files: 0
- Documentation/data/other files: 10
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
