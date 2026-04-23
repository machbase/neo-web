# Folder Rename Audit: `src/components/tagAnalyzer/utils/fetch`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

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
- Direct tracked file count: 16

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
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
- Direct tracked code files inspected: 15
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
