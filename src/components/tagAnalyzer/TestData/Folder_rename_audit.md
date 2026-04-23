# Folder Rename Audit: `src/components/tagAnalyzer/TestData`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `FOLDER_AUDIT.md`
- `PanelChartTestData.ts`
- `PanelEChartTestData.ts`
- `PanelTestData.ts`
- `TagSelectionTestData.ts`

### Verify
- Direct file count: 5

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `PanelChartTestData.ts`
- `createMockChartInstance` - line 51, arrow function
- `createPanelChartPropsFixture` - line 72, arrow function

#### `PanelEChartTestData.ts`
- `createPanelChartLayoutOptionFixture` - line 15, arrow function

#### `PanelTestData.ts`
- `stripUndefinedFields` - line 49, function
- `createTagAnalyzerTimeRangeFixture` - line 119, function
- `createTagAnalyzerSeriesColumnsFixture` - line 135, function
- `createTagAnalyzerSeriesConfigFixture` - line 152, function
- `createTagAnalyzerFetchSeriesConfigFixture` - line 180, function
- `createTagAnalyzerChartSeriesItemFixture` - line 202, function
- `createTagAnalyzerChartSeriesListFixture` - line 224, function
- `createTagAnalyzerChartDataFixture` - line 234, function
- `createTagAnalyzerPanelAxesFixture` - line 249, function
- `createTagAnalyzerPanelDisplayFixture` - line 366, function
- `createTagAnalyzerTimeRangePairFixture` - line 387, function
- `createTagAnalyzerPanelDataFixture` - line 403, function
- `createTagAnalyzerPanelTimeFixture` - line 421, function
- `createEmptyTagAnalyzerPanelTimeFixture` - line 455, function
- `createTagAnalyzerPanelInfoFixture` - line 471, function
- `createTagAnalyzerBoardSourceInfoFixture` - line 547, function
- `createTagAnalyzerEditRequestFixture` - line 570, function
- `createPanelFooterPropsFixture` - line 591, function
- `createOverlapPanelInfoFixture` - line 618, function

#### `TagSelectionTestData.ts`
- `createTagSelectionSourceColumnsFixture` - line 18, arrow function
- `createTagSearchItemFixture` - line 34, arrow function
- `createTagSearchItemsFixture` - line 47, arrow function
- `createTagSelectionDraftFixture` - line 58, arrow function
- `createTagSelectionDraftListFixture` - line 83, arrow function
- `createTagSelectionStateOptionsFixture` - line 92, arrow function
- `isSameSelectedTag` - line 96, arrow function

### Verify
- Direct code files inspected: 4
- Named functions recorded: 29
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `PanelChartTestData.ts`
- `createMockChartInstance` line 51: no parameters
- `createPanelChartPropsFixture` line 72: `aPanelRange = default` (used)

#### `PanelEChartTestData.ts`
- `createPanelChartLayoutOptionFixture` line 15: `aShowLegend` (used)

#### `PanelTestData.ts`
- `stripUndefinedFields` line 49: `aOverrides` (used)
- `createTagAnalyzerTimeRangeFixture` line 119: `aOverrides = default` (used)
- `createTagAnalyzerSeriesColumnsFixture` line 135: `aOverrides = default` (used)
- `createTagAnalyzerSeriesConfigFixture` line 152: `aOverrides = default` (used)
- `createTagAnalyzerFetchSeriesConfigFixture` line 180: `aOverrides = default` (used)
- `createTagAnalyzerChartSeriesItemFixture` line 202: `aOverrides = default` (used)
- `createTagAnalyzerChartSeriesListFixture` line 224: no parameters
- `createTagAnalyzerChartDataFixture` line 234: `aOverrides = default` (used)
- `createTagAnalyzerPanelAxesFixture` line 249: `aOverrides = default` (used)
- `createTagAnalyzerPanelDisplayFixture` line 366: `aOverrides = default` (used)
- `createTagAnalyzerTimeRangePairFixture` line 387: `aOverrides = default` (used)
- `createTagAnalyzerPanelDataFixture` line 403: `aOverrides = default` (used)
- `createTagAnalyzerPanelTimeFixture` line 421: `aOverrides = default` (used)
- `createEmptyTagAnalyzerPanelTimeFixture` line 455: `aOverrides = default` (used)
- `createTagAnalyzerPanelInfoFixture` line 471: `aOverrides = default` (used)
- `createTagAnalyzerBoardSourceInfoFixture` line 547: `aOverrides = default` (used)
- `createTagAnalyzerEditRequestFixture` line 570: `aOverrides = default` (used)
- `createPanelFooterPropsFixture` line 591: `aVisibleRange = default` (used)
- `createOverlapPanelInfoFixture` line 618: `aOverrides = default` (used)

#### `TagSelectionTestData.ts`
- `createTagSelectionSourceColumnsFixture` line 18: `aOverrides = default` (used)
- `createTagSearchItemFixture` line 34: `aId = default` (used), `aName = default` (used)
- `createTagSearchItemsFixture` line 47: no parameters
- `createTagSelectionDraftFixture` line 58: `aOverrides = default` (used)
- `createTagSelectionDraftListFixture` line 83: no parameters
- `createTagSelectionStateOptionsFixture` line 92: no parameters
- `isSameSelectedTag` line 96: `aItem` (used), `bItem` (used)

### Verify
- Named functions checked: 29
- Parameters recorded: 26
- Parameters used: 26
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
- Parameter names reviewed: 26
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
- Function names reviewed: 29
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
- Direct files reviewed: 5
- Code files: 4
- Test files: 0
- Style files: 0
- Documentation/data/other files: 1
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
