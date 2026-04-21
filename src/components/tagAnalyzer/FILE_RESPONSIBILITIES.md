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

## Common Tag Selection

- `common/tagSelection/TagSelectionModeRow.tsx` - `default(TagSelectionModeRow)`. Renders one selectable tag mode row in the shared tag selection UI.
- `common/tagSelection/TagSelectionPanel.tsx` - `SelectedSeriesDraftListItem`, `PaginationProp`, `mapTagSearchItemsToListItems`, `findTagById`, `mapSelectedSeriesDraftListItems`, `default(TagSelectionPanel)`. Owns the reusable tag selection panel UI and the exported mapping helpers that adapt search results and selected drafts for display.
- `common/tagSelection/index.ts` - `TagSelectionModeRow`, `TagSelectionPanel`. Re-exports the shared tag selection UI entry points.
- `common/tagSelection/tagSelectionPresentation.ts` - `buildTagSelectionLimitError`, `getTagSelectionErrorMessage`, `getTagSelectionCountColor`, `buildTagSelectionCountLabel`. Encapsulates display text and visual-state rules for tag selection feedback.
- `common/tagSelection/tagSelectionTypes.ts` - `TagSearchItem`, `TagSelectionSourceColumns`, `TagSelectionDraftItem`, `UseTagSelectionStateOptions`. Defines the public data shapes used by shared tag selection flows.
- `common/tagSelection/useTagSelectionState.ts` - `useTagSelectionState`. Manages the reusable tag selection state machine for search results, selected drafts, limits, and editing actions.

## Editor

- `editor/AddTagsModal.tsx` - `default(AddTagsModal)`. Renders the modal used to search for and add tags into editor state.
- `editor/OverlapTimeShiftControls.tsx` - `OverlapShiftDirection`, `default(OverlapTimeShiftControls)`. Defines overlap shift directions and renders controls for shifting overlap panel time ranges.
- `editor/PanelEditor.tsx` - `default(PanelEditor)`. Provides the main panel editor container that coordinates editor tabs and save flows.
- `editor/PanelEditorConfigConverter.ts` - `convertPanelInfoToEditorConfig`, `mergeEditorConfigIntoPanelInfo`. Translates between runtime panel models and editable panel editor draft models.
- `editor/PanelEditorPreviewChart.tsx` - `default(PanelEditorPreviewChart)`. Renders the preview chart used inside the panel editor.
- `editor/PanelEditorTypes.ts` - `EditorCheckboxInputEvent`, `EditorInputEvent`, `parseEditorNumber`, `EditTabPanelType`, `TagAnalyzerPanelGeneralConfig`, `TagAnalyzerPanelDataConfig`, `TagAnalyzerPanelTimeConfig`, `TagAnalyzerPanelAxesDraft`, `TagAnalyzerPanelDisplayDraft`, `TagAnalyzerPanelEditorConfig`. Defines the editor-facing event helpers and draft model types.
- `editor/PanelEditorUtils.ts` - `EDITOR_TABS`, `resolveEditorTimeBounds`. Centralizes editor tab definitions and the editor-specific time bound resolution helper.
- `editor/useSavePanelToGlobalRecoilState.ts` - `useSavePanelToGlobalRecoilState`. Encapsulates the save flow that writes editor output back into global Recoil board state.

## Editor Sections

- `editor/sections/AxesSection.tsx` - `default(AxesSection)`. Renders the editor section that edits axis settings.
- `editor/sections/DataSection.tsx` - `default(DataSection)`. Renders the editor section that edits data source and aggregation settings.
- `editor/sections/DisplaySection.tsx` - `default(DisplaySection)`. Renders the editor section that edits display and rendering options.
- `editor/sections/EditorTabContent.tsx` - `default(EditorTabContent)`. Switches and renders the active editor tab content.
- `editor/sections/GeneralSection.tsx` - `default(GeneralSection)`. Renders the editor section for general panel metadata and basic settings.
- `editor/sections/PanelEditorSettings.tsx` - `default(PanelEditorSettings)`. Composes the editor settings area from the section components.
- `editor/sections/TimeRangeSection.tsx` - `default(TimeRangeSection)`. Renders the editor section that edits panel time range configuration.

## Modal

- `modal/CreateChartModal.tsx` - `default(CreateChartModal)`. Renders the modal flow that creates a new chart or panel from selected tags.
- `modal/OverlapModal.tsx` - `default(OverlapModal)`. Renders the modal used to compare or overlap panel ranges.
- `modal/OverlapComparisonUtils.ts` - `OverlapInterval`, `OverlapLoadResult`, `shiftOverlapPanels`, `buildOverlapLoadState`, `resolveOverlapTimeRange`, `alignOverlapTime`, `mapOverlapRows`, `getNextOverlapPanels`. Owns the overlap-specific data transformations used to build shifted comparison views.

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
- `panel/usePanelChartRuntimeController.ts` - `createInitialPanelNavigateState`, `buildNavigateStatePatchFromPanelLoad`, `usePanelChartRuntimeController`. Owns panel runtime navigation state and the controller hook that ties fetch, zoom, shift, and refresh behavior together.

## Panel Chart Options

- `panel/chartOptions/OverlapChartOption.ts` - `buildOverlapChartOption`. Builds chart options for overlap comparison panels.
- `panel/chartOptions/PanelChartAxisUtils.ts` - `buildPanelXAxisOption`, `buildPanelYAxisOption`, `resolveOverlapYAxisRange`. Generates axis configuration for normal and overlap panel charts.
- `panel/chartOptions/PanelChartInteractionUtils.ts` - `extractDataZoomRange`, `extractBrushRange`. Converts ECharts interaction payloads into Tag Analyzer range values.
- `panel/chartOptions/PanelChartOptionBuilder.ts` - `buildPanelChartOption`. Assembles the full ECharts option object for a panel chart.
- `panel/chartOptions/PanelChartOptionConstants.ts` - Multiple constants plus `getPanelChartLayoutMetrics`. Centralizes visual constants, shared chart styles, and layout metric calculation.
- `panel/chartOptions/PanelChartOptionTypes.ts` - Multiple exported types. Defines the option, tooltip, axis, zoom, and brush types shared by chart option builders.
- `panel/chartOptions/PanelChartSeriesUtils.ts` - `buildPanelLegendSelectedMap`, `buildDefaultVisibleSeriesMap`, `buildVisibleSeriesList`, `buildPanelChartSeriesOption`. Builds the series and legend-related pieces of panel chart options.

## Shared Models

- `utils/boardTypes.ts` - Multiple exported types. Defines board-level state, action payloads, and board interaction contracts.
- `utils/panelModelTypes.ts` - `PanelMeta`, `PanelData`, `PanelTime`, `PanelAxes`, `PanelDisplay`, `PanelInfo`. Defines the persisted and editable panel model shape.
- `utils/panelRuntimeTypes.ts` - Multiple exported types. Defines panel runtime state, refs, event payloads, and handler contracts used while a panel is mounted.

## Fetch

- `utils/fetch/TagAnalyzerDataRepository.ts` - `tagAnalyzerDataApi`, `parseChartCsvResponse`, `fetchCalculationData`, `fetchRawData`, `fetchTablesData`, `getRollupTableList`, `fetchParsedTables`, `fetchTopLevelTimeBoundaryRanges`. Provides the backend-facing repository layer for chart, table, and time-boundary fetches.
- `utils/fetch/ChartSeriesMapper.ts` - `mapRowsToChartData`, `buildChartSeriesItem`. Converts fetched rows into chart-ready structures.
- `utils/fetch/ChartSeriesRowsLoader.ts` - `fetchCalculatedSeriesRows`, `fetchRawSeriesRows`. Loads one series at a time through explicit calculated or raw fetch paths.
- `utils/fetch/FetchQueryUtils.ts` - `showRequestError`, `getQualifiedTableName`, `getCalculationTableName`, `calculateSampleCount`, `resolveFetchTimeBounds`, `buildCsvTqlQuery`, `buildCalculationMainQuery`, `buildRawQuery`. Provides fetch-query building plus a small set of shared fetch helpers.
- `utils/fetch/PanelChartDataLoader.ts` - `loadNavigatorChartState`, `loadPanelChartState`, `isFetchableTimeRange`, `fetchPanelDatasets`, `calculatePanelFetchCount`, `resolvePanelFetchTimeRange`, `resolvePanelFetchInterval`, `analyzePanelDataLimit`. Orchestrates panel and navigator chart-state loading, including interval selection, range resolution, dataset loading, and raw-data overflow handling.
- `utils/fetch/FetchContracts.ts` - Multiple exported types. Defines request, response, row, and result shapes for fetch workflows.
- `utils/fetch/TagMetadataSearchRepository.ts` - `EMPTY_TAG_SELECTION_COLUMNS`, `fetchTagSearchColumns`, `fetchTagSearchPage`. Provides the repository layer for tag metadata discovery and paginated tag search results.

## Legacy Adapters

- `utils/legacy/LegacySeriesAdapter.ts` - `getSourceTagName`, `withNormalizedSourceTagName`, `normalizeSourceTagNames`, `normalizeLegacySeriesConfigs`, `normalizeLegacyChartSeries`, `toLegacyTagNameItem`, `toLegacyTagNameList`, `toLegacySeriesConfigs`, `legacySeriesToChartPoints`. Converts between legacy series naming/data formats and the normalized Tag Analyzer series model.
- `utils/legacy/LegacyStorageAdapter.ts` - `normalizeBoardInfo`, `toLegacyFlatPanelInfo`, `getNextBoardListWithSavedPanels`, `getNextBoardListWithSavedPanel`, `getNextBoardListWithoutPanel`. Normalizes stored board data and bridges between current board state and legacy persistence formats.
- `utils/legacy/LegacyTimeAdapter.ts` - `normalizeLegacyTimeBoundaryRanges`, `normalizeLegacyTimeRangeBoundary`, `toLegacyTimeRangeInput`, `toLegacyTimeValue`. Converts between legacy time representations and the current time model.
- `utils/legacy/LegacyTypes.ts` - Multiple exported types. Defines the legacy-compatible board, series, chart, and time type shapes.

## Series

- `utils/series/seriesTypes.ts` - `SeriesColumns`, `SeriesConfig`, `ChartRow`, `ChartSeriesPoint`, `ChartSeriesItem`, `ChartData`, `MinMaxItem`. Defines series-level source, chart, and min/max data shapes.
- `utils/series/TagAnalyzerSeriesDataUtils.ts` - `seriesDataToPoints`, `chartRowsToPoints`, `chartSeriesToPoints`. Converts series and chart row data into point arrays.
- `utils/series/TagAnalyzerSeriesLabelUtils.ts` - `formatSeriesLabel`, `getSeriesShortName`, `getSeriesEditorName`, `getSeriesName`. Centralizes the label and name rules for series across chart, editor, and display contexts.
- `utils/series/TagAnalyzerSeriesUtils.ts` - `TAG_ANALYZER_AGGREGATION_MODES`, `TAG_ANALYZER_AGGREGATION_MODE_OPTIONS`, `buildSeriesSummaryRows`. Defines supported aggregation modes and builds summary rows from configured series.
- `utils/series/TagSelectionSeriesUtils.ts` - `buildDefaultRange`, `buildCreateChartSeed`, `mergeSelectedTagsIntoTagSet`. Converts selected tags into initial panel configuration and merged series sets.

## Time

- `utils/time/IntervalUtils.ts` - `TimeUnitOption`, `SHIFT_TIME_UNIT_OPTIONS`, `normalizeTimeUnit`, `convertIntervalUnit`, `getTimeUnitMilliseconds`, `getIntervalMs`, `calculateInterval`, `formatDurationLabel`. Centralizes interval-unit normalization, conversion, and human-readable duration formatting.
- `utils/time/PanelTimeRangeResolver.ts` - `BoundaryTimeRange`, `MinMaxTableResponse`, `EMPTY_TIME_RANGE`, `resolvePanelTimeRange`, `resolveResetTimeRange`, `resolveInitialPanelRange`, `fetchMinMaxTable`, `resolveTimeBoundaryRanges`, `normalizeTimeBoundsInput`, `normalizeTimeRangeConfig`, `isSameTimeRange`, `toConcreteTimeRange`, `normalizeResolvedTimeBounds`, `normalizeBoardTimeRangeInput`, `normalizePanelTimeRangeSource`, `setTimeRange`, `restoreTimeRangePair`, `resolveGlobalTimeTargetRange`. Owns the main time range resolution pipeline, including normalization, persistence restoration, min/max fetch support, and board-to-panel range calculations.
- `utils/time/PanelRangeInteractionUtils.ts` - `PanelRangeUpdate`, `getNavigatorRangeFromEvent`, `getZoomInPanelRange`, `getZoomOutRange`, `getFocusedPanelRange`, `createPanelRangeControlHandlers`, `getMovedPanelRange`, `getMovedNavigatorRange`. Encapsulates range update calculations for zooming, focusing, moving, and navigator-driven interactions.
- `utils/time/RelativeTimeUtils.ts` - `subtractTimeOffset`, `getRelativeTimeOffsetMilliseconds`, `resolveLastRelativeBoundaryTime`, `resolveLastRelativeTimeRange`. Converts relative time offsets into concrete timestamps and ranges.
- `utils/time/TimeRangeParsing.ts` - `createRelativeTimeBoundary`, `parseTimeRangeInputValue`, `formatTimeRangeInputValue`, `formatAxisTime`, `isEmptyTimeBoundary`, `isAbsoluteTimeBoundary`, `isRelativeTimeBoundary`, `isLastRelativeTimeBoundary`, `isNowRelativeTimeBoundary`, `isRelativeTimeRangeConfig`, `isLastRelativeTimeRangeConfig`, `isNowRelativeTimeRangeConfig`, `isAbsoluteTimeRangeConfig`, `resolveTimeBoundaryValue`. Parses, formats, classifies, and resolves time boundary inputs.
- `utils/time/timeTypes.ts` - Multiple exported types. Defines the canonical time, interval, and range-related type system for Tag Analyzer.
