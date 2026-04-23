# Folder Rename Audit: `src/components/tagAnalyzer`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

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
- Direct tracked file count: 15

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `TagAnalyzer.test.tsx`
- `Page` - line 92, arrow function
- `Button` - line 105, arrow function
- `MockTagAnalyzerBoardToolbar` - line 128, function expression
- `MockTagAnalyzerBoard` - line 163, function expression
- `MockCreateChartModal` - line 196, function expression
- `MockOverlapModal` - line 207, function expression
- `MockTimeRangeModal` - line 219, function expression
- `MockPanelEditor` - line 246, function expression
- `createProps` - line 263, arrow function

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
- Direct tracked code files inspected: 5
- Named functions recorded: 37
- Anonymous inline callbacks were not recorded because this step is for rename-relevant functions.

### Changed
- Replaced the Step 2 placeholder with a named function inventory for this folder.
## Step 3. Parameters

### Plan
- Write down every received parameter and mark which parameters are actually used.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 4. Parameter Names

### Plan
- Decide if each parameter name is appropriate and rename it if needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 5. Function Names

### Plan
- Rename functions so each function name matches the function's role.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 6. Unneeded Parameters

### Plan
- Look through every parameter and remove parameters that are not really needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 7. Unneeded Functions

### Plan
- Look through every function and remove functions that are not really needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 8. File Consolidation

### Plan
- Look through every file and consolidate files when that makes the code clearer, or keep them separated when that is better.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.
