# TagAnalyzer Utils Folder Audit

Scope: `src/components/tagAnalyzer/utils`

Assumption: this is the "Util folder" you meant because it is the active utils tree in the current `tagAnalyzer` refactor work. This audit is based on the files that currently exist in the working tree. Deleted tracked files are intentionally excluded.

Update `2026-04-22`:
- `fetch/PanelChartDataLoader.ts` no longer exists. The owner is now `../chart/PanelChartStateLoader.ts`.
- `fetch/TagMetadataSearchRepository.ts` no longer exists. The owner is now `../common/tagSelection/TagSelectionSearchRepository.ts`.
- Use the nearest `FOLDER_AUDIT.md` files for the current folder boundary map.

## Main findings

1. The two biggest cleanup targets are `fetch/ApiRepository.ts` and `time/PanelTimeRangeResolver.ts`. Both files mix multiple responsibilities and should be reduced first.
2. There is a real circular dependency between `legacy/LegacyTimeAdapter.ts` and `time/PanelTimeRangeResolver.ts`. That is the first architectural issue I would remove.
3. A few small helpers are duplicated across files:
   - `fromLegacyBoolean` and `toLegacyBoolean` exist in both `legacy/LegacySeriesAdapter.ts` and `legacy/LegacyStorageAdapter.ts`.
   - Concrete time-range validation exists in both `fetch/PanelFetchWorkflow.ts` and `fetch/TagAnalyzerFetchRepository.ts`.
   - Request error handling with `Toast.error(...)` is repeated in `fetch/ApiRepository.ts` and `time/PanelTimeRangeResolver.ts`.
   - Table-qualification logic is split between `fetch/FetchHelpers.ts` and `fetch/ApiRepository.ts`.
4. The small type-only files are mostly fine. Most cleanup value is in moving logic out of the large workflow/repository files, not in compacting the model/type files.

## Consolidation-first plan

If file count is the main concern, do not create new fetch files first. The better move is to redistribute `ApiRepository.ts` into the files that already exist and then remove `ApiRepository.ts` entirely.

1. Move these pure helpers from `fetch/ApiRepository.ts` into `fetch/FetchHelpers.ts`:
   - `resolveFetchTimeBounds`
   - `buildCsvTqlQuery`
   - `getCalculationTableName`
   - `resolveCalculationTimeBucketContext`
   - `buildTruncatedCalculationTimeBucket`
   - `buildScaledCalculationTimeBucket`
   - `buildCalculationFilterClause`
   - `buildAggregateCalculationQuery`
   - `buildAverageCalculationQuery`
   - `buildCountCalculationQuery`
   - `buildFirstLastCalculationTimeBucket`
   - `buildFirstLastCalculationQuery`
   - `buildCalculationMainQuery`
   - `buildRawQuery`
2. Move these API-facing chart fetch functions from `fetch/ApiRepository.ts` into `fetch/TagAnalyzerFetchRepository.ts`:
   - `parseChartCsvResponse`
   - `fetchCalculationData`
   - `fetchRawData`
   - `fetchTablesData`
   - `getRollupTableList`
3. Move these tag-search/meta-table functions from `fetch/ApiRepository.ts` into `fetch/TagSearchRepository.ts`:
   - `fetchTableName`
   - `getTagPagination`
   - `getMetaTableName`
   - `getTagTotal`
4. Move `fetchVirtualStatTable` from `fetch/ApiRepository.ts` into `time/PanelTimeRangeResolver.ts` because that is its actual caller domain.
5. Break the `LegacyTimeAdapter <-> PanelTimeRangeResolver` cycle by moving `normalizeTimeRangeConfig` from `time/PanelTimeRangeResolver.ts` into the already existing `time/TimeRangeParsing.ts`.
6. Keep one copy of the legacy boolean helpers and import them from the second legacy adapter instead of keeping two implementations.
7. Keep one concrete time-range guard and reuse it in both fetch files instead of maintaining two nearly identical versions.

## Filename recommendations

The current folder has several names that are technically correct but not explicit enough. The main naming issue is that names like `Helpers`, `Utils`, `Repository`, and `Workflow` do not tell you what kind of work the file actually does.

Naming rule I would use here:
- Prefer a name that tells you the file's job: `Mapper`, `Loader`, `QueryUtils`, `Parsing`, `Formatter`, `Contracts`, `Adapter`, `Policy`.
- Avoid `Helpers` when the file is really about query building or request shaping.
- Avoid `Repository` when the file does much more than simple data access.
- Avoid repeating `Fetch` in both the folder name and the filename unless it adds real meaning.

Recommended renames:
- `fetch/ApiRepository.ts` -> remove after redistribution
  Reason: the file is too broad to deserve a better name. The best fix is to move its functions into clearer existing files and delete it. If you need a temporary transition name, use `fetch/TagAnalyzerDataApi.ts`.
- `fetch/FetchHelpers.ts` -> `fetch/FetchQueryUtils.ts`
  Reason: after consolidation this file will mostly hold query-building and fetch-input normalization logic. `Helpers` is too vague.
- `fetch/TagAnalyzerFetchRepository.ts` -> `fetch/TagAnalyzerDataRepository.ts`
  Reason: the current name says "fetch repository", which is almost circular. The actual job is data access for tag analyzer chart and table data.
- `fetch/TagSearchRepository.ts` -> `fetch/TagMetadataSearchRepository.ts`
  Reason: the file does not just "search tags". It also resolves columns, totals, and meta-table access.
- `fetch/ChartMapping.ts` -> `fetch/ChartSeriesMapper.ts`
  Reason: the file maps fetch rows into chart series structures. `Mapping` alone is too broad.
- `fetch/FetchTypes.ts` -> `fetch/FetchContracts.ts`
  Reason: this file defines request/response shapes and workflow payloads. `Contracts` is more descriptive than generic `Types`.
- `fetch/PanelFetchWorkflow.ts` -> `fetch/PanelChartDataLoader.ts`
  Reason: the main purpose is loading panel and navigator chart state, not an abstract "workflow".
- `series/TagAnalyzerSeriesDataUtils.ts` -> `series/SeriesPointConverters.ts`
  Reason: the file converts row/series data into chart points. That is much clearer than `DataUtils`.
- `series/TagAnalyzerSeriesLabelUtils.ts` -> `series/SeriesLabelFormatter.ts`
  Reason: the file formats display names for chart/editor/list contexts. `LabelFormatter` is more direct than `LabelUtils`.
- `series/TagAnalyzerSeriesUtils.ts` -> `series/SeriesSummaryUtils.ts`
  Reason: the file mainly builds summary rows. The current name sounds like it contains all series logic.
- `series/TagSelectionSeriesUtils.ts` -> `series/TagSelectionChartSetup.ts`
  Reason: the file builds chart seed data and merges selected tags. `ChartSetup` explains the intent better than generic `SeriesUtils`.
- `time/PanelRangeInteractionUtils.ts` -> `time/PanelRangeControlLogic.ts`
  Reason: the file contains zoom/shift/focus control rules, not generic time helpers.
- `time/TimeRangeParsing.ts` -> `time/TimeBoundaryParsing.ts`
  Reason: most of the file is about parsing and classifying time boundaries, not full range workflows.

Conditional rename:
- `time/PanelTimeRangeResolver.ts` -> keep for now
  Reason: this name is already fairly explicit. If the file is later reduced to pure rule logic, then `time/PanelTimeRangePolicy.ts` would be a better name.

## File-by-file inventory

### Root type files

#### `boardTypes.ts` (79 lines)
Functions: none.

Refactor note: This file is okay. It is a type-only boundary file. If it grows more, split board data types from board action payload types, but this is low priority.

#### `panelModelTypes.ts` (61 lines)
Functions: none.

Refactor note: This file is also okay. It already acts like a domain model file. Only split it further if `PanelAxes`, `PanelDisplay`, and `PanelTime` start being reused independently enough to justify separate files.

#### `panelRuntimeTypes.ts` (93 lines)
Functions: none.

Refactor note: This file mixes view state, chart refs, callback handler types, and runtime state. That is still manageable, but if it keeps growing I would split `panel view/presentation types` from `panel chart/runtime types`.

### Fetch

#### `fetch/ApiRepository.ts` (830 lines)
Functions:
- `resolveFetchTimeBounds`
- `buildCsvTqlQuery`
- `parseChartCsvResponse`
- `getCalculationTableName`
- `resolveCalculationTimeBucketContext`
- `buildTruncatedCalculationTimeBucket`
- `buildScaledCalculationTimeBucket`
- `buildCalculationFilterClause`
- `buildAggregateCalculationQuery`
- `buildAverageCalculationQuery`
- `buildCountCalculationQuery`
- `buildFirstLastCalculationTimeBucket`
- `buildFirstLastCalculationQuery`
- `buildCalculationMainQuery`
- `buildRawQuery`
- `fetchTableName`
- `fetchCalculationData`
- `fetchRawData`
- `fetchVirtualStatTable`
- `fetchTablesData`
- `getRollupTableList`
- `getTagPagination`
- `getMetaTableName`
- `getTagTotal`

Refactor note: High priority. This file currently owns SQL generation, TQL wrapping, CSV parsing, backend transport, toast/error handling, rollup metadata loading, virtual-stat lookups, and tag-search meta queries. That is too much for one file.

What to compact or clean:
- Best option if you want fewer files: empty this file out and remove it.
- Move all pure SQL/query helpers into `FetchHelpers.ts`.
- Move chart fetch transport and CSV response handling into `TagAnalyzerFetchRepository.ts`.
- Move tag-search and meta-table functions into `TagSearchRepository.ts`.
- Move virtual-stat/time-boundary fetching into `PanelTimeRangeResolver.ts`.
- Move repeated `request(...)` + `Toast.error(...)` handling into one shared helper inside an existing fetch file instead of duplicating it.
- Replace the long `if` chain inside `buildCalculationMainQuery` with a map of calculation mode to builder.
- Replace `any` in `getRollupTableList` with a typed return model.
- Unify `getCalculationTableName` with `getQualifiedTableName` so table qualification rules are not split across two files.

#### `fetch/ChartMapping.ts` (77 lines)
Functions:
- `mapRowsToChartData`
- `buildChartSeriesItem`
- `analyzePanelDataLimit`

Refactor note: Mostly clean. The one awkward part is that `analyzePanelDataLimit` is workflow logic, not mapping logic.

What to compact or clean:
- Keep `mapRowsToChartData` and `buildChartSeriesItem` together.
- Move `analyzePanelDataLimit` into `PanelFetchWorkflow.ts` if you want one less fetch helper file boundary during debugging.

#### `fetch/FetchHelpers.ts` (48 lines)
Functions:
- `getQualifiedTableName`
- `calculateSampleCount`

Refactor note: Small and useful. This is the best place to absorb the pure helper logic that currently sits in `ApiRepository.ts`.

What to compact or clean:
- Move `getCalculationTableName` behavior here.
- Move the calculation/raw query-builder helpers here.
- Keep this file as the pure helper file and avoid request calls here.

#### `fetch/FetchTypes.ts` (86 lines)
Functions: none.

Refactor note: Mostly fine. If the fetch layer keeps splitting, separate request/response DTOs from workflow state types.

#### `fetch/PanelFetchWorkflow.ts` (324 lines)
Functions:
- `loadNavigatorChartState`
- `loadPanelChartState`
- `isFetchableTimeRange`
- `fetchPanelDatasets`
- `calculatePanelFetchCount`
- `resolvePanelFetchTimeRange`
- `resolvePanelFetchInterval`
- `fetchPanelDatasetsFromRequest`
- `createEmptyFetchPanelDatasetsResult`

Refactor note: Medium priority. This file mixes request unpacking, time-range resolution, interval policy, per-series fetch orchestration, and result shaping.

What to compact or clean:
- Keep interval policy here unless it becomes reusable somewhere else.
- If `ChartMapping.ts` starts to feel too thin, move dataset assembly helpers into this file instead of creating another file.
- Remove the local `isFetchableTimeRange` duplicate and reuse one shared `isConcreteTimeRange`.
- Keep `loadNavigatorChartState` and `loadPanelChartState` as thin orchestration entry points only.

#### `fetch/TagAnalyzerFetchRepository.ts` (234 lines)
Functions:
- `fetchParsedTables`
- `fetchTopLevelTimeBoundaryRanges`
- `fetchSeriesRows`
- `isConcreteFetchRange`
- `createEmptyFetchResponse`
- `hasSeriesFetchColumns`
- `fetchCalculatedSeriesRows`
- `fetchRawSeriesRows`

Refactor note: Medium priority. This file has a clearer shape than `ApiRepository.ts`, and it is the best consolidation target for the API-facing chart fetch logic.

What to compact or clean:
- Absorb `parseChartCsvResponse`, `fetchCalculationData`, `fetchRawData`, `fetchTablesData`, and `getRollupTableList` from `ApiRepository.ts`.
- Keep table discovery and chart fetch transport together here if reducing file count matters more than strict layering.
- Leave `fetchTopLevelTimeBoundaryRanges` here or move it to `PanelTimeRangeResolver.ts`, but do not create another repository file just for it.
- Remove the local `isConcreteFetchRange` duplicate and share the same guard with `PanelFetchWorkflow.ts`.

#### `fetch/TagSearchRepository.ts` (155 lines)
Functions:
- `buildTableColumns`
- `getTagTotalFromResponse`
- `normalizeTagSearchItems`
- `fetchTagSearchColumns`
- `fetchTagSearchPage`

Refactor note: This file is relatively clean. It is also the natural existing home for the tag-search functions currently stranded in `ApiRepository.ts`.

What to compact or clean:
- Absorb `fetchTableName`, `getTagPagination`, `getMetaTableName`, and `getTagTotal` from `ApiRepository.ts`.
- Keep all tag-search and meta-table logic together here, even if the filename becomes a little broad.

### Legacy

#### `legacy/LegacySeriesAdapter.ts` (215 lines)
Functions:
- `getSourceTagName`
- `withNormalizedSourceTagName`
- `normalizeSourceTagNames`
- `normalizeLegacySeriesConfigs`
- `normalizeLegacyChartSeries`
- `toLegacyTagNameItem`
- `toLegacyTagNameList`
- `toLegacySeriesConfigs`
- `legacySeriesToChartPoints`
- `normalizeLegacySeriesConfig`
- `fromLegacyBoolean`
- `toLegacyBoolean`
- `legacyChartSeriesHasArrays`
- `legacyChartSeriesToRows`

Refactor note: This file is reasonably focused, but it still mixes three sub-concerns: source-tag normalization, series config legacy conversion, and legacy chart-series data conversion.

What to compact or clean:
- Extract shared `fromLegacyBoolean` and `toLegacyBoolean`.
- If this file grows more, separate concerns with clear helper sections before creating another file.
- Consider moving `getSourceTagName` into a neutral series helper because non-legacy files now depend on it.

#### `legacy/LegacyStorageAdapter.ts` (406 lines)
Functions:
- `normalizeBoardInfo`
- `toLegacyFlatPanelInfo`
- `getNextBoardListWithSavedPanels`
- `getNextBoardListWithSavedPanel`
- `getNextBoardListWithoutPanel`
- `normalizeLegacyPanelInfo`
- `normalizeLegacyFlatPanelInfo`
- `createNormalizedPanelInfo`
- `resolvePanelTimeRangeConfig`
- `updateBoardPanels`
- `findBoardPanels`
- `createLegacyPanelList`
- `replaceLegacyPanel`
- `removeLegacyPanel`
- `fromLegacyBoolean`
- `toLegacyBoolean`
- `normalizeNumericValue`
- `normalizeLegacyTimeKeeper`

Refactor note: High priority inside the legacy folder. This file mixes board mutation helpers, panel serialization, panel hydration, numeric coercion, boolean coercion, and time config fallback logic.

What to compact or clean:
- If you want fewer files, keep this as the single legacy storage adapter and just group helpers by section.
- Keep board list mutation helpers separate from panel shape translation.
- Extract duplicated `fromLegacyBoolean` and `toLegacyBoolean`.
- Keep `normalizeNumericValue` and `normalizeLegacyTimeKeeper` here unless another existing legacy file truly needs them.

#### `legacy/LegacyTimeAdapter.ts` (135 lines)
Functions:
- `normalizeLegacyTimeBoundaryRanges`
- `normalizeLegacyTimeRangeBoundary`
- `toLegacyTimeRangeInput`
- `toLegacyTimeValue`
- `legacyMinMaxPairToRange`
- `normalizeLegacyTimeBoundary`

Refactor note: The file itself is small and fairly clear, but it currently participates in a circular dependency with `time/PanelTimeRangeResolver.ts`.

What to compact or clean:
- Break the cycle first.
- Move `normalizeTimeRangeConfig` into `time/TimeRangeParsing.ts` and import it from both places.
- After that, this file can stay small and focused as the legacy time boundary adapter.

#### `legacy/LegacyTypes.ts` (121 lines)
Functions: none.

Refactor note: Fine. If it grows, split storage-related legacy types from chart-related legacy types and time-related legacy types.

### Series

#### `series/seriesTypes.ts` (49 lines)
Functions: none.

Refactor note: Fine.

#### `series/TagAnalyzerSeriesDataUtils.ts` (51 lines)
Functions:
- `seriesDataToPoints`
- `chartSeriesToPoints`

Refactor note: Clean and focused.

What to compact or clean:
- No urgent change.
- If you want to be stricter, `chartSeriesToPoints` is a thin wrapper and could be kept only if the calling sites benefit from explicitness.

#### `series/TagAnalyzerSeriesLabelUtils.ts` (71 lines)
Functions:
- `formatSeriesLabel`
- `getSeriesShortName`
- `getSeriesEditorName`
- `getSeriesName`

Refactor note: Clean overall. The main boundary smell is that it depends on `legacy/LegacySeriesAdapter.ts` just to get the source tag name.

What to compact or clean:
- Move `getSourceTagName` to a neutral series helper so this file does not need to reach into `legacy`.

#### `series/TagAnalyzerSeriesUtils.ts` (59 lines)
Functions:
- `buildSeriesSummaryRows`

Refactor note: Clean. The only slight mix is that aggregation mode constants live next to summary-row calculation.

What to compact or clean:
- Keep aggregation mode constants here unless another existing series file becomes the clear shared home.

#### `series/TagSelectionSeriesUtils.ts` (73 lines)
Functions:
- `buildDefaultRange`
- `buildCreateChartSeed`
- `mergeSelectedTagsIntoTagSet`

Refactor note: Reasonably focused, but it mixes chart-seed creation with tag-set merge behavior.

What to compact or clean:
- Keep `buildCreateChartSeed` here.
- Consider moving `mergeSelectedTagsIntoTagSet` to a tag-selection state/helper file if it is used outside chart creation.
- Like the label utils, this file reaches into `legacy/LegacySeriesAdapter.ts`; that dependency should be neutralized.

### Time

#### `time/IntervalUtils.ts` (311 lines)
Functions:
- `normalizeTimeUnit`
- `convertIntervalUnit`
- `getTimeUnitMilliseconds`
- `getIntervalMs`
- `calculateInterval`
- `resolveInterval`
- `formatDurationLabel`
- `formatDurationPart`

Refactor note: Moderate cleanup candidate. Interval calculation is a good fit here, but duration-label formatting is a different concern.

What to compact or clean:
- Keep interval normalization and interval calculation together.
- If file count matters, keep `formatDurationLabel` and `formatDurationPart` here until another existing time file genuinely needs them.
- Keep the rules table; it is already one of the cleaner parts of this folder.

#### `time/PanelRangeInteractionUtils.ts` (284 lines)
Functions:
- `getNavigatorRangeFromEvent`
- `getZoomInPanelRange`
- `getZoomOutRange`
- `getFocusedPanelRange`
- `createPanelRangeControlHandlers`
- `getMovedPanelRange`
- `getMovedNavigatorRange`
- `getClampedNavigatorFocusRange`
- `getRangeWidth`
- `shiftTimeRange`
- `getDirectionOffset`
- `isRangeOutsideBounds`
- `applyRangeUpdate`

Refactor note: This file is fairly coherent. The main cleanup is structural, not conceptual.

What to compact or clean:
- Keep `createPanelRangeControlHandlers` as the only UI-facing entry point.
- If you want stricter separation without new files, just group the math helpers together at the bottom of this file.

#### `time/PanelTimeRangeResolver.ts` (733 lines)
Functions:
- `resolvePanelTimeRange`
- `resolveResetTimeRange`
- `resolveInitialPanelRange`
- `fetchMinMaxTable`
- `resolveTimeBoundaryRanges`
- `normalizeTimeBoundsInput`
- `normalizeTimeRangeConfig`
- `isSameTimeRange`
- `toConcreteTimeRange`
- `normalizeResolvedTimeBounds`
- `normalizeBoardTimeRangeInput`
- `normalizePanelTimeRangeSource`
- `setTimeRange`
- `restoreTimeRangePair`
- `resolveGlobalTimeTargetRange`
- `resolveEditModeRange`
- `resolveTopLevelRange`
- `resolveFallbackRange`
- `shouldIncludeAbsolutePanelRange`
- `normalizeBoardLastRange`
- `normalizeEditBoardLastRange`
- `getDefaultBoardRange`
- `normalizeEditPreviewTimeRange`
- `normalizeAbsolutePanelRange`
- `normalizeNowPanelRange`
- `getRelativePanelLastRange`
- `resolvePanelRangeFromRules`
- `createTableTagMap`
- `resolveBoundaryValueRangePair`
- `buildConcreteTimeRange`
- `isCompleteTimeRange`

Refactor note: High priority. This file mixes async backend fetches, request error handling, legacy input translation, normalization helpers, edit/reset policy, and panel range decision rules.

What to compact or clean:
- Absorb `fetchVirtualStatTable` from `ApiRepository.ts` because this file is already the time-boundary owner.
- Move `normalizeTimeRangeConfig` to `TimeRangeParsing.ts` to break the cycle with `LegacyTimeAdapter.ts`.
- Keep `resolvePanelTimeRange`, `resolveResetTimeRange`, `resolveInitialPanelRange`, and the rule functions together here.
- Keep normalization helpers together here unless `TimeRangeParsing.ts` becomes the cleaner existing home for them.
- Extract repeated `Toast.error(...)` behavior into a shared request helper.
- Break the circular dependency with `legacy/LegacyTimeAdapter.ts`.
- Keep `resolveTimeBoundaryRanges` out of the pure resolver if it must remain async and backend-facing.

#### `time/RelativeTimeUtils.ts` (72 lines)
Functions:
- `subtractTimeOffset`
- `getRelativeTimeOffsetMilliseconds`
- `resolveLastRelativeBoundaryTime`
- `resolveLastRelativeTimeRange`

Refactor note: Clean. This is already one of the better-separated files in the folder.

#### `time/TimeRangeParsing.ts` (297 lines)
Functions:
- `createRelativeTimeBoundary`
- `parseTimeRangeInputValue`
- `formatTimeRangeInputValue`
- `formatAxisTime`
- `isEmptyTimeBoundary`
- `isAbsoluteTimeBoundary`
- `isRelativeTimeBoundary`
- `isLastRelativeTimeBoundary`
- `isNowRelativeTimeBoundary`
- `isRelativeTimeRangeConfig`
- `isLastRelativeTimeRangeConfig`
- `isNowRelativeTimeRangeConfig`
- `isAbsoluteTimeRangeConfig`
- `resolveTimeBoundaryValue`
- `hasTimeRangeConfigBoundaries`
- `parseRelativeTimeBoundary`
- `formatRelativeTimeBoundaryExpression`

Refactor note: Mostly good. The only real concern is that parsing, type guards, and axis-label formatting live together.

What to compact or clean:
- Keep parsing and type guards together.
- Keep `formatAxisTime` here unless another existing time file becomes the obvious shared home for display formatting.
- Keep `resolveTimeBoundaryValue` close to parsing/types because it is part of the same boundary-model story.

#### `time/timeTypes.ts` (102 lines)
Functions: none.

Refactor note: Good as-is. Once the time resolver splits, some of the policy-specific types can move closer to their modules, but there is no urgent cleanup needed here.

## Concrete duplicates to collapse

1. `legacy/LegacySeriesAdapter.ts`
   - `fromLegacyBoolean`
   - `toLegacyBoolean`
2. `legacy/LegacyStorageAdapter.ts`
   - `fromLegacyBoolean`
   - `toLegacyBoolean`
3. `fetch/PanelFetchWorkflow.ts`
   - `isFetchableTimeRange`
4. `fetch/TagAnalyzerFetchRepository.ts`
   - `isConcreteFetchRange`
5. `fetch/ApiRepository.ts`
   - repeated request error/toast handling blocks
6. `time/PanelTimeRangeResolver.ts`
   - repeated request error/toast handling block
7. `fetch/FetchHelpers.ts`
   - `getQualifiedTableName`
8. `fetch/ApiRepository.ts`
   - `getCalculationTableName`

## Recommended order of refactor

1. Break the `LegacyTimeAdapter.ts` and `PanelTimeRangeResolver.ts` cycle.
2. Redistribute `ApiRepository.ts` into `FetchHelpers.ts`, `TagAnalyzerFetchRepository.ts`, `TagSearchRepository.ts`, and `PanelTimeRangeResolver.ts`, then remove `ApiRepository.ts`.
3. Remove duplicated boolean and concrete-range helpers.
4. Tighten the big files internally with clearer sections before creating any new files.
5. Split the oversized spec files only after the production code stabilizes.

