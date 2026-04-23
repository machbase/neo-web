# Chart Responsibility Refactor Plan

## Source Audits Used
- `chart/FOLDER_AUDIT.md`
- `chart/options/FOLDER_AUDIT.md`

## Goal
- Split files by responsibility, not just by helper count.
- Remove responsibilities from hotspot owners.
- Keep chart runtime behavior separate from ECharts option construction.
- Keep UI rendering separate from range policy, fetch policy, tooltip formatting, and highlight policy.
- Avoid new wrapper files that only rename existing branches.

## Implementation Status
- Completed the planned responsibility split for `chart` and `chart/options`.
- Removed the temporary `ChartAxisUtils.ts` and `ChartSeriesUtils.ts` compatibility facades after updating imports to the explicit responsibility owners.
- Added explicit owners for tooltip formatting, legend visibility, series composition, axis option construction, y-axis range resolution, fetch policy, overflow policy, runtime range policy, ECharts event routing, chart instance bridging, drag-select state, and popup rendering.
- Targeted chart verification passed with `63` tests across `5` suites.
- Full build is still blocked by existing non-TagAnalyzer TypeScript errors in dashboard/file-tree/save-modal code.

## Current Responsibility Hotspots

### `chart/ChartBody.tsx`
- Shared responsibility: UI rendering, drag-select popup state, FFT modal state, highlight-selection routing, summary calculation trigger, toast behavior, popup positioning, and right-click policy.
- Functions involved:
  - `ChartBody`
  - `handleSelection`
  - `handleCloseDragSelect`
  - `handleChartMouseDownCapture`
- Problem: `ChartBody` renders the shell and also owns selection workflow decisions.
- Refactor direction:
  - Keep `ChartBody.tsx` as the render shell.
  - Move drag-select popup state and selection routing into `useChartSelectionPopupState.ts`.
  - Move popup display markup into `ChartSelectionSummaryPopover.tsx`.
  - Keep `handleChartMouseDownCapture` local or move it to `ChartMouseInteractionGuards.ts` only if another chart wrapper needs it.
- Responsibility removed:
  - `ChartBody.tsx` no longer owns popup-state transitions or summary-building decisions.

### `chart/PanelChartStateLoader.ts`
- Shared responsibility: fetch request orchestration, time-range precedence, interval policy, sampling policy, raw/calculated fetch branching, row mapping, and overflow policy.
- Functions involved:
  - `fetchPanelDatasets`
  - `calculatePanelFetchCount`
  - `resolvePanelFetchTimeRange`
  - `resolveRawFetchSampling`
  - `resolvePanelFetchInterval`
  - `analyzePanelDataLimit`
  - `fetchPanelDatasetsFromRequest`
  - `createEmptyFetchPanelDatasetsResult`
- Problem: one file owns too many backend-facing policy decisions.
- Refactor direction:
  - Keep `PanelChartStateLoader.ts` as the public orchestration entry point with `loadNavigatorChartState` and `loadPanelChartState`.
  - Move count, range, interval, and sampling helpers into `PanelChartFetchPolicy.ts`.
  - Move `fetchPanelDatasets` and `fetchPanelDatasetsFromRequest` into `PanelChartDatasetFetcher.ts`.
  - Move `analyzePanelDataLimit` and overflow range creation into `PanelChartOverflowPolicy.ts`.
  - Keep `PanelChartLoadContracts.ts` as the shared type boundary.
- Responsibility removed:
  - `PanelChartStateLoader.ts` no longer owns low-level fetch policy or overflow policy.

### `chart/TimeSeriesChart.tsx`
- Shared responsibility: React rendering, ECharts instance access, visible-series state, option memoization, zoom sync, brush sync, legend-hover patching, highlight hit testing, event routing, and chart-ready recovery.
- Functions involved:
  - `TimeSeriesChart`
  - `getChartInstance`
  - `getHighlightIndexAtClientPosition`
  - `getLivePanelRange`
  - `syncBrushInteraction`
  - `syncPanelRange`
  - `applyLegendHoverState`
  - `handleChartReady`
  - event handlers inside the `onEvents` map
- Problem: the component owns both rendering and imperative ECharts runtime policy.
- Refactor direction:
  - Keep `TimeSeriesChart.tsx` as the ReactECharts render component.
  - Move ECharts instance access and chart handle setup into `useEChartsPanelInstance.ts`.
  - Move panel range sync and live dataZoom reading into `usePanelChartRangeSync.ts`.
  - Move brush cursor policy into `usePanelChartBrushSync.ts`.
  - Move legend hover patching into `usePanelChartLegendHover.ts`.
  - Move highlight hit testing into `ChartHighlightHitTesting.ts`.
  - Move the `onEvents` map into `usePanelChartEvents.ts`, depending on the smaller hooks above.
- Responsibility removed:
  - `TimeSeriesChart.tsx` no longer owns zoom policy, brush policy, legend-hover patch policy, or highlight hit-test geometry.

### `chart/useChartRuntimeController.ts`
- Shared responsibility: navigation state, stale-load guards, loaded-data range tracking, panel refresh, range application policy, overflow skip behavior, and parent notification.
- Functions involved:
  - `useChartRuntimeController`
  - `refreshPanelData`
  - `applyPanelAndNavigatorRanges`
  - `handleNavigatorRangeChange`
  - `handlePanelRangeChange`
  - `setExtremes`
  - `applyLoadedRanges`
- Problem: the hook owns both state storage and range-fetch policy.
- Refactor direction:
  - Keep `useChartRuntimeController.ts` as the public hook.
  - Move range-change decisions into `PanelChartRangePolicy.ts`.
  - Move stale request and refresh flow into `usePanelChartDataRefresh.ts`.
  - Move `createInitialPanelNavigateState`, `updateNavigateState`, and `buildNavigateStatePatchFromPanelLoad` into `PanelNavigateStateUtils.ts`.
  - Keep notification wiring in the public hook so parent contract stays visible.
- Responsibility removed:
  - `useChartRuntimeController.ts` no longer owns the detailed refetch decision tree.

## Chart Options Responsibility Hotspots

### `chart/options/ChartAxisUtils.ts`
- Shared responsibility: panel x-axis options, panel y-axis options, overlap y-axis range reuse, axis-bound scanning, mutable bound updates, and axis rounding.
- Functions involved:
  - `buildChartXAxisOption`
  - `buildChartYAxisOption`
  - `resolveOverlapYAxisRange`
  - `getSeriesValueRange`
  - `getRoundedAxisStep`
  - `roundAxisMaximum`
  - `updateAxisBounds`
  - `roundAxisBounds`
  - `getYAxisValues`
  - `resolveAxisRange`
- Problem: axis option building and axis range calculation live in one file.
- Refactor direction:
  - Keep `ChartAxisUtils.ts` or rename to `ChartAxisOptionBuilder.ts` for ECharts axis option construction only.
  - Move value scanning and rounding helpers into `ChartYAxisRangeResolver.ts`.
  - Move overlap-specific neutral axis template and `resolveOverlapYAxisRange` into `OverlapYAxisRangeResolver.ts`.
  - Change `updateAxisBounds` and `roundAxisBounds` to return new bounds instead of mutating arrays if the call sites stay readable.
- Responsibility removed:
  - Axis option builder no longer owns y-axis range scanning and overlap range policy.

### `chart/options/ChartOptionBuilder.ts`
- Shared responsibility: full option composition and panel tooltip HTML formatting.
- Functions involved:
  - `buildChartOption`
  - `buildChartTooltipOption`
  - `formatTooltipTime`
- Problem: structural option composition and tooltip HTML are mixed.
- Refactor direction:
  - Keep `buildChartOption` in `ChartOptionBuilder.ts`.
  - Move `buildChartTooltipOption` and `formatTooltipTime` into `ChartTooltipOption.ts`.
  - Keep `ChartOptionBuilder.ts` as a pure composer of imported sections.
- Responsibility removed:
  - Top-level option builder no longer owns tooltip formatting or tooltip HTML.

### `chart/options/ChartSeriesUtils.ts`
- Shared responsibility: legend selected state, visible-series list, highlight overlay series, highlight label series, threshold lines, main line series, navigator line series, and legend-hover dimming.
- Functions involved:
  - `buildChartLegendSelectedMap`
  - `buildDefaultVisibleSeriesMap`
  - `buildVisibleSeriesList`
  - `buildChartSeriesOption`
  - `buildHighlightOverlaySeries`
  - `buildHighlightLabelSeries`
  - `buildThresholdLine`
  - `buildMainSeries`
  - `buildNavigatorSeries`
- Problem: one utility file owns every series category and every series styling policy.
- Refactor direction:
  - Keep `buildChartSeriesOption` in `ChartSeriesOptionBuilder.ts` as the composer.
  - Move legend helpers into `ChartLegendVisibility.ts`.
  - Move `buildHighlightOverlaySeries` and `buildHighlightLabelSeries` into `ChartHighlightSeriesOptions.ts`.
  - Move `buildThresholdLine` into `ChartThresholdSeriesOptions.ts`.
  - Move `buildMainSeries` into `ChartMainSeriesOptions.ts`.
  - Move `buildNavigatorSeries` into `ChartNavigatorSeriesOptions.ts`.
  - Move shared legend-hover opacity calculations into `ChartLegendHoverStyle.ts` only if both main and navigator builders still duplicate that logic.
- Responsibility removed:
  - Series composer no longer owns highlight, threshold, main-series, navigator-series, and legend visibility details.

### `chart/options/OverlapChartOption.ts`
- Shared responsibility: overlap chart structure, overlap series construction, overlap tooltip configuration, and tooltip timestamp reconstruction.
- Functions involved:
  - `buildOverlapChartOption`
  - `buildOverlapTooltipOption`
- Problem: overlap chart layout and overlap tooltip HTML are mixed in one file.
- Refactor direction:
  - Keep `buildOverlapChartOption` in `OverlapChartOption.ts`.
  - Move `buildOverlapTooltipOption` into `OverlapTooltipOption.ts`.
  - Move overlap color list and series builder into `OverlapSeriesOptions.ts` if overlap series behavior grows.
- Responsibility removed:
  - Overlap chart option builder no longer owns tooltip HTML.

## Shared Responsibility Map

### Range And Zoom
- Shared by:
  - `TimeSeriesChart.tsx`: `getPrimaryDataZoomState`, `hasExplicitDataZoomRange`, `getLivePanelRange`, `syncPanelRange`, `onEvents.datazoom`
  - `chart/options/ChartInteractionUtils.ts`: `extractDataZoomRange`
  - `useChartRuntimeController.ts`: `applyPanelAndNavigatorRanges`, `handlePanelRangeChange`, `setExtremes`
- Separation:
  - Keep payload parsing in `ChartInteractionUtils.ts`.
  - Move live ECharts range synchronization to `usePanelChartRangeSync.ts`.
  - Move panel/navigator refetch decisions to `PanelChartRangePolicy.ts`.

### Brush And Selection
- Shared by:
  - `TimeSeriesChart.tsx`: `syncBrushInteraction`, `onEvents.brushEnd`
  - `ChartBody.tsx`: `handleSelection`, `handleCloseDragSelect`
  - `chart/options/ChartInteractionUtils.ts`: `extractBrushRange`
- Separation:
  - Keep brush payload parsing in `ChartInteractionUtils.ts`.
  - Move ECharts brush cursor sync to `usePanelChartBrushSync.ts`.
  - Move selection popup workflow to `useChartSelectionPopupState.ts`.

### Highlight Rendering And Interaction
- Shared by:
  - `ChartBody.tsx`: `handleSelection`
  - `TimeSeriesChart.tsx`: `getHighlightIndexAtClientPosition`, highlight-label click handler
  - `chart/options/ChartSeriesUtils.ts`: `buildHighlightOverlaySeries`, `buildHighlightLabelSeries`
- Separation:
  - Keep highlight series rendering in `ChartHighlightSeriesOptions.ts`.
  - Move highlight hit testing to `ChartHighlightHitTesting.ts`.
  - Keep highlight persistence routing in the parent panel state owner, with `ChartBody` only dispatching selected ranges.

### Legend Visibility And Hover
- Shared by:
  - `TimeSeriesChart.tsx`: visible-series state, `applyLegendHoverState`, legend event handlers
  - `chart/options/ChartSeriesUtils.ts`: `buildChartLegendSelectedMap`, `buildDefaultVisibleSeriesMap`, `buildVisibleSeriesList`, hover dimming inside main and navigator series builders
- Separation:
  - Move visibility helpers to `ChartLegendVisibility.ts`.
  - Move live hover patch orchestration to `usePanelChartLegendHover.ts`.
  - Keep pure opacity/style calculations near series builders unless duplicated.

### Data Loading And Runtime Refresh
- Shared by:
  - `PanelChartStateLoader.ts`: fetch count, interval, range, sampling, row mapping, overflow
  - `useChartRuntimeController.ts`: refresh timing, stale load guard, loaded data range, overflow skip, parent notification
- Separation:
  - Keep backend fetch policy in `PanelChartFetchPolicy.ts`.
  - Keep dataset fetching in `PanelChartDatasetFetcher.ts`.
  - Keep runtime refresh orchestration in `usePanelChartDataRefresh.ts`.
  - Keep parent-facing hook in `useChartRuntimeController.ts`.

### Tooltip Formatting
- Shared by:
  - `chart/options/ChartOptionBuilder.ts`: `buildChartTooltipOption`, `formatTooltipTime`
  - `chart/options/OverlapChartOption.ts`: `buildOverlapTooltipOption`
- Separation:
  - Move panel tooltip to `ChartTooltipOption.ts`.
  - Move overlap tooltip to `OverlapTooltipOption.ts`.
  - Keep shared tooltip constants in `ChartOptionConstants.ts`.

## Proposed Target File Layout

### `chart`
- `ChartBody.tsx`: render chart body shell only.
- `ChartSelectionSummaryPopover.tsx`: render selected-range summary popover.
- `useChartSelectionPopupState.ts`: own drag-select popup state and selection workflow.
- `ChartMouseInteractionGuards.ts`: optional shared mouse guard if reused.
- `PanelChartStateLoader.ts`: public load entry points only.
- `PanelChartFetchPolicy.ts`: count, time range, interval, and sampling policy.
- `PanelChartDatasetFetcher.ts`: per-series raw/calculated dataset fetching.
- `PanelChartOverflowPolicy.ts`: raw overflow detection and overflow range creation.
- `PanelNavigateStateUtils.ts`: initial navigation state and state patch helpers.
- `PanelChartRangePolicy.ts`: decide when panel/navigator changes require refetch.
- `usePanelChartDataRefresh.ts`: stale request guard and data refresh side effects.
- `TimeSeriesChart.tsx`: render ReactECharts and wire smaller hooks.
- `useEChartsPanelInstance.ts`: chart instance and imperative handle bridge.
- `usePanelChartRangeSync.ts`: dataZoom state read/write.
- `usePanelChartBrushSync.ts`: ECharts brush cursor synchronization.
- `usePanelChartLegendHover.ts`: legend hover patch orchestration.
- `usePanelChartEvents.ts`: ECharts event map composition.
- `ChartHighlightHitTesting.ts`: convert client position to highlight index.

### `chart/options`
- `ChartOptionBuilder.ts`: full option composer only.
- `ChartTooltipOption.ts`: panel tooltip config and timestamp formatting.
- `ChartAxisOptionBuilder.ts`: x-axis and y-axis option builders.
- `ChartYAxisRangeResolver.ts`: y-axis value scanning and rounding.
- `OverlapYAxisRangeResolver.ts`: overlap y-axis range policy.
- `ChartSeriesOptionBuilder.ts`: series composer only.
- `ChartLegendVisibility.ts`: legend selected/default/list helpers.
- `ChartHighlightSeriesOptions.ts`: highlight overlay and label series.
- `ChartThresholdSeriesOptions.ts`: threshold mark-line builder.
- `ChartMainSeriesOptions.ts`: main plot line series.
- `ChartNavigatorSeriesOptions.ts`: navigator lane line series.
- `ChartLegendHoverStyle.ts`: shared hover opacity/style helpers if needed.
- `OverlapChartOption.ts`: overlap chart composer only.
- `OverlapTooltipOption.ts`: overlap tooltip config and timestamp reconstruction.
- `OverlapSeriesOptions.ts`: optional overlap series builder if overlap grows.

## Refactor Order

### Phase 1: Low-risk pure option splits
1. Move panel tooltip helpers from `ChartOptionBuilder.ts` to `ChartTooltipOption.ts`.
2. Move overlap tooltip helpers from `OverlapChartOption.ts` to `OverlapTooltipOption.ts`.
3. Move legend visibility helpers from `ChartSeriesUtils.ts` to `ChartLegendVisibility.ts`.
4. Verify `ChartOptionBuilder.test.ts` after each move.

### Phase 2: Series responsibility split
1. Move threshold builder to `ChartThresholdSeriesOptions.ts`.
2. Move highlight overlay and label builders to `ChartHighlightSeriesOptions.ts`.
3. Move main series builder to `ChartMainSeriesOptions.ts`.
4. Move navigator series builder to `ChartNavigatorSeriesOptions.ts`.
5. Keep one composer in `ChartSeriesOptionBuilder.ts`.

### Phase 3: Axis responsibility split
1. Move y-axis range helpers into `ChartYAxisRangeResolver.ts`.
2. Move overlap y-axis range policy into `OverlapYAxisRangeResolver.ts`.
3. Rename or narrow `ChartAxisUtils.ts` to axis option building only.
4. Consider replacing mutating bounds helpers with return-value helpers.

### Phase 4: Fetch and runtime split
1. Extract `PanelChartFetchPolicy.ts`.
2. Extract `PanelChartOverflowPolicy.ts`.
3. Extract `PanelChartDatasetFetcher.ts`.
4. Keep `PanelChartStateLoader.ts` as the public loader facade.
5. Extract range refetch decisions from `useChartRuntimeController.ts` into `PanelChartRangePolicy.ts`.
6. Extract stale-load refresh side effects into `usePanelChartDataRefresh.ts`.

### Phase 5: ECharts runtime split
1. Extract `ChartHighlightHitTesting.ts`.
2. Extract `usePanelChartRangeSync.ts`.
3. Extract `usePanelChartBrushSync.ts`.
4. Extract `usePanelChartLegendHover.ts`.
5. Extract `usePanelChartEvents.ts`.
6. Keep `TimeSeriesChart.tsx` as the render-only integration shell.

### Phase 6: Chart body UI split
1. Extract `ChartSelectionSummaryPopover.tsx`.
2. Extract `useChartSelectionPopupState.ts`.
3. Keep `ChartBody.tsx` responsible for layout and wiring only.

## Verification Plan
- Run `npm test -- --runTestsByPath src/components/tagAnalyzer/chart/ChartBody.test.tsx`.
- Run `npm test -- --runTestsByPath src/components/tagAnalyzer/chart/TimeSeriesChart.test.tsx`.
- Run `npm test -- --runTestsByPath src/components/tagAnalyzer/chart/PanelChartStateLoader.test.ts`.
- Run `npm test -- --runTestsByPath src/components/tagAnalyzer/chart/useChartRuntimeController.test.ts`.
- Run `npm test -- --runTestsByPath src/components/tagAnalyzer/chart/options/ChartOptionBuilder.test.ts`.
- Run the full Tag Analyzer test set after all phases.

## Final Ownership Target
- `ChartBody.tsx`: layout and local chart-body wiring only.
- `TimeSeriesChart.tsx`: ReactECharts rendering only.
- `useChartRuntimeController.ts`: public runtime hook contract only.
- `PanelChartStateLoader.ts`: public data-load entry points only.
- `ChartOptionBuilder.ts`: panel option composition only.
- `ChartSeriesOptionBuilder.ts`: series composition only.
- `ChartAxisOptionBuilder.ts`: axis option construction only.
- Tooltip files: tooltip behavior and HTML only.
- Policy files: one explicit business policy each.
