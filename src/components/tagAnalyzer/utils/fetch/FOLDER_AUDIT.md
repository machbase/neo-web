# Folder Audit: `utils/fetch`

## Summary
- Date: 2026-04-22
- Direct files: `7`
- Direct subfolders: none
- Responsibility: This folder owns query builders, repositories, loaders, contracts, and fetch tests for chart data.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Helper hotspot: `utils/fetch/FetchQueryUtils.ts` (19 named functions)

## Files

### `ChartSeriesMapper.ts`
- Path: `utils/fetch/ChartSeriesMapper.ts`
- Lines: 48
- Role: Maps fetched row data into the chart-series structures used by the chart layer.
- Similar files: `chart/options/ChartSeriesUtils.ts`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `mapRowsToChartData` (7 lines, line 12) - Maps fetched tag rows into chart rows. Needs edit: No. This function is small enough and focused enough for now.
  - `buildChartSeriesItem` (18 lines, line 30) - Builds a chart series item from series config and row data. Needs edit: No. This function is small enough and focused enough for now.

### `ChartSeriesRowsLoader.ts`
- Path: `utils/fetch/ChartSeriesRowsLoader.ts`
- Lines: 142
- Role: Loads one series at a time through separate raw and calculated fetch paths.
- Similar files: `chart/options/ChartSeriesUtils.ts`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `createEmptyFetchResponse` (8 lines, line 23) - Creates an empty chart fetch response. Needs edit: No. This function is small enough and focused enough for now.
  - `hasSeriesFetchColumns` (9 lines, line 39) - Checks whether a series config includes the required fetch column map. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchCalculatedSeriesRows` (36 lines, line 60) - Fetches calculated series rows from the calculation repository. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `fetchRawSeriesRows` (33 lines, line 109) - Fetches raw series rows from the raw repository. Needs edit: No. This function is small enough and focused enough for now.

### `FetchContracts.ts`
- Path: `utils/fetch/FetchContracts.ts`
- Lines: 99
- Role: Defines the fetch-layer request, response, and load-state contracts.
- Similar files: `utils/fetch/FetchQueryUtils.ts`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `FetchQueryUtils.ts`
- Path: `utils/fetch/FetchQueryUtils.ts`
- Lines: 599
- Role: Builds fetch query text, normalizes fetch bounds, handles request errors, and calculates fetch sampling settings.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `isHttpErrorResponse` (9 lines, line 50) - Checks whether a value is an HTTP error response returned by the request client. Needs edit: No. This function is small enough and focused enough for now.
  - `getRequestErrorMessage` (34 lines, line 67) - Resolves the display message for a failed HTTP response. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `showRequestError` (7 lines, line 109) - Shows a shared request error toast for failed repository responses. Needs edit: No. This function is small enough and focused enough for now.
  - `getQualifiedTableName` (8 lines, line 125) - Resolves a table name into its qualified form. Needs edit: No. This function is small enough and focused enough for now.
  - `getCalculationTableName` (13 lines, line 141) - Resolves the table name used by calculated fetches for non-admin users. Needs edit: No. This function is small enough and focused enough for now.
  - `calculateSampleCount` (23 lines, line 167) - Calculates the number of samples to request for a chart. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveFetchTimeBounds` (26 lines, line 199) - Normalizes requested fetch bounds into the nanosecond range expected by the backend. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `buildCsvTqlQuery` (3 lines, line 233) - Wraps a SQL statement with the TQL CSV envelope used by the chart fetch endpoints. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `buildCalculationMainQuery` (110 lines, line 254) - Builds the calculated-series SQL query body. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `buildRawQuery` (45 lines, line 380) - Builds the raw-series SQL query body. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `resolveCalculationTimeBucketContext` (40 lines, line 426) - Resolves calculation time bucket context. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildTruncatedCalculationTimeBucket` (16 lines, line 467) - Builds truncated calculation time bucket. Needs edit: No. This function is small enough and focused enough for now.
  - `buildScaledCalculationTimeBucket` (18 lines, line 484) - Builds scaled calculation time bucket. Needs edit: No. This function is small enough and focused enough for now.
  - `buildCalculationFilterClause` (10 lines, line 503) - Builds calculation filter clause. Needs edit: No. This function is small enough and focused enough for now.
  - `buildAggregateCalculationQuery` (12 lines, line 514) - Builds aggregate calculation query. Needs edit: No. This function is small enough and focused enough for now.
  - `buildAverageCalculationQuery` (22 lines, line 527) - Builds average calculation query. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `buildCountCalculationQuery` (11 lines, line 550) - Builds count calculation query. Needs edit: No. This function is small enough and focused enough for now.
  - `buildFirstLastCalculationTimeBucket` (24 lines, line 562) - Builds first last calculation time bucket. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `buildFirstLastCalculationQuery` (12 lines, line 587) - Builds first last calculation query. Needs edit: No. This function is small enough and focused enough for now.

### `PanelChartDataLoader.ts`
- Path: `utils/fetch/PanelChartDataLoader.ts`
- Lines: 391
- Role: Loads panel and navigator chart datasets by resolving ranges, intervals, counts, and overflow state.
- Similar files: `utils/fetch/ChartSeriesRowsLoader.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `loadNavigatorChartState` (12 lines, line 41) - Loads chart data for the navigator view. Needs edit: No. This function is small enough and focused enough for now.
  - `loadPanelChartState` (27 lines, line 61) - Loads chart data and range state for the main panel view. Needs edit: No. This function is small enough and focused enough for now.
  - `isFetchableTimeRange` (3 lines, line 96) - Checks whether a time range can be used for fetching. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `fetchPanelDatasets` (92 lines, line 118) - Fetches datasets for a panel request. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `calculatePanelFetchCount` (16 lines, line 222) - Calculates the fetch count for a panel request. Needs edit: No. This function is small enough and focused enough for now.
  - `resolvePanelFetchTimeRange` (14 lines, line 248) - Resolves the time range used for a panel fetch. Needs edit: No. This function is small enough and focused enough for now.
  - `resolvePanelFetchInterval` (27 lines, line 275) - Resolves the interval used for a panel fetch. Needs edit: No. This function is small enough and focused enough for now.
  - `analyzePanelDataLimit` (25 lines, line 313) - Determines whether the fetched panel data hit a limit. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchPanelDatasetsFromRequest` (26 lines, line 349) - Fetches panel datasets from a panel request wrapper. Needs edit: No. This function is small enough and focused enough for now.
  - `createEmptyFetchPanelDatasetsResult` (9 lines, line 382) - Creates an empty panel fetch result. Needs edit: No. This function is small enough and focused enough for now.

### `TagAnalyzerDataRepository.ts`
- Path: `utils/fetch/TagAnalyzerDataRepository.ts`
- Lines: 259
- Role: Calls backend APIs for chart rows, rollup metadata, parsed tables, and top-level time boundaries.
- Similar files: `utils/fetch/TagMetadataSearchRepository.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `parseChartCsvResponse` (21 lines, line 36) - Parses the shared chart CSV response and preserves the original response metadata. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchCalculationData` (36 lines, line 65) - Fetches calculated chart data for a series request. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `fetchRawData` (32 lines, line 109) - Fetches raw chart data for a series request. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchTablesData` (9 lines, line 148) - Fetches the available table list from the backend. Needs edit: No. This function is small enough and focused enough for now.
  - `getRollupTableList` (48 lines, line 164) - Fetches and groups rollup metadata by user, table, and column. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `fetchParsedTables` (15 lines, line 226) - Fetches and parses the available table list. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchTopLevelTimeBoundaryRanges` (9 lines, line 250) - Fetches the top-level time boundary ranges for a series set. Needs edit: No. This function is small enough and focused enough for now.

### `TagMetadataSearchRepository.ts`
- Path: `utils/fetch/TagMetadataSearchRepository.ts`
- Lines: 290
- Role: Calls backend APIs for tag-search columns, tag paging, and tag totals.
- Similar files: `utils/fetch/TagAnalyzerDataRepository.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `fetchTableName` (28 lines, line 51) - Fetches the source column metadata for a table. Needs edit: No. This function is small enough and focused enough for now.
  - `getTagPagination` (26 lines, line 90) - Fetches one page of tag metadata rows from a table meta source. Needs edit: No. This function is small enough and focused enough for now.
  - `getTagTotal` (19 lines, line 126) - Fetches the total number of tag rows matching a filter. Needs edit: No. This function is small enough and focused enough for now.
  - `buildTableColumns` (7 lines, line 159) - Builds the tag-search column mapping from a repository response. Needs edit: No. This function is small enough and focused enough for now.
  - `getTagTotalFromResponse` (3 lines, line 174) - Reads the tag total from a repository response. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `normalizeTagSearchItems` (8 lines, line 185) - Normalizes tag-search rows into UI items. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchTagSearchColumns` (24 lines, line 201) - Fetches the searchable column names for a table. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchTagSearchPage` (39 lines, line 236) - Fetches one page of tag-search results. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `getMetaTableName` (7 lines, line 283) - Builds the meta-table name for a source table. Needs edit: No. This function is small enough and focused enough for now.

