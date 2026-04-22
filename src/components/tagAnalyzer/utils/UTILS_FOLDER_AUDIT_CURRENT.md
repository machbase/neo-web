# TagAnalyzer Utils Folder Audit (Current)

Scope: `src/components/tagAnalyzer/utils`

Date: `2026-04-20`

This file is a fresh inventory of the current utils folder after the rename and consolidation work.

Notes:
- This audit covers the files that existed before this file was created.
- It supersedes the older planning-style audit in `UTILS_FOLDER_AUDIT.md`.
- It includes only auditable production files, type-only files, and historical audit references.

## Summary

- Total files in folder now: `41`
- Root files: `5`
- `fetch/` files: `10`
- `legacy/` files: `8`
- `series/` files: `8`
- `time/` files: `10`

Current large production hotspots:
- `time/PanelTimeRangeResolver.ts` (`747` lines): main time-range rule engine plus boundary-fetch helpers.
- `fetch/FetchQueryUtils.ts` (`460` lines): mixed query-builder module with some non-query responsibilities still inside it.
- `legacy/LegacyStorageAdapter.ts` (`390` lines): legacy board/panel storage normalization and serialization.
- `fetch/TagAnalyzerDataRepository.ts` (`262` lines): lower-level backend request/response adapter for chart and table data.
- `fetch/PanelChartDataLoader.ts` (`315` lines): chart-state loader for the main panel and navigator views.

## Root Files

### `boardTypes.ts` (`79` lines)
Role: board-level shared types for state, actions, overlap selection, and global time state.

Functions: none.

### `panelModelTypes.ts` (`61` lines)
Role: normalized panel domain model types for `meta`, `data`, `time`, `axes`, and `display`.

Functions: none.

### `panelRuntimeTypes.ts` (`93` lines)
Role: runtime-only panel types for presentation state, handlers, refs, visible series, and chart navigation state.

Functions: none.

### `fetch/ChartSeriesMapper.ts` (`77` lines)
Role: converts repository rows into chart-ready series data.

Functions:
- `mapRowsToChartData`: reduces fetched rows to `[time, value]` chart tuples.
- `buildChartSeriesItem`: builds a chart-series object with name, axis, marker, and optional color.

Audit note:
- This file is now cleaner because `analyzePanelDataLimit` was moved out into `PanelChartDataLoader.ts`.
- It now has one clear job: row-to-chart transformation.

### `fetch/ChartSeriesRowsLoader.ts`
Role: loads row data for one series at a time. This file sits between chart-state loaders and the low-level repository API, and it exposes separate raw and calculated entry points.

Functions:
- `createEmptyFetchResponse`: returns an empty row-response shape for invalid requests.
- `hasSeriesFetchColumns`: checks that the series has the required name/time/value columns.
- `fetchCalculatedSeriesRows`: validates the time range, builds one calculated-series request, and sends it through the repository API.
- `fetchRawSeriesRows`: validates the time range, builds one raw-series request, and sends it through the repository API.

Audit note:
- This is the best single-file extraction for the fetch folder because it makes the responsibility chain easier to read:
- `PanelChartDataLoader.ts` loads whole chart state.
- `ChartSeriesRowsLoader.ts` loads one series and makes the raw-vs-calculated choice explicit at the call site.
- `TagAnalyzerDataRepository.ts` talks to backend endpoints.
- `FetchQueryUtils.ts` builds SQL/TQL query text.

### `fetch/FetchContracts.ts` (`86` lines)
Role: type-only contracts for fetch requests, responses, dataset payloads, and panel fetch workflow shapes.

Functions: none.

### `fetch/FetchQueryUtils.ts` (`460` lines)
Role: mixed fetch query module. Its main job is SQL/TQL construction, but it also currently owns error toasts, table qualification, sample-count logic, and timestamp normalization.

Functions:
- `showRequestError`: shows a shared toast message for failed repository responses.
- `getQualifiedTableName`: prefixes unqualified tables with the admin schema.
- `getCalculationTableName`: prefixes calculation queries with the current user schema when needed.
- `calculateSampleCount`: computes fetch sample count from chart width and sampling settings.
- `resolveFetchTimeBounds`: normalizes requested timestamps to the backend precision rules.
- `buildCsvTqlQuery`: wraps SQL in the TQL `SQL(...)\nCSV()` envelope.
- `buildCalculationMainQuery`: chooses and builds the calculated query for the requested aggregation mode.
- `buildRawQuery`: builds the raw-data SQL query, including optional sorting, sampling, and limits.
- `resolveCalculationTimeBucketContext`: chooses outer time expression and non-rollup interval scale.
- `buildTruncatedCalculationTimeBucket`: builds the rollup or `DATE_TRUNC(...)` time-bucket expression.
- `buildScaledCalculationTimeBucket`: builds scaled time buckets for `avg` and `cnt`.
- `buildCalculationFilterClause`: builds the common `from ... where ...` filter block.
- `buildAggregateCalculationQuery`: builds `sum`, `min`, or `max` SQL.
- `buildAverageCalculationQuery`: builds `avg` SQL using `sum/count`.
- `buildCountCalculationQuery`: builds count SQL.
- `buildFirstLastCalculationTimeBucket`: builds first/last bucket syntax with rollup-ext handling.
- `buildFirstLastCalculationQuery`: builds `first` and `last` SQL.

Audit note:
- This file name says "query utils", but not everything here is really query building.
- The SQL-builder part is clear. The non-query parts are what make the responsibility feel blurred.
- Best split without creating new files:
- Keep here: `buildCalculationMainQuery`, `buildRawQuery`, `buildCsvTqlQuery`, and the internal calculation-query builder helpers.
- Move to `fetch/PanelChartDataLoader.ts`: `calculateSampleCount`, because that is panel fetch sizing policy, not query generation.
- Move to `fetch/TagAnalyzerDataRepository.ts`: `getQualifiedTableName`, `getCalculationTableName`, and possibly `resolveFetchTimeBounds`, because those are closer to request assembly than to reusable SQL composition.
- Keep `showRequestError` here only if you want one shared cross-module helper and still want to avoid creating another file. Otherwise this is the next responsibility that makes the file feel less like "query utils".

### `fetch/PanelChartDataLoader.ts` (`315` lines)
Role: loads chart state for the panel runtime. More specifically, it turns `PanelFetchRequest` plus panel/board settings into:
- main panel chart state: datasets, interval, and overflow range
- navigator chart state: datasets only

This file does not load React components or files from disk. It is the fetch-and-assembly layer for chart runtime state.

Functions:
- `loadNavigatorChartState`: loads the navigator chart datasets.
- `loadPanelChartState`: loads the main panel chart state, including datasets, interval, and overflow-range metadata.
- `isFetchableTimeRange`: validates that a time range is concrete and forward-moving.
- `fetchPanelDatasets`: shared series-loading pipeline used by both panel and navigator loaders.
- `calculatePanelFetchCount`: derives the count sent to the fetch layer.
- `resolvePanelFetchTimeRange`: resolves panel fetch range from explicit override, panel time, and board time.
- `resolvePanelFetchInterval`: resolves explicit or calculated interval settings.
- `analyzePanelDataLimit`: computes overflow state for raw panel fetches.
- `fetchPanelDatasetsFromRequest`: unwraps a `PanelFetchRequest` and short-circuits empty tag sets.
- `createEmptyFetchPanelDatasetsResult`: returns the shared empty result shape.

Audit note:
- The current name is better than the old `PanelFetchWorkflow.ts`, and it is clearer now that the file calls `fetchRawSeriesRows` and `fetchCalculatedSeriesRows` directly instead of routing through a boolean-based one-series helper.
- If you want a more explicit name later, `PanelChartStateLoader.ts` would describe the file more precisely.

### `fetch/TagAnalyzerDataRepository.ts` (`262` lines)
Role: API adapter between the chart-loading code and the backend fetch endpoints.

Current responsibilities inside this file:
- execute calculated chart queries
- execute raw chart queries
- parse CSV chart responses into row data
- load table list and rollup metadata
- provide top-level table and boundary fetch helpers used by the broader tag analyzer flow

This file is clearer than before because the one-series row-loading logic moved into `ChartSeriesRowsLoader.ts`.

Functions:
- `parseChartCsvResponse`: validates repository responses and parses CSV payloads into chart rows.
- `fetchCalculationData`: sends calculated queries and returns parsed chart data.
- `fetchRawData`: sends raw queries and returns parsed chart data.
- `fetchTablesData`: loads the raw table list from `/api/tables`.
- `getRollupTableList`: loads and groups rollup metadata by user, table, and column.
- `fetchParsedTables`: returns parsed table names from the tables API response.
- `fetchTopLevelTimeBoundaryRanges`: resolves board-level time-boundary ranges for a tag set.

Main non-function contents:
- `tagAnalyzerDataApi`: grouped repository API object used by tests and callers.

Audit note:
- The cleanest responsibility for this file is now close to: "send backend requests and return parsed transport results."
- The one remaining slightly broader item is `fetchTopLevelTimeBoundaryRanges`, because that is more about board time-boundary loading than raw chart transport.

### `fetch/TagMetadataSearchRepository.ts` (`263` lines)
Role: repository for tag metadata lookup, meta-table pagination, and tag-selection column discovery.

Functions:
- `fetchTableName`: loads system-column metadata for one source table.
- `getTagPagination`: loads one page of rows from a tag meta table.
- `getTagTotal`: loads total matching tag count from a tag meta table.
- `buildTableColumns`: maps returned rows into `{ name, time, value }`.
- `getTagTotalFromResponse`: extracts the total count from the repository response.
- `normalizeTagSearchItems`: maps raw rows into tag-picker item objects.
- `fetchTagSearchColumns`: resolves source columns for the tag search UI.
- `fetchTagSearchPage`: loads the current item page plus total count.
- `getMetaTableName`: derives the meta-table name for a source table.

Main non-function contents:
- `EMPTY_TAG_SELECTION_COLUMNS`
- `tagSearchApi`

## Legacy

### `legacy/LegacySeriesAdapter.ts` (`215` lines)
Role: adapters between legacy series/tag formats and the current normalized series model.

Functions:
- `getSourceTagName`: resolves one canonical source-tag name from `sourceTagName` or `tagName`.
- `withNormalizedSourceTagName`: returns one item with a normalized `sourceTagName`.
- `normalizeSourceTagNames`: batch-normalizes a list of legacy items.
- `normalizeLegacySeriesConfigs`: converts legacy-compatible configs into modern `SeriesConfig` items.
- `normalizeLegacyChartSeries`: converts legacy chart-series payloads into row-based chart data.
- `toLegacyTagNameItem`: restores the legacy `tagName` field for one item.
- `toLegacyTagNameList`: batch-restores legacy `tagName` fields.
- `toLegacySeriesConfigs`: serializes modern series configs back to legacy-compatible records.
- `legacySeriesToChartPoints`: converts legacy chart-series payloads into point objects.
- `normalizeLegacySeriesConfig`: internal legacy-config to modern-config conversion.
- `fromLegacyBoolean`: converts legacy `Y/N` to boolean.
- `toLegacyBoolean`: converts boolean to legacy `Y/N`.
- `legacyChartSeriesHasArrays`: detects legacy `xData` / `yData` payloads.
- `legacyChartSeriesToRows`: converts legacy chart-series payloads into chart rows.

### `legacy/LegacyStorageAdapter.ts` (`390` lines)
Role: converts between legacy stored board/panel data and the current normalized models.

Functions:
- `normalizeBoardInfo`: converts a legacy board record into the modern nested board model.
- `toLegacyFlatPanelInfo`: flattens a modern panel back into the legacy storage shape.
- `getNextBoardListWithSavedPanels`: saves a full panel list into one board.
- `getNextBoardListWithSavedPanel`: replaces one saved panel inside a board.
- `getNextBoardListWithoutPanel`: removes one saved panel from a board.
- `normalizeLegacyPanelInfo`: internal legacy-flat-panel to modern-panel conversion.
- `normalizeLegacyFlatPanelInfo`: repairs legacy field types and defaults before grouping.
- `createNormalizedPanelInfo`: assembles the nested `PanelInfo` object.
- `resolvePanelTimeRangeConfig`: chooses saved or derived range config for serialization.
- `updateBoardPanels`: replaces panels on the matching board only.
- `findBoardPanels`: locates the panel list for one board id.
- `createLegacyPanelList`: converts nested panels to legacy flat records.
- `replaceLegacyPanel`: replaces one panel in a legacy flat list.
- `removeLegacyPanel`: removes one panel from a legacy flat list.
- `normalizeNumericValue`: coerces legacy numeric fields into numbers.
- `normalizeLegacyTimeKeeper`: removes empty-string sentinels from saved time-keeper data.

### `legacy/LegacyTimeAdapter.ts` (`135` lines)
Role: adapters between legacy time values and the current structured time-boundary model.

Functions:
- `normalizeLegacyTimeBoundaryRanges`: converts legacy boundary min/max pairs into `ValueRangePair`.
- `normalizeLegacyTimeRangeBoundary`: converts legacy start/end values into `ResolvedTimeBounds`.
- `toLegacyTimeRangeInput`: serializes a modern range source into legacy `bgn` / `end` values.
- `toLegacyTimeValue`: converts one `TimeBoundary` into the legacy scalar format.
- `legacyMinMaxPairToRange`: validates a numeric min/max pair and returns a `ValueRange`.
- `normalizeLegacyTimeBoundary`: converts one legacy time value into the structured `TimeBoundary` model.

### `legacy/LegacyTypes.ts` (`121` lines)
Role: type-only definitions for legacy board records, flat panels, legacy series configs, and legacy time values.

Functions: none.

## Series

### `series/SeriesLabelFormatter.ts` (`71` lines)
Role: shared series-label formatter for short, editor, and chart display targets.

Functions:
- `formatSeriesLabel`: formats a series name for `short`, `editor`, or `chart` output.
- `getSeriesShortName`: returns the short list/selection label.
- `getSeriesEditorName`: returns the editor label.
- `getSeriesName`: returns the chart label, with optional raw mode.

### `series/SeriesPointConverters.ts` (`51` lines)
Role: point conversion helpers that normalize row tuples and point objects into one point shape.

Functions:
- `seriesDataToPoints`: converts mixed row/point series data into normalized point objects.
- `chartRowsToPoints`: converts row tuples into points.
- `chartSeriesToPoints`: converts a chart-series wrapper into points.

### `series/SeriesSummaryUtils.ts` (`59` lines)
Role: builds summary rows and exposes aggregation mode constants used by the UI.

Functions:
- `buildSeriesSummaryRows`: calculates `min`, `max`, and `avg` strings for the visible time window.

Main non-function contents:
- `TAG_ANALYZER_AGGREGATION_MODES`
- `TAG_ANALYZER_AGGREGATION_MODE_OPTIONS`

### `series/seriesTypes.ts` (`49` lines)
Role: type-only series model definitions for source columns, config, row tuples, point objects, chart datasets, and summary rows.

Functions: none.

### `series/TagSelectionChartSetup.ts` (`73` lines)
Role: helpers for chart creation from selected tags.

Functions:
- `buildDefaultRange`: creates a visible default range and pads zero-width ranges.
- `buildCreateChartSeed`: builds the initial chart creation payload.
- `mergeSelectedTagsIntoTagSet`: merges selected tag drafts into an existing tag-set config list.

## Time

### `time/IntervalUtils.ts` (`311` lines)
Role: interval and duration helper module for tick sizing, unit normalization, and short duration labels.

Functions:
- `normalizeTimeUnit`: converts shorthand or canonical unit strings into the internal enum.
- `convertIntervalUnit`: returns the normalized interval unit string when known.
- `getTimeUnitMilliseconds`: converts enum-based unit/value input into milliseconds.
- `getIntervalMs`: converts supported string unit/value input into milliseconds.
- `calculateInterval`: computes chart interval type and value from span, width, and mode.
- `resolveInterval`: applies the interval rules table to one seconds-per-tick estimate.
- `formatDurationLabel`: formats a time span into a compact duration string.
- `formatDurationPart`: formats one duration segment.

Main non-function contents:
- `SHIFT_TIME_UNIT_OPTIONS`

### `time/PanelRangeControlLogic.ts` (`284` lines)
Role: panel and navigator range math for zooming, shifting, focusing, and handler creation.

Functions:
- `getNavigatorRangeFromEvent`: normalizes navigator drag bounds to a valid time range.
- `getZoomInPanelRange`: zooms in around the panel center.
- `getZoomOutRange`: zooms out and expands navigator range when needed.
- `getFocusedPanelRange`: narrows focus around the current panel center.
- `createPanelRangeControlHandlers`: builds the shared shift and zoom callbacks.
- `getMovedPanelRange`: shifts the panel and conditionally extends the navigator.
- `getMovedNavigatorRange`: shifts both panel and navigator together.
- `getClampedNavigatorFocusRange`: keeps focused navigator ranges inside bounds.
- `getRangeWidth`: returns time-range width.
- `shiftTimeRange`: adds an offset to both range boundaries.
- `getDirectionOffset`: returns signed left/right movement offset.
- `isRangeOutsideBounds`: checks whether one range escapes another.
- `applyRangeUpdate`: null-safe wrapper that applies computed range updates.

### `time/PanelTimeRangeResolver.ts` (`747` lines)
Role: main time-range resolver for initialize/reset/edit flows, plus boundary-fetch helpers and time-source normalization.

Functions:
- `resolvePanelTimeRange`: main time-range resolution entry point.
- `resolveResetTimeRange`: reset-mode wrapper around `resolvePanelTimeRange`.
- `resolveInitialPanelRange`: initialize-mode wrapper around `resolvePanelTimeRange`.
- `fetchMinMaxTable`: loads min/max table results for grouped series metadata.
- `fetchVirtualStatTable`: loads virtual-stat min/max bounds or table min/max bounds.
- `resolveTimeBoundaryRanges`: converts fetched boundary data into a `ValueRangePair`.
- `normalizeTimeBoundsInput`: wraps range/config data into the `InputTimeBounds` union.
- `isSameTimeRange`: exact equality helper for two ranges.
- `toConcreteTimeRange`: converts a `ValueRange` or `TimeRangeConfig` source into a concrete range.
- `normalizeResolvedTimeBounds`: turns resolved bounds into a concrete optional range when valid.
- `normalizeBoardTimeRangeInput`: converts board input state into a concrete optional range.
- `normalizePanelTimeRangeSource`: builds the panel range/default source object.
- `setTimeRange`: chooses panel range, board range, or default range in order.
- `restoreTimeRangePair`: validates and restores saved panel/navigator ranges.
- `resolveGlobalTimeTargetRange`: prefers pre-overflow range when available.
- `resolveEditModeRange`: internal edit-mode precedence helper.
- `resolveTopLevelRange`: internal top-level precedence helper.
- `resolveFallbackRange`: internal fallback range helper.
- `shouldIncludeAbsolutePanelRange`: decides whether reset flow should use panel absolute range.
- `normalizeBoardLastRange`: resolves board-level last-relative ranges.
- `normalizeEditBoardLastRange`: resolves edit initialize range from fetched board bounds.
- `getDefaultBoardRange`: builds the default board fallback range.
- `normalizeEditPreviewTimeRange`: resolves edit preview range from fetched bounds.
- `normalizeAbsolutePanelRange`: resolves panel absolute config into a range.
- `normalizeNowPanelRange`: resolves now-relative panel config into a range.
- `getRelativePanelLastRange`: resolves panel last-relative range using fetched tag bounds.
- `resolvePanelRangeFromRules`: runs the full precedence chain.
- `createTableTagMap`: groups series by table for the min/max query builder.
- `getBoundaryTimeRange`: resolves boundary timestamps from input ranges and virtual stat data.
- `buildConcreteTimeRange`: converts structured boundaries to a concrete range unless they are empty or last-relative.
- `isCompleteTimeRange`: type guard for restored time-range pairs.

Main non-function contents:
- `EMPTY_TIME_RANGE`
- `panelTimeRangeApi`

### `time/RelativeTimeUtils.ts` (`72` lines)
Role: numeric helper functions for parsed last-relative time boundaries.

Functions:
- `subtractTimeOffset`: subtracts a millisecond offset from an anchor timestamp.
- `getRelativeTimeOffsetMilliseconds`: converts a parsed relative boundary into a millisecond offset.
- `resolveLastRelativeBoundaryTime`: resolves one last-relative boundary against an anchor time.
- `resolveLastRelativeTimeRange`: resolves a last-relative range config into a concrete time range.

### `time/TimeBoundaryParsing.ts` (`332` lines)
Role: parser and guard module for structured time boundaries and time-range configs.

Functions:
- `createRelativeTimeBoundary`: builds a structured relative boundary.
- `parseTimeRangeInputValue`: parses user-entered time text into a structured boundary.
- `formatTimeRangeInputValue`: formats a structured boundary back into editor text.
- `formatAxisTime`: formats axis timestamps based on visible span.
- `isEmptyTimeBoundary`: type guard for empty boundaries.
- `isAbsoluteTimeBoundary`: type guard for absolute boundaries.
- `isRelativeTimeBoundary`: type guard for relative boundaries.
- `isLastRelativeTimeBoundary`: type guard for last-relative boundaries.
- `isNowRelativeTimeBoundary`: type guard for now-relative boundaries.
- `isRelativeTimeRangeConfig`: type guard for fully relative range configs.
- `isLastRelativeTimeRangeConfig`: type guard for fully last-relative range configs.
- `isNowRelativeTimeRangeConfig`: type guard for fully now-relative range configs.
- `isAbsoluteTimeRangeConfig`: type guard for fully absolute range configs.
- `resolveTimeBoundaryValue`: resolves a structured boundary into a timestamp.
- `normalizeTimeRangeConfig`: converts a `TimeRangeConfig` into `ResolvedTimeBounds`.
- `isConcreteTimeRange`: validates that a range is present, positive, and ordered.
- `hasTimeRangeConfigBoundaries`: generic internal helper used by the range-config guards.
- `parseRelativeTimeBoundary`: internal regex-based relative parser.
- `formatRelativeTimeBoundaryExpression`: internal relative-boundary formatter.

### `time/timeTypes.ts` (`102` lines)
Role: type-only time model for ranges, boundaries, interval options, range sources, and resolver parameter objects.

Functions: none.

## Bottom Line

The current utils folder is much clearer than the older audit described. The biggest responsibilities are now grouped like this:
- `fetch/FetchQueryUtils.ts`: mostly SQL/TQL query building, but still with a few non-query helpers mixed in
- `fetch/TagAnalyzerDataRepository.ts`: backend request/response adapter for chart and table fetch endpoints
- `fetch/ChartSeriesRowsLoader.ts`: one-series row loader that builds raw/calculated fetch requests
- `fetch/TagMetadataSearchRepository.ts`: tag metadata lookup
- `fetch/PanelChartDataLoader.ts`: chart state loader for panel and navigator runtime data
- `time/TimeBoundaryParsing.ts`: boundary parsing and guards
- `time/PanelTimeRangeResolver.ts`: range rules and boundary resolution
- `legacy/LegacyStorageAdapter.ts`: legacy board/panel storage translation

The main cleanup candidates that still stand out in the current structure are:
- `time/PanelTimeRangeResolver.ts`
- `fetch/FetchQueryUtils.ts`
- `fetch/TagAnalyzerDataRepository.ts` only if you want to move `fetchTopLevelTimeBoundaryRanges` closer to time-boundary code
- `legacy/LegacyStorageAdapter.ts`


