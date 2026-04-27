# Tag Analyzer File Responsibilities

This document summarizes the responsibility of each file under `src/components/tagAnalyzer`.

Guiding rule:
- Responsibilities are inferred from each file's exported surface first.
- Private local helpers are intentionally ignored unless the file's exported API is clearly side-effecting, such as repository fetch calls.

## Potential Responsibility Overlap

- `utils/fetch/ApiRepository.ts`, `utils/fetch/TagAnalyzerFetchRepository.ts`, and `utils/fetch/TagSearchRepository.ts` all sit in the fetch/repository layer. The split is mostly reasonable, but the boundary between "raw backend API access" and "Tag Analyzer specific repository composition" is something to watch because fetch ownership is spread across three files.
- `utils/time/PanelTimeRangeResolver.ts`, `utils/time/PanelRangeInteractionUtils.ts`, `utils/time/RelativeTimeUtils.ts`, and `utils/time/TimeRangeParsing.ts` all participate in time-range behavior. They are not duplicates, but time parsing, time resolution, and range movement logic are distributed enough that responsibility creep could happen there first.
- `utils/legacy/LegacySeriesAdapter.ts` and `utils/series/TagAnalyzerSeriesLabelUtils.ts` both touch series naming concerns from different angles. One is legacy normalization and one is display labeling, so the split still makes sense, but naming rules now live in more than one place.

## Root

- `TagAnalyzer.tsx` - `default(TagAnalyzer)`. Provides the main Tag Analyzer feature entry component.
- `TagAnalyzerBoard.tsx` - `default(TagAnalyzerBoard)`. Renders the board-level Tag Analyzer workspace that hosts panels and shared board state.
- `TagAnalyzerBoardToolbar.tsx` - `BoardToolbarActions`, `default(TagAnalyzerBoardToolbar)`. Defines board toolbar action types and renders the toolbar UI that triggers them.

## TestData

- `TestData/PanelChartTestData.ts` - `MockChartOptionState`, `MockChartInstance`, `MockReactEChartsProps`, `createMockChartInstance`, `createPanelChartPropsFixture`. Supplies chart-focused test doubles and panel chart prop fixtures.
- `TestData/PanelEChartTestData.ts` - `createPanelChartLayoutOptionFixture`. Builds ECharts layout option fixtures for tests.
- `TestData/PanelTestData.ts` - Multiple `create...Fixture` exports. Central fixture factory file for panel, board, time, series, and footer test data.
- `TestData/TagSelectionTestData.ts` - Multiple `create...Fixture` exports. Central fixture factory file for tag search and tag selection state tests.

## Modal Series Selection

- `modal/seriesSelection/TagSelectionModeRow.tsx` - `default(TagSelectionModeRow)`. Renders one selected-series mode row in the shared modal selection UI.
- `modal/seriesSelection/TagSelectionPanel.tsx` - `default(TagSelectionPanel)`. Owns the reusable modal selection panel UI for available tags and selected series drafts.
- `modal/seriesSelection/TagSelectionSearchRepository.ts` - `tagSearchApi`, `fetchTagSearchColumns`, `fetchTagSearchPage`. Owns the modal-only backend lookups for selection columns, paging, and totals.
- `modal/seriesSelection/TagSelectionConstants.ts` - `EMPTY_TAG_SELECTION_COLUMNS`, `TAG_SEARCH_PAGE_LIMIT`, and shared selection UI styles. Defines reusable constants for modal selection flows.
- `modal/seriesSelection/TagSelectionTypes.ts` - `TagSearchItem`, `TagSelectionSourceColumns`, `TagSelectionDraftItem`, `UseTagSelectionStateOptions`, and selection component props. Defines the public data shapes used by the shared modal selection flow.
- `modal/seriesSelection/tagSelectionPresentation.ts` - `buildTagSelectionLimitError`, `getTagSelectionErrorMessage`, `getTagSelectionCountColor`, `buildTagSelectionCountLabel`. Encapsulates display text and visual-state rules for selection feedback.
- `modal/seriesSelection/tagSelectionPanelHelpers.ts` - `mapTagSearchItemsToListItems`, `findTagById`, `mapSelectedSeriesDraftListItems`. Maps search results and selected drafts into UI-friendly list shapes.
- `modal/seriesSelection/useTagSelectionState.ts` - `useTagSelectionState`. Manages the reusable modal selection state machine for search results, selected drafts, limits, and editing actions.

## Editor

- `editor/AddTagsModal.tsx` - `default(AddTagsModal)`. Renders the modal used to search for and add tags into editor state.
- `editor/OverlapTimeShiftControls.tsx` - `OverlapShiftDirection`, `default(OverlapTimeShiftControls)`. Defines overlap shift directions and renders controls for shifting overlap panel time ranges.
- `editor/PanelEditor.tsx` - `default(PanelEditor)`. Provides the main panel editor container that coordinates editor tabs and save flows.
- `editor/PanelEditorConfigConverter.ts` - `convertPanelInfoToEditorConfig`, `mergeEditorConfigIntoPanelInfo`. Translates between runtime panel models and editable panel editor draft models.
- `editor/PanelEditorPreviewChart.tsx` - `default(PanelEditorPreviewChart)`. Renders the preview chart used inside the panel editor.
- `editor/EditorConstants.ts` - `EDITOR_TABS`, `PANEL_TAG_LIMIT`, `AXES_SECTION_STYLE`, `CHART_TYPE_OPTIONS`, `OVERLAP_TIME_SHIFT_COLORS`. Defines editor-only reusable constants.
- `editor/EditorTypes.ts` - `EditorCheckboxInputEvent`, `EditorInputEvent`, `EditTabPanelType`, `PanelGeneralConfig`, `PanelDataConfig`, `PanelTimeConfig`, `PanelAxesDraft`, `PanelDisplayDraft`, `PanelEditorConfig`. Defines the editor-facing event helpers and draft model types.
- `editor/PanelEditorUtils.ts` - `parseEditorNumber`, `resolveEditorTimeBounds`. Centralizes editor-specific parsing and time bound resolution helpers.
- `editor/useSavePanelToGlobalRecoilState.ts` - `useSavePanelToGlobalRecoilState`. Encapsulates the save flow that writes editor output back into global Recoil board state.

## Editor Sections

- `editor/sections/EditorAxesTab.tsx` - `default(EditorAxesTab)`. Renders the editor tab that edits axis settings.
- `editor/sections/EditorDataTab.tsx` - `default(EditorDataTab)`. Renders the editor tab that edits data source and aggregation settings.
- `editor/sections/EditorDisplayTab.tsx` - `default(EditorDisplayTab)`. Renders the editor tab that edits display and rendering options.
- `editor/sections/EditorTabContent.tsx` - `default(EditorTabContent)`. Switches and renders the active editor tab content.
- `editor/sections/EditorGeneralTab.tsx` - `default(EditorGeneralTab)`. Renders the editor tab for general panel metadata and basic settings.
- `editor/sections/PanelEditorSettings.tsx` - `default(PanelEditorSettings)`. Composes the editor settings area from the section components.
- `editor/sections/EditorTimeTab.tsx` - `default(EditorTimeTab)`. Renders the editor tab that edits panel time range configuration.

## Modal

- `modal/CreateChartModal.tsx` - `default(CreateChartModal)`. Renders the modal flow that creates a new chart or panel from selected tags.
- `modal/OverlapModal.tsx` - `default(OverlapModal)`. Renders the modal used to compare or overlap panel ranges.
- `modal/OverlapComparisonUtils.ts` - `OverlapInterval`, `OverlapLoadResult`, `shiftOverlapPanels`, `buildOverlapLoadState`, `resolveOverlapTimeRange`, `alignOverlapTime`, `mapOverlapRows`, `getNextOverlapPanels`. Owns the overlap-specific data transformations used to build shifted comparison views.

## Chart

- `chart/PanelChartLoadContracts.ts` - `PanelFetchRequest`, `FetchPanelDatasetsParams`, `FetchPanelDatasetsResult`, `PanelDataLimitState`, `PanelChartLoadState`. Defines chart-owned request and result shapes for panel and navigator chart loading.
- `chart/PanelChartStateLoader.ts` - `loadNavigatorChartState`, `loadPanelChartState`, `isFetchableTimeRange`, `fetchPanelDatasets`, `calculatePanelFetchCount`, `resolvePanelFetchTimeRange`, `resolvePanelFetchInterval`, `analyzePanelDataLimit`. Orchestrates chart-state loading for panel and navigator views.
- `chart/ChartRuntimeConstants.ts` - `INITIAL_PANEL_NAVIGATE_STATE`. Defines the empty shared chart navigation state.
- `chart/PanelNavigateStateUtils.ts` - `buildNavigateStatePatchFromPanelLoad`. Builds navigate-state patches from panel load results.
- `chart/useChartRuntimeController.ts` - `useChartRuntimeController`. Owns chart runtime state transitions, refreshes, and range application flow.

## Panel

- `panel/Panel.scss` - No exports. Defines shared panel container styling.
- `panel/PanelBody.tsx` - `default(PanelBody)`. Renders the main body region of a panel.
- `panel/PanelChart.tsx` - `default(PanelChart)`. Renders the chart visualization for a panel.
- `panel/PanelContainer.tsx` - `default(memo)`. Hosts one full panel instance and coordinates panel subcomponents, state, and handlers.
- `panel/PanelFooter.scss` - No exports. Defines footer-specific panel styling.
- `panel/PanelFooter.tsx` - `default(PanelFooter)`. Renders footer status, summaries, and panel footer actions.
- `panel/PanelHeader.scss` - No exports. Defines header-specific panel styling.
- `panel/PanelHeader.tsx` - `default(PanelHeader)`. Renders the panel header area and its controls.
- `panel/PanelTimeSummary.tsx` - `default(PanelTimeSummary)`. Displays a human-readable summary of the panel time range.

## Panel Chart Options

- `panel/chartOptions/OverlapChartOption.ts` - `buildOverlapChartOption`. Builds chart options for overlap comparison panels.
- `panel/chartOptions/PanelChartAxisUtils.ts` - `buildPanelXAxisOption`, `buildPanelYAxisOption`, `calculateOverlapChartYAxisRange`. Generates axis configuration for normal and overlap panel charts.
- `panel/chartOptions/PanelChartInteractionUtils.ts` - `extractDataZoomRange`, `extractBrushRange`. Converts ECharts interaction payloads into Tag Analyzer range values.
- `chart/options/ChartOptionBuilder.ts` - `buildChartOption`, `buildOverlapChartOption`. Assembles full ECharts option objects for panel charts.
- `chart/options/ChartOptionConstants.ts` - Multiple constants. Centralizes visual constants and shared chart styles.
- `chart/options/ChartOptionTypes.ts` - Multiple exported types. Defines tooltip, axis, zoom, and brush types shared by chart option builders.
- `panel/chartOptions/PanelChartSeriesUtils.ts` - `buildPanelLegendSelectedMap`, `buildDefaultVisibleSeriesMap`, `buildVisibleSeriesList`, `buildPanelChartSeriesOption`. Builds the series and legend-related pieces of panel chart options.

## Shared Models

- `utils/boardTypes.ts` - Multiple exported types. Defines board-level state, action payloads, and board interaction contracts.
- `utils/panelModelTypes.ts` - `PanelMeta`, `PanelData`, `PanelTime`, `PanelAxes`, `PanelDisplay`, `PanelInfo`. Defines the persisted and editable panel model shape.
- `utils/panelRuntimeTypes.ts` - Multiple exported types. Defines panel runtime state, refs, event payloads, and handler contracts used while a panel is mounted.

## Persistence

- `utils/persistence/save/TazBoardSaveMapper.ts` - `createPersistedTazBoardInfo`. Serializes one normalized board into the latest persisted `.taz` board shape.
- `utils/persistence/save/TazPanelSaveMapper.ts` - `createPersistedPanelInfo`, `createPersistedSeriesInfo`. Serializes runtime panels and series into the latest persisted `.taz` panel shape.
- `utils/persistence/save/TazSavePayloadBuilder.ts` - `createTazSavePayloadFromBoardInfo`. Shapes `.taz` save payloads directly from normalized runtime board data.
- `utils/persistence/versionParsing/TazBoardVersionParser.ts` - `parseReceivedBoardInfo`, `parseReceivedPanelInfo`. Parses persisted `.taz` board payloads into the normalized runtime board and panel models.
- `utils/persistence/versionParsing/TazPanelVersionParser.ts` - Multiple versioned parser exports. Converts supported persisted `.taz` panel versions into normalized runtime panel and series models.
- `utils/persistence/versionParsing/TazVersionResolver.ts` - `TAZ_FORMAT_VERSION`, `resolvePersistedTazVersion`. Defines supported `.taz` versions and resolves persisted version buckets.
- `utils/persistence/TazPanelPersistenceTypes.ts` - Multiple exported persisted panel and series types. Defines the modern persisted `.taz` panel type system shared by parser and mapper files.
- `utils/persistence/TazPersistenceTypes.ts` - Multiple exported persisted board types. Defines the persisted board-level contracts for `.taz` storage.

## Workspace

- `utils/workspace/TazSavedBoardState.ts` - `getNextBoardListWithSavedPanels`, `getNextBoardListWithSavedPanel`, `getNextBoardListWithoutPanel`. Owns `.taz` board-list updates that keep saved panel snapshots aligned with runtime edits.
- `utils/workspace/TazTabState.ts` - `createLoadedTazBoard`, `createTazSavePayload`, `createSavedTazBoardAfterSave`, `createSavedTazBoardAfterSaveAs`, `createTazSavedCode`, `createTazSavedCodeFromBoardInfo`. Owns `.taz` tab-open, save-flow, and dirty-state helpers for the TagAnalyzer workspace.

## Fetch

- `utils/fetch/TagAnalyzerDataRepository.ts` - `tagAnalyzerDataApi`, `parseChartCsvResponse`, `fetchCalculationData`, `fetchRawData`, `fetchTablesData`, `getRollupTableList`, `fetchParsedTables`, `fetchTopLevelTimeBoundaryRanges`. Provides the backend-facing repository layer for chart, table, and time-boundary fetches.
- `utils/fetch/ChartSeriesMapper.ts` - `mapRowsToChartData`, `buildChartSeriesItem`. Converts fetched rows into chart-ready structures.
- `utils/fetch/ChartSeriesRowsLoader.ts` - `fetchCalculatedSeriesRows`, `fetchRawSeriesRows`. Loads one series at a time through explicit calculated or raw fetch paths.
- `utils/fetch/CalculationFetchQueryBuilder.ts` - `buildCalculationMainQuery`. Builds calculated-series SQL query text.
- `utils/fetch/RawFetchQueryBuilder.ts` - `buildCsvTqlQuery`, `buildRawQuery`. Builds raw-series query text and TQL wrappers.
- `utils/fetch/FetchSampleCountResolver.ts` - `calculateSampleCount`. Calculates fetch sample counts from panel and chart sizing inputs.
- `utils/fetch/FetchTableNameResolver.ts` - `getQualifiedTableName`, `getCalculationTableName`. Resolves the table names used by fetch requests.
- `utils/fetch/FetchTimeBoundsNormalizer.ts` - `resolveFetchTimeBounds`. Normalizes fetch time bounds into the backend request shape.
- `utils/fetch/FetchRequestErrorPresenter.ts` - `RequestClientResponse`, `showRequestError`. Provides shared request-error presentation for fetch repositories.
- `utils/fetch/FetchContracts.ts` - Multiple exported types. Defines fetch-only row, request, and repository response shapes.
- `utils/fetch/TimeBoundaryFetchQueryBuilder.ts` - `createTableTagMap`, `buildMinMaxTableQuery`, `buildVirtualStatTableQuery`. Builds query text for time-boundary fetches.
- `utils/fetch/TimeBoundaryFetchRepository.ts` - `MinMaxTableResponse`, `fetchMinMaxTable`, `fetchVirtualStatTable`, `timeBoundaryRepositoryApi`. Calls the backend endpoints used by time-boundary fetch flows.
- `utils/fetch/TimeBoundaryFetchTypes.ts` - Multiple exported types. Defines the boundary-fetch input and response shapes.

## Legacy Adapters

- `utils/legacy/LegacySeriesAdapter.ts` - `getSourceTagName`, `withNormalizedSourceTagName`, `normalizeSourceTagNames`, `normalizeLegacySeriesConfigs`, `normalizeLegacyChartSeries`, `toLegacyTagNameItem`, `toLegacyTagNameList`, `toLegacySeriesConfigs`, `legacySeriesToChartPoints`. Converts between legacy series naming/data formats and the normalized Tag Analyzer series model.
- `utils/legacy/LegacyStorageAdapter.ts` - `normalizeBoardInfo`, `toLegacyFlatPanelInfo`, `getNextBoardListWithSavedPanels`, `getNextBoardListWithSavedPanel`, `getNextBoardListWithoutPanel`. Normalizes stored board data and bridges between current board state and legacy persistence formats.
- `utils/legacy/LegacyTimeAdapter.ts` - `normalizeLegacyTimeBoundaryRanges`, `normalizeLegacyTimeRangeBoundary`, `toLegacyTimeRangeInput`, `toLegacyTimeValue`. Converts between legacy time representations and the current time model.
- `utils/legacy/LegacyTypes.ts` - Multiple exported types. Defines the legacy-compatible board, series, chart, and time type shapes.

## Series

- `utils/series/PanelSeriesTypes.ts` - `PanelSeriesSourceColumns`, `PanelSeriesConfig`, `ChartRow`, `ChartSeriesItem`, `ChartData`, `SelectedRangeSeriesSummary`. Defines series-level source, chart, and selected-range summary data shapes.
- `utils/series/PanelSeriesAggregationConstants.ts` - `TAG_ANALYZER_AGGREGATION_MODES`, `TAG_ANALYZER_AGGREGATION_MODE_OPTIONS`. Defines supported aggregation modes and dropdown options.
- `utils/series/PanelSeriesColorAssigner.ts` - `TAG_ANALYZER_LINE_COLORS`, `assignTagAnalyzerLineColors`. Assigns TagAnalyzer line colors to new or legacy series.
- `utils/series/PanelSeriesLabelFormatter.ts` - `formatSeriesLabel`, `getSeriesShortName`, `getSeriesEditorName`, `getSeriesName`. Centralizes the label and name rules for series across chart, editor, and display contexts.
- `utils/series/SelectedRangeSeriesSummaryBuilder.ts` - `buildSeriesSummaryRows`. Builds min, max, and avg summary rows from selected chart series data.
- `utils/series/TagSelectionPanelSeriesBuilder.ts` - `buildDefaultRange`, `buildCreateChartSeed`, `mergeSelectedTagsIntoTagSet`. Converts selected tag drafts into initial panel series config and merged series sets.

## Time

- `utils/time/IntervalUtils.ts` - `TimeUnitOption`, `SHIFT_TIME_UNIT_OPTIONS`, `normalizeTimeUnit`, `convertIntervalUnit`, `getTimeUnitMilliseconds`, `getIntervalMs`, `calculateInterval`, `formatDurationLabel`. Centralizes interval-unit normalization, conversion, and human-readable duration formatting.
- `utils/time/PanelTimeRangeResolver.ts` - `EMPTY_TIME_RANGE`, `resolvePanelTimeRange`, `resolveResetTimeRange`, `resolveInitialPanelRange`, `normalizeTimeBoundsInput`, `isSameTimeRange`, `toConcreteTimeRange`, `normalizeResolvedTimeBounds`, `normalizeBoardTimeRangeInput`, `normalizePanelTimeRangeSource`, `setTimeRange`, `restoreTimeRangePair`, `resolveGlobalTimeTargetRange`. Owns the main panel time range resolution pipeline, including normalization, persistence restoration, and board-to-panel range calculations.
- `utils/time/TimeBoundaryRangeResolver.ts` - `resolveTimeBoundaryRanges`. Owns time-boundary range orchestration and returns the current `ValueRangePair` model instead of exposing legacy boundary DTO fields.
- `utils/time/PanelRangeInteractionUtils.ts` - `PanelRangeUpdate`, `getNavigatorRangeFromEvent`, `getZoomInPanelRange`, `getZoomOutRange`, `getFocusedPanelRange`, `createPanelRangeControlHandlers`, `getMovedPanelRange`, `getMovedNavigatorRange`. Encapsulates range update calculations for zooming, focusing, moving, and navigator-driven interactions.
- `utils/time/RelativeTimeUtils.ts` - `subtractTimeOffset`, `getRelativeTimeOffsetMilliseconds`, `resolveLastRelativeBoundaryTime`, `resolveLastRelativeTimeRange`. Converts relative time offsets into concrete timestamps and ranges.
- `utils/time/TimeRangeParsing.ts` - `createRelativeTimeBoundary`, `parseTimeRangeInputValue`, `formatTimeRangeInputValue`, `formatAxisTime`, `isEmptyTimeBoundary`, `isAbsoluteTimeBoundary`, `isRelativeTimeBoundary`, `isLastRelativeTimeBoundary`, `isNowRelativeTimeBoundary`, `isRelativeTimeRangeConfig`, `isLastRelativeTimeRangeConfig`, `isNowRelativeTimeRangeConfig`, `isAbsoluteTimeRangeConfig`, `resolveTimeBoundaryValue`. Parses, formats, classifies, and resolves time boundary inputs.
- `utils/time/timeTypes.ts` - Multiple exported types. Defines the canonical time, interval, and range-related type system for Tag Analyzer.
