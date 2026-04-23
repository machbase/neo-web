# Folder Rename Audit: `src/components/tagAnalyzer/utils/series`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `FOLDER_AUDIT.md`
- `SeriesLabelFormatter.test.ts`
- `SeriesLabelFormatter.ts`
- `SeriesPointConverters.ts`
- `SeriesSummaryUtils.test.ts`
- `SeriesSummaryUtils.ts`
- `seriesTypes.ts`
- `TagSelectionChartSetup.test.ts`
- `TagSelectionChartSetup.ts`

### Verify
- Direct file count: 9

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `SeriesLabelFormatter.test.ts`
- No named functions found.

#### `SeriesLabelFormatter.ts`
- `formatSeriesLabel` - line 19, function
- `getSeriesShortName` - line 48, function
- `getSeriesEditorName` - line 59, function
- `getSeriesName` - line 71, function

#### `SeriesPointConverters.ts`
- `seriesDataToPoints` - line 12, function
- `chartSeriesToPoints` - line 32, function

#### `SeriesSummaryUtils.test.ts`
- No named functions found.

#### `SeriesSummaryUtils.ts`
- `buildSeriesSummaryRows` - line 45, function

#### `seriesTypes.ts`
- No named functions found.

#### `TagSelectionChartSetup.test.ts`
- No named functions found.

#### `TagSelectionChartSetup.ts`
- `buildDefaultRange` - line 17, function
- `buildCreateChartSeed` - line 44, function
- `mergeSelectedTagsIntoTagSet` - line 71, function

### Verify
- Direct code files inspected: 8
- Named functions recorded: 10
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `SeriesLabelFormatter.test.ts`
- No named functions found.

#### `SeriesLabelFormatter.ts`
- `formatSeriesLabel` line 19: `aSeriesConfig` (used), `aOptions` (used)
- `getSeriesShortName` line 48: `aSeriesConfig` (used)
- `getSeriesEditorName` line 59: `aSeriesConfig` (used)
- `getSeriesName` line 71: `aSeriesConfig` (used), `aUseRawLabel = default` (used)

#### `SeriesPointConverters.ts`
- `seriesDataToPoints` line 12: `aData` (used)
- `chartSeriesToPoints` line 32: `aSeries` (used)

#### `SeriesSummaryUtils.test.ts`
- No named functions found.

#### `SeriesSummaryUtils.ts`
- `buildSeriesSummaryRows` line 45: `aSeriesList` (used), `aTagSet` (used), `aStartTime` (used), `aEndTime` (used)

#### `seriesTypes.ts`
- No named functions found.

#### `TagSelectionChartSetup.test.ts`
- No named functions found.

#### `TagSelectionChartSetup.ts`
- `buildDefaultRange` line 17: `aMinMillis` (used), `aMaxMillis` (used)
- `buildCreateChartSeed` line 44: `aChartType` (used), `aSelectedSeriesDrafts` (used), `aMinMillis` (used), `aMaxMillis` (used)
- `mergeSelectedTagsIntoTagSet` line 71: `aOriginSeriesConfigs` (used), `aSelectedSeriesDrafts` (used)

### Verify
- Named functions checked: 10
- Parameters recorded: 20
- Parameters used: 20
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
- Parameter names reviewed: 20
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
- Function names reviewed: 10
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
- Direct files reviewed: 9
- Code files: 8
- Test files: 3
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `seriesTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
