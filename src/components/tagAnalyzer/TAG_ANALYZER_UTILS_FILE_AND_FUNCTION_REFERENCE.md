# TagAnalyzer Utils File And Function Reference

Scope: `src/components/tagAnalyzer/utils`

This document includes every file that currently exists under the `utils` folder, including production files, test files, and existing markdown files.

## Root

### `boardTypes.ts`
Role: Defines the board-level state shapes, payloads, and handler contracts that connect Tag Analyzer panels to board state.

Functions: none.

### `panelModelTypes.ts`
Role: Defines the persisted and editable panel model structure for metadata, data settings, time settings, axes, and display settings.

Functions: none.

### `panelRuntimeTypes.ts`
Role: Defines the runtime-only panel state, chart handles, view state, and callback contracts used while a panel is mounted.

Functions: none.

### `UTILS_FOLDER_AUDIT.md`
Role: Records a utils-folder audit with refactor observations, duplicate hotspots, and file-by-file cleanup notes.

Functions: none.

## Fetch

### `fetch/ApiRepository.test.ts`
Role: Verifies that calculated fetch requests build the expected backend query text for representative aggregation and rollup scenarios.

Functions: none.

### `fetch/ApiRepository.ts`
Role: Handles low-level fetch query construction and backend requests for chart data, table metadata, rollup metadata, and tag-search metadata.

Functions:
- `resolveFetchTimeBounds`: Normalizes requested timestamps into the precision and boundary shape expected by the backend fetch queries.
- `buildCsvTqlQuery`: Wraps a SQL statement in the TQL `CSV()` envelope used by the chart fetch endpoint.
- `parseChartCsvResponse`: Converts a successful CSV response into chart rows and surfaces backend errors through the shared toast path.
- `getCalculationTableName`: Resolves the table name that calculated queries should use for the current user context.
- `resolveCalculationTimeBucketContext`: Chooses the outer timestamp expression and non-rollup bucket size used by calculated queries.
- `buildTruncatedCalculationTimeBucket`: Builds the bucket expression used by sum, min, and max calculation queries.
- `buildScaledCalculationTimeBucket`: Builds the bucket expression used by average and count calculation queries.
- `buildCalculationFilterClause`: Builds the shared `from ... where ...` clause for calculated queries.
- `buildAggregateCalculationQuery`: Builds the final SQL for sum, min, and max calculation modes.
- `buildAverageCalculationQuery`: Builds the final SQL for average calculation mode.
- `buildCountCalculationQuery`: Builds the final SQL for count calculation mode.
- `buildFirstLastCalculationTimeBucket`: Builds the bucket expression used by first and last calculation queries.
- `buildFirstLastCalculationQuery`: Builds the final SQL for first and last calculation modes.
- `buildCalculationMainQuery`: Routes a calculated fetch request to the correct calculation SQL builder.
- `buildRawQuery`: Builds the SQL used for raw series fetches, including ordering, limits, and sampling hints.
- `fetchTableName`: Fetches source column metadata for a table so tag search can learn the name, time, and value columns.
- `fetchCalculationData`: Sends a calculated series query to the backend and normalizes the returned chart data.
- `fetchRawData`: Sends a raw series query to the backend and normalizes the returned chart data.
- `fetchVirtualStatTable`: Fetches virtual-stat or direct-table min and max times for a tag set.
- `fetchTablesData`: Fetches the raw list of available tables from the backend.
- `getRollupTableList`: Fetches rollup metadata and groups it by user, table, and column for rollup-aware fetch logic.
- `getTagPagination`: Fetches one page of tag metadata rows from a table's meta table.
- `getMetaTableName`: Derives the meta-table name used for tag pagination and tag totals.
- `getTagTotal`: Fetches the total number of tags that match the current meta-table filter.

### `fetch/ChartMapping.ts`
Role: Converts fetch-layer rows into chart-layer series data and detects raw-data truncation state for panel rendering.

Functions:
- `mapRowsToChartData`: Copies fetch rows into the `[time, value]` tuple shape consumed by chart code.
- `buildChartSeriesItem`: Combines series metadata and chart rows into one chart-series object.
- `analyzePanelDataLimit`: Detects when a raw fetch hit the requested limit and returns the limit boundary that should be preserved.

### `fetch/FetchHelpers.test.ts`
Role: Verifies the small pure helpers that qualify table names and calculate sample counts.

Functions: none.

### `fetch/FetchHelpers.ts`
Role: Provides small pure helpers shared by fetch workflows so common table-name and sample-count rules stay consistent.

Functions:
- `getQualifiedTableName`: Prefixes an unqualified table name with the admin schema while leaving qualified names unchanged.
- `calculateSampleCount`: Calculates the sample count a chart fetch should request based on limit, sampling mode, raw mode, and chart width.

### `fetch/FetchTypes.ts`
Role: Defines the request, response, workflow, and limit-state types used by the fetch layer.

Functions: none.

### `fetch/FetchWorkflow.test.ts`
Role: Verifies chart mapping, repository routing, time-range validation, interval resolution, and dataset assembly across the shared panel fetch workflow.

Functions: none.

### `fetch/PanelFetchWorkflow.ts`
Role: Orchestrates panel and navigator dataset loading by resolving ranges, intervals, counts, and per-series fetches in one place.

Functions:
- `loadNavigatorChartState`: Loads the navigator chart datasets by reusing the shared panel fetch pipeline with navigator-specific settings.
- `loadPanelChartState`: Loads the main panel datasets and attaches the overflow range information needed by the panel UI.
- `isFetchableTimeRange`: Returns whether a candidate time range is concrete, positive, and ordered well enough for fetching.
- `fetchPanelDatasets`: Resolves fetch settings and loads every requested series into one panel dataset result.
- `calculatePanelFetchCount`: Derives the row count to request for a panel fetch by delegating to the shared sampling helper.
- `resolvePanelFetchTimeRange`: Chooses the fetch time range from the explicit override or from the panel and board time sources.
- `resolvePanelFetchInterval`: Chooses an explicit stored interval when present or calculates one from the chart context.
- `fetchPanelDatasetsFromRequest`: Unpacks the request wrapper and forwards it to the main dataset fetch workflow.
- `createEmptyFetchPanelDatasetsResult`: Returns the empty result shape used when a panel fetch cannot load data.

### `fetch/ChartSeriesRowsLoader.ts`
Role: Loads row data for one series at a time and exposes separate raw and calculated fetch entry points.

Functions:
- `createEmptyFetchResponse`: Returns the empty chart-fetch response used for invalid fetch paths.
- `hasSeriesFetchColumns`: Checks whether a series config includes the required fetch column names.
- `fetchCalculatedSeriesRows`: Validates the time range, builds one calculated-series fetch request, and sends it to the calculation repository.
- `fetchRawSeriesRows`: Validates the time range, builds one raw-series fetch request, and sends it to the raw repository.

### `fetch/TagSearchRepository.ts`
Role: Handles tag-search column discovery and paginated tag-search loading for the shared tag selection UI.

Functions:
- `buildTableColumns`: Maps raw table-column rows into the normalized tag-search column structure.
- `getTagTotalFromResponse`: Extracts the tag total count from the repository response payload.
- `normalizeTagSearchItems`: Converts raw pagination rows into the item objects used by the tag picker UI.
- `fetchTagSearchColumns`: Loads the searchable name, time, and value columns for a table.
- `fetchTagSearchPage`: Loads one page of tag-search items together with the total result count.

## Legacy

### `legacy/LegacySeriesAdapter.test.ts`
Role: Verifies that legacy tag names, legacy series configs, and legacy chart series convert correctly into the modern series shapes.

Functions: none.

### `legacy/LegacySeriesAdapter.ts`
Role: Adapts legacy series naming, series configuration, and chart-series payloads into the modern Tag Analyzer series model and back again.

Functions:
- `getSourceTagName`: Reads the normalized source tag name from either `sourceTagName` or legacy `tagName`.
- `withNormalizedSourceTagName`: Returns one item with its source tag name normalized onto the `sourceTagName` field.
- `normalizeSourceTagNames`: Normalizes the source tag name on every item in a list.
- `normalizeLegacySeriesConfigs`: Converts a list of legacy-compatible series configs into modern series configs.
- `normalizeLegacyChartSeries`: Converts a legacy chart-series payload into the row-based chart data shape.
- `toLegacyTagNameItem`: Converts one modern item back into the legacy `tagName` field shape.
- `toLegacyTagNameList`: Converts a list of modern items back into the legacy `tagName` field shape.
- `toLegacySeriesConfigs`: Converts modern series configs into the legacy-compatible series config list used by storage.
- `legacySeriesToChartPoints`: Converts a legacy or normalized series payload into point objects for chart utilities.
- `normalizeLegacySeriesConfig`: Converts one legacy-compatible series config into the modern series config shape.
- `fromLegacyBoolean`: Converts a legacy `Y` or `N` flag into a boolean.
- `toLegacyBoolean`: Converts a boolean into a legacy `Y` or `N` flag.
- `legacyChartSeriesHasArrays`: Checks whether a legacy chart series stores its data as `xData` and `yData` arrays.
- `legacyChartSeriesToRows`: Converts a legacy chart series into row tuples.

### `legacy/LegacyStorageAdapter.test.ts`
Role: Verifies that legacy flat panel storage converts cleanly into nested panel state and round-trips back without changing the visible structure.

Functions:
- `normalizeLegacyPanelInfoForTest`: Wraps a legacy flat panel in a temporary board fixture so tests can normalize it through the real board adapter path.

### `legacy/LegacyStorageAdapter.ts`
Role: Converts legacy board and panel storage records into the modern board model and serializes modern panel state back into legacy storage format.

Functions:
- `normalizeBoardInfo`: Converts one legacy board record into the nested modern board model.
- `toLegacyFlatPanelInfo`: Flattens one modern panel into the legacy storage record shape.
- `getNextBoardListWithSavedPanels`: Replaces one board's panels with a fresh saved legacy panel list.
- `getNextBoardListWithSavedPanel`: Replaces one saved panel inside a board's legacy panel list.
- `getNextBoardListWithoutPanel`: Removes one saved panel from a board's legacy panel list.
- `normalizeLegacyPanelInfo`: Converts one legacy flat panel record into the nested modern panel model.
- `normalizeLegacyFlatPanelInfo`: Repairs and normalizes legacy flat panel values before nested grouping happens.
- `createNormalizedPanelInfo`: Builds the nested modern panel object from normalized legacy panel values.
- `resolvePanelTimeRangeConfig`: Chooses the time-range config that should be stored for a panel.
- `updateBoardPanels`: Writes a replacement panel list back into the matching board only.
- `findBoardPanels`: Finds the legacy panel list for one board id.
- `createLegacyPanelList`: Converts a list of nested panels into legacy flat panel records.
- `replaceLegacyPanel`: Replaces one legacy panel entry by panel key.
- `removeLegacyPanel`: Removes one legacy panel entry by panel key.
- `fromLegacyBoolean`: Converts a legacy `Y` or `N` value into a boolean.
- `toLegacyBoolean`: Converts a boolean into a legacy `Y` or `N` value.
- `normalizeNumericValue`: Converts a legacy numeric field into a safe number.
- `normalizeLegacyTimeKeeper`: Converts the legacy time-keeper field into the optional object shape used by runtime code.

### `legacy/LegacyStorageAdapterBoardSave.test.ts`
Role: Verifies the board-save helpers that replace one panel, replace all panels, or remove one panel from a saved board.

Functions: none.

### `legacy/LegacyTimeAdapter.test.ts`
Role: Verifies that legacy time values convert into structured boundaries and round-trip back into legacy scalar values.

Functions: none.

### `legacy/LegacyTimeAdapter.ts`
Role: Converts legacy time values, legacy time-range inputs, and legacy boundary pairs into the structured time model used by Tag Analyzer.

Functions:
- `normalizeLegacyTimeBoundaryRanges`: Converts legacy min and max boundary pairs into the nested `ValueRangePair` shape.
- `normalizeLegacyTimeRangeBoundary`: Converts legacy start and end time values into resolved structured time bounds.
- `toLegacyTimeRangeInput`: Serializes a structured time-range source back into legacy `bgn` and `end` input fields.
- `toLegacyTimeValue`: Converts one structured time boundary into the legacy scalar value form.
- `legacyMinMaxPairToRange`: Converts one legacy min and max pair into a numeric range when both sides are valid.
- `normalizeLegacyTimeBoundary`: Converts one legacy time value into the shared structured boundary model.

### `legacy/LegacyTypes.ts`
Role: Defines the legacy-compatible types used at the storage and adapter boundary for boards, panels, series, and time values.

Functions: none.

## Series

### `series/seriesTypes.ts`
Role: Defines the core series, chart-row, chart-series, chart-data, and summary item types used across the Tag Analyzer feature.

Functions: none.

### `series/TagAnalyzerSeriesDataUtils.ts`
Role: Converts different series data shapes into one shared point representation for downstream chart and summary logic.

Functions:
- `seriesDataToPoints`: Converts concrete series data into normalized `{ x, y }` point objects.
- `chartSeriesToPoints`: Converts a chart-series item into normalized point objects.

### `series/TagAnalyzerSeriesLabelUtils.test.ts`
Role: Verifies the short, editor, and chart label rules for series names.

Functions: none.

### `series/TagAnalyzerSeriesLabelUtils.ts`
Role: Centralizes how series labels are formatted for chart display, editor display, and shorter list display.

Functions:
- `formatSeriesLabel`: Formats a series label for the requested display target and raw-label option.
- `getSeriesShortName`: Returns the compact label used for short series displays.
- `getSeriesEditorName`: Returns the label used in series-editing views.
- `getSeriesName`: Returns the label used by chart rendering paths.

### `series/TagAnalyzerSeriesUtils.test.ts`
Role: Verifies that visible series data is summarized into the expected min, max, and average rows.

Functions: none.

### `series/TagAnalyzerSeriesUtils.ts`
Role: Defines Tag Analyzer aggregation options and builds summary rows for the currently visible series values.

Functions:
- `buildSeriesSummaryRows`: Builds per-series min, max, and average summary rows for the selected time window.

### `series/TagSelectionSeriesUtils.test.ts`
Role: Verifies chart-creation seed building, default-range padding, and selected-tag merging behavior.

Functions: none.

### `series/TagSelectionSeriesUtils.ts`
Role: Converts selected tag drafts into initial chart state and merged series configuration lists for chart creation flows.

Functions:
- `buildDefaultRange`: Returns the default chart range and pads zero-width ranges so the chart stays visible.
- `buildCreateChartSeed`: Builds the initial chart-creation seed from chart type, selected tags, and time bounds.
- `mergeSelectedTagsIntoTagSet`: Merges selected tag drafts into an existing series config list.

## Time

### `time/IntervalUtils.test.ts`
Role: Verifies interval normalization, millisecond conversion, interval calculation, and duration-label formatting.

Functions: none.

### `time/IntervalUtils.ts`
Role: Owns time-unit normalization, interval calculation, interval-to-milliseconds conversion, and compact duration formatting for Tag Analyzer time logic.

Functions:
- `normalizeTimeUnit`: Maps a user-facing time-unit string to the internal `TimeUnit` value.
- `convertIntervalUnit`: Converts a unit string into the normalized interval-unit name when a known mapping exists.
- `getTimeUnitMilliseconds`: Converts a unit and value pair into milliseconds.
- `getIntervalMs`: Converts a supported interval-unit string and value into milliseconds.
- `calculateInterval`: Calculates the interval type and value a chart should use for the current visible time span.
- `resolveInterval`: Selects the interval specification that best matches the calculated seconds-per-tick scale.
- `formatDurationLabel`: Formats a start and end time into a compact duration label.
- `formatDurationPart`: Formats one duration part and suppresses it when the value is zero.

### `time/PanelRangeInteractionUtils.ts`
Role: Encapsulates the math used to zoom, focus, and shift panel and navigator time ranges in response to chart interactions.

Functions:
- `getNavigatorRangeFromEvent`: Converts a navigator drag event into a concrete time range with a minimum width.
- `getZoomInPanelRange`: Shrinks a panel range around its center by the requested zoom factor.
- `getZoomOutRange`: Expands a panel range and returns a navigator update when the new range escapes the current navigator bounds.
- `getFocusedPanelRange`: Builds a focused panel range and matching navigator range around the current panel center.
- `createPanelRangeControlHandlers`: Builds the shift and zoom handler set that applies resolved range updates through one setter.
- `getMovedPanelRange`: Shifts the panel range and expands the navigator when the panel would move outside it.
- `getMovedNavigatorRange`: Shifts the panel and navigator ranges together by the navigator movement offset.
- `getClampedNavigatorFocusRange`: Centers a focused navigator range while keeping it inside the current navigator bounds.
- `getRangeWidth`: Returns the width of a time range.
- `shiftTimeRange`: Moves a time range by a fixed offset.
- `getDirectionOffset`: Converts a movement direction and range width into a signed offset.
- `isRangeOutsideBounds`: Returns whether a range extends outside another range.
- `applyRangeUpdate`: Applies a computed range update only when one exists.

### `time/PanelTimeRangeResolver.test.ts`
Role: Verifies the shared time-range helpers that normalize panel ranges, restore saved ranges, and choose global time targets.

Functions: none.

### `time/PanelTimeRangeResolver.ts`
Role: Resolves panel time ranges for initialize and reset flows by combining board time, panel time, fetched boundary data, and relative-time rules.

Functions:
- `resolvePanelTimeRange`: Resolves the active panel time range for the current mode and inputs.
- `resolveResetTimeRange`: Resolves the panel time range for a reset flow by forcing reset mode through the shared resolver.
- `resolveInitialPanelRange`: Resolves the panel time range for an initialize flow by forcing initialize mode through the shared resolver.
- `fetchMinMaxTable`: Fetches the backend min and max table response for a grouped series set.
- `resolveTimeBoundaryRanges`: Resolves fetched boundary times into the normalized `ValueRangePair` structure used by callers.
- `normalizeTimeBoundsInput`: Wraps an optional numeric range and range config into the `InputTimeBounds` union.
- `normalizeTimeRangeConfig`: Converts a structured time-range config into resolved numeric bounds.
- `isSameTimeRange`: Returns whether two time ranges have exactly the same start and end values.
- `toConcreteTimeRange`: Converts a numeric range or structured config into a concrete optional time range.
- `normalizeResolvedTimeBounds`: Converts resolved time bounds into a concrete optional time range when the values are valid.
- `normalizeBoardTimeRangeInput`: Converts board time input into a concrete optional time range.
- `normalizePanelTimeRangeSource`: Converts panel time data into the internal panel range and default-range source shape.
- `setTimeRange`: Chooses the active time range from panel range, board range, or panel default range.
- `restoreTimeRangePair`: Restores a saved panel and navigator range pair only when both ranges are complete.
- `resolveGlobalTimeTargetRange`: Chooses the pre-overflow range when present and otherwise uses the panel range.
- `resolveEditModeRange`: Resolves the range candidate that should be used while the panel is in edit mode.
- `resolveTopLevelRange`: Resolves the highest-priority range candidate before lower-priority rules run.
- `resolveFallbackRange`: Resolves the last fallback range when no earlier rule produced one.
- `shouldIncludeAbsolutePanelRange`: Returns whether the reset flow should consider the panel's explicit absolute range.
- `normalizeBoardLastRange`: Resolves a board-level `last` range against fetched boundary data.
- `normalizeEditBoardLastRange`: Builds the edit-mode board range from the last fetched boundary maxima.
- `getDefaultBoardRange`: Builds the final default board range from board input and panel defaults.
- `normalizeEditPreviewTimeRange`: Builds the edit preview range from fetched boundary minima and maxima.
- `normalizeAbsolutePanelRange`: Returns the panel's explicit absolute range when its config is absolute.
- `normalizeNowPanelRange`: Resolves a now-relative panel range through the shared panel and board source selection.
- `getRelativePanelLastRange`: Resolves a panel-level `last` range by fetching time boundaries for the panel's tag set.
- `resolvePanelRangeFromRules`: Applies the panel range rule chain in priority order and returns the first match.
- `createTableTagMap`: Groups series metadata by table for the min and max query builder.
- `resolveBoundaryValueRangePair`: Resolves boundary min and max timestamps into `ValueRangePair`, including virtual-stat lookups for `last` ranges.
- `buildConcreteTimeRange`: Builds a concrete optional time range from structured boundaries when both boundaries are usable.
- `isCompleteTimeRange`: Returns whether a partial time range contains both `startTime` and `endTime`.

### `time/RelativeTimeUtils.ts`
Role: Resolves parsed relative time boundaries and ranges into concrete timestamps, especially for `last`-anchored ranges.

Functions:
- `subtractTimeOffset`: Subtracts a millisecond offset from a base timestamp.
- `getRelativeTimeOffsetMilliseconds`: Converts a parsed relative boundary into the millisecond offset from its anchor time.
- `resolveLastRelativeBoundaryTime`: Resolves one `last`-relative boundary into a concrete timestamp.
- `resolveLastRelativeTimeRange`: Resolves one `last`-relative range config into a concrete time range.

### `time/TimeRangeFlow.test.ts`
Role: Verifies end-to-end panel range behavior for zooming, shifting, focusing, initialize flows, reset flows, and saved-range restoration.

Functions:
- `createBoardRangeParams`: Builds a normalized board-time test payload from legacy start and end input values.

### `time/TimeRangeParsing.test.ts`
Role: Verifies time-range parsing, time-range formatting, axis-label formatting, and the structured range-type guards.

Functions: none.

### `time/TimeRangeParsing.ts`
Role: Parses, formats, classifies, and resolves structured time boundaries and time-range configs for editor and chart time behavior.

Functions:
- `createRelativeTimeBoundary`: Builds a structured relative time boundary from its parsed parts.
- `parseTimeRangeInputValue`: Parses an editor input string into a structured time boundary.
- `formatTimeRangeInputValue`: Formats a structured time boundary back into the editor input string.
- `formatAxisTime`: Formats a chart axis timestamp according to the currently visible time span.
- `isEmptyTimeBoundary`: Returns whether a time boundary is empty.
- `isAbsoluteTimeBoundary`: Returns whether a time boundary is absolute.
- `isRelativeTimeBoundary`: Returns whether a time boundary is relative.
- `isLastRelativeTimeBoundary`: Returns whether a time boundary is relative and anchored to `last`.
- `isNowRelativeTimeBoundary`: Returns whether a time boundary is relative and anchored to `now`.
- `isRelativeTimeRangeConfig`: Returns whether both boundaries in a range config are relative.
- `isLastRelativeTimeRangeConfig`: Returns whether both boundaries in a range config are `last`-relative.
- `isNowRelativeTimeRangeConfig`: Returns whether both boundaries in a range config are `now`-relative.
- `isAbsoluteTimeRangeConfig`: Returns whether both boundaries in a range config are absolute.
- `resolveTimeBoundaryValue`: Converts a structured boundary into a concrete timestamp when that boundary type supports direct resolution.
- `hasTimeRangeConfigBoundaries`: Checks whether both boundaries in a range config satisfy the requested boundary predicate.
- `parseRelativeTimeBoundary`: Parses a relative time expression like `now-1h` or `last-30m` into a structured boundary.
- `formatRelativeTimeBoundaryExpression`: Formats a structured relative boundary back into its expression string.

### `time/timeTypes.ts`
Role: Defines the shared time units, boundary models, range models, resolver parameter shapes, and result unions used across Tag Analyzer time logic.

Functions: none.
