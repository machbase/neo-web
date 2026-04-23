# Chart Folder Responsibility

## Folder Responsibility
The `chart` folder owns chart presentation and ECharts-specific UI integration for Tag Analyzer.

## Responsibilities
- Render chart UI components.
- Render chart-local summary and popup UI.
- Own ECharts wrapper integration.
- Own ECharts event handling for chart interactions.
- Own chart-local brush, zoom, legend-hover, and highlight-hit-test behavior.
- Own ECharts option construction through the `chart/options` folder.

## `chart/options` Responsibility
The `chart/options` folder owns ECharts option construction only.

Responsibilities:
- Build chart option sections.
- Build axis, series, tooltip, legend, grid, dataZoom, threshold, highlight, navigator, and overlap options.
- Store option-specific constants.
- Store option-specific types.

## Not Chart Folder Responsibility
These responsibilities should not live in `chart`:
- Backend fetch request orchestration.
- Fetch count, sampling, interval, and raw-data overflow policy.
- Backend row-to-chart dataset fetching.
- Generic fetch request/result contracts.
- Non-option files inside `chart/options`.

## Current Exception
The shared runtime controller files are still in `chart` for now because runtime movement is intentionally deferred.

Files currently deferred:
- `useChartRuntimeController.ts`
- `usePanelChartDataRefresh.ts`
- `PanelNavigateStateUtils.ts`
- `PanelChartRangePolicy.ts`
- `useChartRuntimeController.test.ts`

## Move Rule
Do not create compatibility facade files that only export from other files.

Every consumer should import directly from the file that owns the function or type.
