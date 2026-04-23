# Folder Rename Audit: `src/components/tagAnalyzer/utils/fetch`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `CalculationFetchQueryBuilder.ts`
- `ChartSeriesMapper.ts`
- `ChartSeriesRowsLoader.ts`
- `FetchContracts.ts`
- `FetchRequestErrorPresenter.ts`
- `FetchSampleCountResolver.ts`
- `FetchSupportModules.test.ts`
- `FetchTableNameResolver.ts`
- `FetchTimeBoundsNormalizer.ts`
- `FOLDER_AUDIT.md`
- `RawFetchQueryBuilder.ts`
- `TagAnalyzerDataRepository.test.ts`
- `TagAnalyzerDataRepository.ts`
- `TimeBoundaryFetchQueryBuilder.ts`
- `TimeBoundaryFetchRepository.ts`
- `TimeBoundaryFetchTypes.ts`

### Verify
- Direct file count: 16

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `CalculationFetchQueryBuilder.ts`
- `buildCalculationMainQuery` - line 32, function
- `resolveCalculationTimeBucketContext` - line 143, function
- `buildTruncatedCalculationTimeBucket` - line 184, function
- `buildScaledCalculationTimeBucket` - line 201, function
- `buildCalculationFilterClause` - line 220, function
- `buildAggregateCalculationQuery` - line 231, function
- `buildAverageCalculationQuery` - line 244, function
- `buildCountCalculationQuery` - line 267, function
- `buildFirstLastCalculationTimeBucket` - line 279, function
- `buildFirstLastCalculationQuery` - line 304, function

#### `ChartSeriesMapper.ts`
- `mapRowsToChartData` - line 12, function
- `buildChartSeriesItem` - line 30, function

#### `ChartSeriesRowsLoader.ts`
- `createEmptyFetchResponse` - line 23, function
- `fetchCalculatedSeriesRows` - line 43, function
- `fetchRawSeriesRows` - line 87, function

#### `FetchContracts.ts`
- No named functions found.

#### `FetchRequestErrorPresenter.ts`
- `isHttpErrorResponse` - line 35, function
- `getRequestErrorMessage` - line 51, function
- `showRequestError` - line 92, function

#### `FetchSampleCountResolver.ts`
- `calculateSampleCount` - line 12, function

#### `FetchSupportModules.test.ts`
- No named functions found.

#### `FetchTableNameResolver.ts`
- `getQualifiedTableName` - line 10, function
- `getCalculationTableName` - line 25, function

#### `FetchTimeBoundsNormalizer.ts`
- `toUnixNanoseconds` - line 16, function
- `convertTimeRangeMsToTimeRangeNs` - line 26, function

#### `RawFetchQueryBuilder.ts`
- `buildCsvTqlQuery` - line 11, function
- `buildRawQuery` - line 28, function

#### `TagAnalyzerDataRepository.test.ts`
- No named functions found.

#### `TagAnalyzerDataRepository.ts`
- `parseChartCsvResponse` - line 41, function
- `fetchCalculationData` - line 70, function
- `fetchRawData` - line 114, function
- `fetchTablesData` - line 151, function
- `getRollupTableList` - line 167, function
- `fetchParsedTables` - line 229, function
- `fetchTopLevelTimeBoundaryRanges` - line 253, function

#### `TimeBoundaryFetchQueryBuilder.ts`
- `createTableTagMap` - line 15, function
- `buildMinMaxTableQuery` - line 55, function
- `buildVirtualStatTableQuery` - line 70, function

#### `TimeBoundaryFetchRepository.ts`
- `fetchMinMaxTable` - line 22, function
- `fetchVirtualStatTable` - line 44, function

#### `TimeBoundaryFetchTypes.ts`
- No named functions found.

### Verify
- Direct code files inspected: 15
- Named functions recorded: 37
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `CalculationFetchQueryBuilder.ts`
- `buildCalculationMainQuery` line 32: `aTableName` (used), `aTagNameList` (used), `aStartTime` (used), `aEndTime` (used), `aCalculationMode` (used), `aRowCount` (used), `aIntervalUnit` (used), `aIntervalSize` (used), `aUseRollup` (used), `aColumnMap` (used), `aRollupTableList` (used)
- `resolveCalculationTimeBucketContext` line 143: `aUseRollup` (used), `aIntervalUnit` (used), `aIntervalSize` (used)
- `buildTruncatedCalculationTimeBucket` line 184: `aUseRollup` (used), `aTimeSourceColumn` (used), `aIntervalUnit` (used), `aIntervalSize` (used)
- `buildScaledCalculationTimeBucket` line 201: `aUseRollup` (used), `aTimeSourceColumn` (used), `aIntervalUnit` (used), `aIntervalSize` (used), `aBucketIntervalSeconds` (used)
- `buildCalculationFilterClause` line 220: `aSourceTableName` (used), `aTagNameColumn` (used), `aTagNameList` (used), `aTimeSourceColumn` (used), `aStartTime` (used), `aEndTime` (used)
- `buildAggregateCalculationQuery` line 231: `aCalculationMode` (used), `aValueSourceColumn` (used), `aSourceFilterClause` (used), `aTimeBucketExpression` (used), `aOuterTimeExpression` (used), `aRowCount` (used)
- `buildAverageCalculationQuery` line 244: `aUseRollup` (used), `aTimeSourceColumn` (used), `aIntervalUnit` (used), `aIntervalSize` (used), `aBucketIntervalSeconds` (used), `aValueSourceColumn` (used), `aSourceFilterClause` (used), `aOuterTimeExpression` (used), `aRowCount` (used)
- `buildCountCalculationQuery` line 267: `aValueSourceColumn` (used), `aSourceFilterClause` (used), `aTimeBucketExpression` (used), `aOuterTimeExpression` (used), `aRowCount` (used)
- `buildFirstLastCalculationTimeBucket` line 279: `aUseRollup` (used), `aRollupTableList` (used), `aTableName` (used), `aIntervalUnit` (used), `aIntervalSize` (used), `aTimeSourceColumn` (used)
- `buildFirstLastCalculationQuery` line 304: `aCalculationMode` (used), `aValueSourceColumn` (used), `aSourceFilterClause` (used), `aTimeBucketExpression` (used), `aOuterTimeExpression` (used), `aRowCount` (used)

#### `ChartSeriesMapper.ts`
- `mapRowsToChartData` line 12: `aRows` (used)
- `buildChartSeriesItem` line 30: `aSeriesConfig` (used), `aRows` (used), `aUseRawLabel = default` (used), `aIncludeColor = default` (used)

#### `ChartSeriesRowsLoader.ts`
- `createEmptyFetchResponse` line 23: no parameters
- `fetchCalculatedSeriesRows` line 43: `aSeriesConfig` (used), `aTimeRange` (used), `aInterval` (used), `aCount` (used), `aRollupTableList` (used)
- `fetchRawSeriesRows` line 87: `aSeriesConfig` (used), `aTimeRange` (used), `aInterval` (used), `aCount` (used), `aSampling` (used)

#### `FetchContracts.ts`
- No named functions found.

#### `FetchRequestErrorPresenter.ts`
- `isHttpErrorResponse` line 35: `aValue` (used)
- `getRequestErrorMessage` line 51: `aResponse` (used)
- `showRequestError` line 92: `aResponse` (used)

#### `FetchSampleCountResolver.ts`
- `calculateSampleCount` line 12: `aLimit` (used), `aUseSampling` (used), `aIsRaw` (used), `aPixelsPerTick` (used), `aPixelsPerTickRaw` (used), `aChartWidth` (used)

#### `FetchSupportModules.test.ts`
- No named functions found.

#### `FetchTableNameResolver.ts`
- `getQualifiedTableName` line 10: `aTable` (used), `aAdminId` (used)
- `getCalculationTableName` line 25: `aTableName` (used)

#### `FetchTimeBoundsNormalizer.ts`
- `toUnixNanoseconds` line 16: `aTime` (used)
- `convertTimeRangeMsToTimeRangeNs` line 26: `aTimeRange` (used)

#### `RawFetchQueryBuilder.ts`
- `buildCsvTqlQuery` line 11: `aSqlQuery` (used)
- `buildRawQuery` line 28: `aTableName` (used), `aTagName` (used), `aStartTime` (used), `aEndTime` (used), `aSortDirection` (used), `aRowCount` (used), `aColumnMap` (used), `aSampling` (used)

#### `TagAnalyzerDataRepository.test.ts`
- No named functions found.

#### `TagAnalyzerDataRepository.ts`
- `parseChartCsvResponse` line 41: `aApiResponse` (used)
- `fetchCalculationData` line 70: `aCalculationRequest` (used)
- `fetchRawData` line 114: `aRawRequest` (used)
- `fetchTablesData` line 151: no parameters
- `getRollupTableList` line 167: no parameters
- `fetchParsedTables` line 229: no parameters
- `fetchTopLevelTimeBoundaryRanges` line 253: `aTagSet` (used), `aBoardTime` (used)

#### `TimeBoundaryFetchQueryBuilder.ts`
- `createTableTagMap` line 15: `aTableTagInfo` (used)
- `buildMinMaxTableQuery` line 55: `aTableTagInfo` (used), `aUserName` (used)
- `buildVirtualStatTableQuery` line 70: `aTableName` (used), `aTagNameList` (used), `aTagSet?` (used)

#### `TimeBoundaryFetchRepository.ts`
- `fetchMinMaxTable` line 22: `aTableTagInfo` (used), `aUserName` (used)
- `fetchVirtualStatTable` line 44: `aTableName` (used), `aTagNameList` (used), `aTagSet?` (used)

#### `TimeBoundaryFetchTypes.ts`
- No named functions found.

### Verify
- Named functions checked: 37
- Parameters recorded: 115
- Parameters used: 115
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
- Parameter names reviewed: 115
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
- Direct files reviewed: 16
- Code files: 15
- Test files: 2
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `FetchContracts.ts`, `TimeBoundaryFetchTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
