# Folder Rename Audit: `src/components/tagAnalyzer/chart/options`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `ChartAxisOptionBuilder.ts`
- `ChartAxisUtils.ts`
- `ChartHighlightSeriesOptions.ts`
- `ChartInteractionUtils.ts`
- `ChartLegendVisibility.ts`
- `ChartMainSeriesOptions.ts`
- `ChartNavigatorSeriesOptions.ts`
- `ChartOptionBuilder.test.ts`
- `ChartOptionBuilder.ts`
- `ChartOptionConstants.ts`
- `ChartOptionSections.ts`
- `ChartOptionTypes.ts`
- `ChartSeriesOptionBuilder.ts`
- `ChartSeriesUtils.ts`
- `ChartThresholdSeriesOptions.ts`
- `ChartTooltipOption.ts`
- `ChartYAxisRangeResolver.ts`
- `FOLDER_AUDIT.md`
- `OverlapChartOption.ts`
- `OverlapTooltipOption.ts`
- `OverlapYAxisRangeResolver.ts`

### Verify
- Direct file count: 21

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `ChartAxisOptionBuilder.ts`
- `buildChartXAxisOption` - line 34, function
- `formatter` - line 49, arrow function
- `buildChartYAxisOption` - line 90, function

#### `ChartAxisUtils.ts`
- No named functions found.

#### `ChartHighlightSeriesOptions.ts`
- `buildHighlightOverlaySeries` - line 16, function
- `buildHighlightLabelSeries` - line 103, function

#### `ChartInteractionUtils.ts`
- `extractDataZoomRange` - line 23, function
- `getPrimaryDataZoomItem` - line 55, function
- `getExplicitDataZoomRange` - line 65, function
- `getZoomBoundaryValue` - line 87, function
- `extractBrushRange` - line 99, function

#### `ChartLegendVisibility.ts`
- `buildChartLegendSelectedMap` - line 11, function
- `buildDefaultVisibleSeriesMap` - line 27, function
- `buildVisibleSeriesList` - line 45, function

#### `ChartMainSeriesOptions.ts`
- `buildMainSeries` - line 22, function

#### `ChartNavigatorSeriesOptions.ts`
- `buildNavigatorSeries` - line 15, function

#### `ChartOptionBuilder.test.ts`
- No named functions found.

#### `ChartOptionBuilder.ts`
- `buildChartOption` - line 41, function

#### `ChartOptionConstants.ts`
- `getChartLayoutMetrics` - line 67, function

#### `ChartOptionSections.ts`
- `buildPanelChartGridOption` - line 53, function
- `buildPanelChartLegendOption` - line 80, function
- `buildPanelChartDataZoomOption` - line 101, function

#### `ChartOptionTypes.ts`
- No named functions found.

#### `ChartSeriesOptionBuilder.ts`
- `buildChartSeriesOption` - line 30, function

#### `ChartSeriesUtils.ts`
- No named functions found.

#### `ChartThresholdSeriesOptions.ts`
- `buildThresholdLine` - line 11, function

#### `ChartTooltipOption.ts`
- `buildChartTooltipOption` - line 10, function
- `formatter` - line 20, arrow function
- `formatTooltipTime` - line 56, function

#### `ChartYAxisRangeResolver.ts`
- `getSeriesValueRange` - line 20, function
- `getRoundedAxisStep` - line 37, function
- `roundAxisMaximum` - line 62, function
- `updateAxisBounds` - line 82, function
- `roundAxisBounds` - line 100, function
- `getYAxisValues` - line 114, function
- `resolveAxisRange` - line 156, function

#### `OverlapChartOption.ts`
- `buildOverlapChartOption` - line 36, function
- `formatter` - line 67, arrow function

#### `OverlapTooltipOption.ts`
- `buildOverlapTooltipOption` - line 13, function
- `formatter` - line 19, arrow function

#### `OverlapYAxisRangeResolver.ts`
- `resolveOverlapYAxisRange` - line 58, function

### Verify
- Direct code files inspected: 20
- Named functions recorded: 37
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `ChartAxisOptionBuilder.ts`
- `buildChartXAxisOption` line 34: `aNavigatorRange` (used), `aDisplay` (used), `aAxes` (used)
- `formatter` line 49: `aValue` (used)
- `buildChartYAxisOption` line 90: `aAxes` (used), `aChartData` (used), `aIsRaw` (used), `aUseNormalize` (used)

#### `ChartAxisUtils.ts`
- No named functions found.

#### `ChartHighlightSeriesOptions.ts`
- `buildHighlightOverlaySeries` line 16: `aHighlights` (used), `aNavigatorRange` (used)
- `buildHighlightLabelSeries` line 103: `aHighlights` (used), `aChartData` (used), `aAxes` (used), `aIsRaw` (used), `aUseNormalize` (used)

#### `ChartInteractionUtils.ts`
- `extractDataZoomRange` line 23: `aParams` (used), `aCurrentRange` (used), `aAxisRange = default` (used)
- `getPrimaryDataZoomItem` line 55: `aZoomData` (used)
- `getExplicitDataZoomRange` line 65: `aZoomData` (used)
- `getZoomBoundaryValue` line 87: `aValue` (used)
- `extractBrushRange` line 99: `aParams` (used)

#### `ChartLegendVisibility.ts`
- `buildChartLegendSelectedMap` line 11: `aChartData` (used), `aVisibleSeries` (used)
- `buildDefaultVisibleSeriesMap` line 27: `aChartData` (used)
- `buildVisibleSeriesList` line 45: `aChartData` (used), `aVisibleSeries` (used)

#### `ChartMainSeriesOptions.ts`
- `buildMainSeries` line 22: `aChartData` (used), `aDisplay` (used), `aAxes` (used), `aHoveredLegendSeries?` (used)

#### `ChartNavigatorSeriesOptions.ts`
- `buildNavigatorSeries` line 15: `aChartData` (used), `aHoveredLegendSeries?` (used)

#### `ChartOptionBuilder.test.ts`
- No named functions found.

#### `ChartOptionBuilder.ts`
- `buildChartOption` line 41: `aChartData` (used), `aNavigatorRange` (used), `aAxes` (used), `aDisplay` (used), `aIsRaw` (used), `aUseNormalize` (used), `aVisibleSeries` (used), `aNavigatorChartData = default` (used), `aHoveredLegendSeries?` (used), `aHighlights = default` (used)

#### `ChartOptionConstants.ts`
- `getChartLayoutMetrics` line 67: `aShowLegend` (used)

#### `ChartOptionSections.ts`
- `buildPanelChartGridOption` line 53: `aDisplay` (used)
- `buildPanelChartLegendOption` line 80: `aChartData` (used), `aDisplay` (used), `aVisibleSeries` (used)
- `buildPanelChartDataZoomOption` line 101: `aDisplay` (used)

#### `ChartOptionTypes.ts`
- No named functions found.

#### `ChartSeriesOptionBuilder.ts`
- `buildChartSeriesOption` line 30: `aChartData` (used), `aDisplay` (used), `aAxes` (used), `aNavigatorChartData = default` (used), `aHoveredLegendSeries?` (used), `aHighlights = default` (used), `aNavigatorRange?` (used), `aIsRaw = default` (used), `aUseNormalize = default` (used)

#### `ChartSeriesUtils.ts`
- No named functions found.

#### `ChartThresholdSeriesOptions.ts`
- `buildThresholdLine` line 11: `aUseFlag` (used), `aColor` (used), `aValue` (used)

#### `ChartTooltipOption.ts`
- `buildChartTooltipOption` line 10: no parameters
- `formatter` line 20: `aParams` (used)
- `formatTooltipTime` line 56: `aValue` (used)

#### `ChartYAxisRangeResolver.ts`
- `getSeriesValueRange` line 20: `aSeriesData` (used)
- `getRoundedAxisStep` line 37: `aValue` (used)
- `roundAxisMaximum` line 62: `aValue` (used)
- `updateAxisBounds` line 82: `aBounds` (used), `aSeriesData` (used), `aZeroBase` (used)
- `roundAxisBounds` line 100: `aBounds` (used)
- `getYAxisValues` line 114: `aChartData` (used), `aAxes` (used)
- `resolveAxisRange` line 156: `aManualRange` (used), `aDefaultMin` (used), `aDefaultMax` (used)

#### `OverlapChartOption.ts`
- `buildOverlapChartOption` line 36: `aChartData` (used), `aStartTimeList` (used), `aZeroBase` (used)
- `formatter` line 67: `aValue` (used)

#### `OverlapTooltipOption.ts`
- `buildOverlapTooltipOption` line 13: `aChartData` (used), `aStartTimeList` (used)
- `formatter` line 19: `aParams` (used)

#### `OverlapYAxisRangeResolver.ts`
- `resolveOverlapYAxisRange` line 58: `aChartData` (used), `aZeroBase` (used)

### Verify
- Named functions checked: 37
- Parameters recorded: 84
- Parameters used: 84
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
- Parameter names reviewed: 84
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
- Direct files reviewed: 21
- Code files: 20
- Test files: 1
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `ChartAxisUtils.ts`, `ChartOptionTypes.ts`, `ChartSeriesUtils.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
