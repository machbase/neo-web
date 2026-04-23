# Folder Rename Audit: `src/components/tagAnalyzer/modal`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `CreateChartModal.tsx`
- `FFTModal.tsx`
- `FOLDER_AUDIT.md`
- `OverlapComparisonUtils.test.ts`
- `OverlapComparisonUtils.ts`
- `OverlapModal.tsx`

### Verify
- Direct file count: 6

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `CreateChartModal.tsx`
- `getMinMaxBounds` - line 30, arrow function
- `CreateChartModal` - line 52, arrow function
- `isSameSelectedTag` - line 70, arrow function
- `handleSelectTag` - line 87, arrow function
- `setPanels` - line 104, arrow function
- `onPageChange` - line 267, arrow function
- `onPageInputChange` - line 269, arrow function

#### `FFTModal.tsx`
- `createFFTModalOptions` - line 26, function
- `FFTModal` - line 34, arrow function
- `handleSelectedTag` - line 184, arrow function
- `handle2DChart` - line 195, arrow function
- `handleRunCode` - line 202, arrow function
- `handleSelectInterval` - line 257, arrow function
- `getTqlChartData` - line 263, arrow function

#### `OverlapComparisonUtils.test.ts`
- No named functions found.

#### `OverlapComparisonUtils.ts`
- `shiftOverlapPanels` - line 29, function
- `buildOverlapLoadState` - line 51, function
- `resolveOverlapTimeRange` - line 80, function
- `alignOverlapTime` - line 97, function
- `mapOverlapRows` - line 114, function
- `getNextOverlapPanels` - line 128, function

#### `OverlapModal.tsx`
- `OverlapModal` - line 51, function
- `fetchOverlapPanelData` - line 66, function expression
- `loadOverlapData` - line 158, function expression
- `shiftPanelTime` - line 181, function expression
- `renderOverlapTimeShiftControl` - line 197, function

### Verify
- Direct code files inspected: 5
- Named functions recorded: 25
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `CreateChartModal.tsx`
- `getMinMaxBounds` line 30: `aResponse` (used)
- `CreateChartModal` line 52: `isOpen` (used), `onClose` (used), `pOnAppendPanel` (used), `pTables` (used)
- `isSameSelectedTag` line 70: `aItem` (used), `bItem` (used)
- `handleSelectTag` line 87: `aValue` (used)
- `setPanels` line 104: no parameters
- `onPageChange` line 267: `page` (used)
- `onPageInputChange` line 269: `value` (used)

#### `FFTModal.tsx`
- `createFFTModalOptions` line 26: `aSeriesSummaries` (used)
- `FFTModal` line 34: `pSeriesSummaries` (used), `pStartTime` (used), `pEndTime` (used), `setIsOpen` (used)
- `handleSelectedTag` line 184: `aValue` (used)
- `handle2DChart` line 195: no parameters
- `handleRunCode` line 202: no parameters
- `handleSelectInterval` line 257: `aValue` (used)
- `getTqlChartData` line 263: `aText` (used)

#### `OverlapComparisonUtils.test.ts`
- No named functions found.

#### `OverlapComparisonUtils.ts`
- `shiftOverlapPanels` line 29: `aPanelsInfo` (used), `aPanelKey` (used), `aDirection` (used), `aRange` (used)
- `buildOverlapLoadState` line 51: `aResults` (used)
- `resolveOverlapTimeRange` line 80: `aPanelInfo` (used), `aAnchorDuration` (used)
- `alignOverlapTime` line 97: `aTime` (used), `aInterval` (used)
- `mapOverlapRows` line 114: `aRows` (used), `aSeriesStartTime` (used)
- `getNextOverlapPanels` line 128: `aPanels` (used), `aPayload` (used)

#### `OverlapModal.tsx`
- `OverlapModal` line 51: `pSetIsModal` (used), `pPanelsInfo` (used), `pRollupTableList` (used)
- `fetchOverlapPanelData` line 66: `aPanelInfo` (used), `aAnchorPanel` (used)
- `loadOverlapData` line 158: `aPanelsInfo` (used)
- `shiftPanelTime` line 181: `aPanelKey` (used), `aType` (used), `aRange` (used)
- `renderOverlapTimeShiftControl` line 197: `aItem` (used), `aIdx` (used)

### Verify
- Named functions checked: 25
- Parameters recorded: 42
- Parameters used: 42
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
- Parameter names reviewed: 42
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
- Function names reviewed: 25
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
- Direct files reviewed: 6
- Code files: 5
- Test files: 1
- Style files: 0
- Documentation/data/other files: 1
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
