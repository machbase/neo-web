# Chart Folder Move Plan

## Purpose
Before moving files, define the chart folder responsibility and identify files that do not match it.

This plan has been reviewed and implemented for the non-runtime moves.

Runtime movement remains deferred.

## Proposed Chart Folder Responsibility
The `chart` folder should own only chart presentation and ECharts-specific UI integration.

Responsibilities that belong in `chart`:
- Render chart UI components.
- Render chart summary and chart-local popup UI.
- Own ECharts wrapper integration and imperative ECharts event handling.
- Own ECharts option construction through `chart/options`.
- Own chart-local interaction helpers such as brush, zoom, legend hover, and highlight hit testing.

Responsibilities that should not live in `chart` long-term:
- Backend fetch request orchestration.
- Fetch count, sampling, interval, and raw-data overflow policy.
- Shared board/editor runtime controller logic.
- Generic panel navigation state helpers.
- Generic time-range refetch policy.
- Non-option ECharts event payload parsing inside `chart/options`.

## Proposed `chart/options` Responsibility
The `chart/options` folder should own ECharts option construction only.

Responsibilities that belong in `chart/options`:
- Build chart option sections.
- Build axis, series, tooltip, legend, grid, dataZoom, threshold, highlight, navigator, and overlap options.
- Store option-specific constants and option-specific types.

Responsibilities that should not live in `chart/options`:
- Brush payload parsing.
- DataZoom event payload parsing.
- Runtime event routing.
- Shared fetch or panel runtime policy.

## Files To Keep In `chart`
- `ChartBody.tsx`
- `ChartFooter.tsx`
- `ChartTimeSummary.tsx`
- `ChartSelectionSummaryPopover.tsx`
- `TimeSeriesChart.tsx`
- `ChartDataZoomStateUtils.ts`
- `ChartHighlightHitTesting.ts`
- `ChartRuntimeTypes.ts`
- `useChartSelectionPopupState.ts`
- `useEChartsPanelInstance.ts`
- `usePanelChartBrushSync.ts`
- `usePanelChartEvents.ts`
- `usePanelChartLegendHover.ts`
- `usePanelChartRangeSync.ts`
- `ChartFooter.scss`
- `ChartHeader.scss`
- `ChartShell.scss`
- Chart component tests that directly test chart rendering or ECharts behavior.

Reason:
These files are chart UI, ECharts runtime integration, or chart-local interaction code.

## Files To Keep In `chart/options`
- `ChartAxisOptionBuilder.ts`
- `ChartHighlightSeriesOptions.ts`
- `ChartLegendVisibility.ts`
- `ChartMainSeriesOptions.ts`
- `ChartNavigatorSeriesOptions.ts`
- `ChartOptionBuilder.ts`
- `ChartOptionConstants.ts`
- `ChartOptionSections.ts`
- `ChartSeriesOptionBuilder.ts`
- `ChartThresholdSeriesOptions.ts`
- `ChartTooltipOption.ts`
- `ChartYAxisRangeResolver.ts`
- `OverlapChartOption.ts`
- `OverlapTooltipOption.ts`
- `OverlapYAxisRangeResolver.ts`
- Option tests that directly test option output.

Reason:
These files build ECharts option objects or support option-specific calculations.

## Files To Move To `utils/fetch`

### Move `PanelChartLoadContracts.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartLoadContracts.ts`

Reason:
This file defines fetch request/result contracts and chart-load results, not visual chart behavior.

### Move `PanelChartFetchPolicy.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartFetchPolicy.ts`

Reason:
This file owns count, sampling, interval, and fetch time-range policy.

### Move `PanelChartOverflowPolicy.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartOverflowPolicy.ts`

Reason:
This file owns raw fetch overflow detection and overflow range construction.

### Move `PanelChartDatasetFetcher.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartDatasetFetcher.ts`

Reason:
This file fetches datasets and maps backend rows into chart datasets.

### Move `PanelChartStateLoader.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartStateLoader.ts`

Reason:
This file is the public chart data loader, but its responsibility is data loading, not chart rendering.

### Move `PanelChartStateLoader.test.ts`
New location:
`src/components/tagAnalyzer/utils/fetch/PanelChartStateLoader.test.ts`

Reason:
The test mainly verifies fetch/load policy and should stay beside the fetch files.

## Runtime Movement Deferred

Do not implement runtime movement in the current change.

The following files still do not fully match the chart folder responsibility, but they should stay in `chart` for now:
- `useChartRuntimeController.ts`
- `usePanelChartDataRefresh.ts`
- `PanelNavigateStateUtils.ts`
- `PanelChartRangePolicy.ts`
- `useChartRuntimeController.test.ts`

Reason:
The user explicitly asked not to do runtime movement right now.

## Files To Move Out Of `chart/options`

### Move `ChartInteractionUtils.ts`
New location:
`src/components/tagAnalyzer/chart/ChartInteractionUtils.ts`

Reason:
This file parses ECharts brush and dataZoom event payloads. It is chart runtime interaction logic, not option construction.

### Split interaction payload types out of `ChartOptionTypes.ts`
New file:
`src/components/tagAnalyzer/chart/ChartInteractionTypes.ts`

Move these types:
- `EChartDataZoomEventItem`
- `EChartDataZoomEventPayload`
- `EChartDataZoomOptionStateItem`
- `EChartBrushAreaPayload`
- `EChartBrushPayload`

Keep these types in `chart/options/ChartOptionTypes.ts`:
- Tooltip types.
- Threshold option types.
- Y-axis option helper types.
- Layout metrics.
- Use ECharts' `EChartsOption` directly instead of a local chart option alias.

Reason:
Event payload types are runtime interaction contracts, while `ChartOptionTypes.ts` should stay option-specific.

## Import Update Rules
- Do not create files that only export from other files.
- Do not keep compatibility facade files.
- Update every consumer to import directly from the file that owns the function or type.
- Update Jest mocks to mock the new owning file path.
- Keep import paths explicit even when that means more direct imports.

## Expected Import Changes
- `BoardPanel.test.tsx` should mock `../utils/fetch/PanelChartStateLoader`.
- `usePanelChartDataRefresh.ts` should import `loadPanelChartState` from `../utils/fetch/PanelChartStateLoader`.
- Fetch files moved into `utils/fetch` should import existing fetch helpers with local `./` paths.
- Chart runtime hooks should import `extractBrushRange` and `extractDataZoomRange` from `./ChartInteractionUtils`.
- Chart runtime hooks should import interaction payload types from `./ChartInteractionTypes`.
- Option files should keep importing option-only types from `./ChartOptionTypes`.

## Proposed Implementation Order
1. Create `Responsibility.md` in `chart` with the approved folder responsibility.
2. Move fetch/load files to `utils/fetch`.
3. Update imports and tests for fetch/load file moves.
4. Move `ChartInteractionUtils.ts` from `chart/options` to `chart`.
5. Split interaction types out of `ChartOptionTypes.ts`.
6. Confirm no `export ... from ...` files or compatibility facades were introduced.
7. Run chart/fetch targeted tests.
8. Run scoped lint for changed TagAnalyzer folders.

## Verification Plan
- Search for `export ... from` under `src/components/tagAnalyzer/chart` and moved files.
- Run `npx eslint src/components/tagAnalyzer/chart src/components/tagAnalyzer/utils/fetch --ext ts,tsx --max-warnings 0`.
- Run targeted tests:
  - `src/components/tagAnalyzer/chart/ChartBody.test.tsx`
  - `src/components/tagAnalyzer/chart/TimeSeriesChart.test.tsx`
  - `src/components/tagAnalyzer/chart/options/ChartOptionBuilder.test.ts`
  - `src/components/tagAnalyzer/utils/fetch/PanelChartStateLoader.test.ts`
  - `src/components/tagAnalyzer/chart/useChartRuntimeController.test.ts`
  - `src/components/tagAnalyzer/panel/BoardPanel.test.tsx`
