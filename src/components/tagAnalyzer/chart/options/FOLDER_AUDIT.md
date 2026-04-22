# Folder Audit: `chart/options`

## Summary
- Date: 2026-04-22
- Direct files: `7`
- Direct subfolders: none
- Responsibility: This folder owns pure chart option builders, axis helpers, interaction helpers, and overlap-chart option builders.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Helper hotspot: `chart/options/ChartAxisUtils.ts` (10 named functions)

## Files

### `ChartAxisUtils.ts`
- Path: `chart/options/ChartAxisUtils.ts`
- Lines: 395
- Role: Builds X-axis and Y-axis option fragments and resolves numeric axis ranges for panel charts.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `buildChartXAxisOption` (45 lines, line 77) - Builds the x-axis option objects for the main plot and navigator lane. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildChartYAxisOption` (62 lines, line 144) - Builds the y-axis option objects for the panel's main plot and navigator lane. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `resolveOverlapYAxisRange` (15 lines, line 222) - Computes the shared y-axis range used by the overlap comparison chart. Needs edit: No. This function is small enough and focused enough for now.
  - `getSeriesValueRange` (10 lines, line 244) - Returns the lowest and highest y-values in a single series. Needs edit: No. This function is small enough and focused enough for now.
  - `getRoundedAxisStep` (18 lines, line 263) - Returns a rounded step size for the auto-generated y-axis ticks. Needs edit: No. This function is small enough and focused enough for now.
  - `roundAxisMaximum` (11 lines, line 290) - Rounds an axis maximum up to the next display-friendly step. Needs edit: No. This function is small enough and focused enough for now.
  - `updateAxisBounds` (11 lines, line 313) - Extends a running `[min, max]` pair so it includes one more series. Needs edit: No. This function is small enough and focused enough for now.
  - `roundAxisBounds` (6 lines, line 333) - Rounds finalized axis bounds into display-friendly values. Needs edit: No. This function is small enough and focused enough for now.
  - `getYAxisValues` (21 lines, line 350) - Collects and rounds the left-axis and right-axis data ranges. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveAxisRange` (11 lines, line 383) - Returns the manual axis range when one is configured, otherwise the computed fallback. Needs edit: No. This function is small enough and focused enough for now.

### `ChartInteractionUtils.ts`
- Path: `chart/options/ChartInteractionUtils.ts`
- Lines: 103
- Role: Extracts zoom and brush interaction ranges from ECharts payloads.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `extractDataZoomRange` (21 lines, line 17) - Resolves an ECharts zoom payload into an absolute time range. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `getPrimaryDataZoomItem` (5 lines, line 45) - Returns the first data-zoom item from direct or batched payloads. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `getExplicitDataZoomRange` (15 lines, line 57) - Reads explicit start and end timestamps from a zoom payload when they exist. Needs edit: No. This function is small enough and focused enough for now.
  - `getZoomBoundaryValue` (5 lines, line 79) - Normalizes a zoom boundary value into a single primitive. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `extractBrushRange` (13 lines, line 91) - Extracts the first selected brush window from a brush payload. Needs edit: No. This function is small enough and focused enough for now.

### `ChartOptionBuilder.ts`
- Path: `chart/options/ChartOptionBuilder.ts`
- Lines: 242
- Role: Builds the full panel chart option object, including tooltip behavior and axis/series composition.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `buildChartOption` (135 lines, line 42) - Builds the full ECharts option for the panel chart and navigator pair. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `buildChartTooltipOption` (39 lines, line 183) - Builds the tooltip configuration used by the main panel chart. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `formatTooltipTime` (12 lines, line 229) - Formats a tooltip timestamp into the panel's display string. Needs edit: No. This function is small enough and focused enough for now.

### `ChartOptionConstants.ts`
- Path: `chart/options/ChartOptionConstants.ts`
- Lines: 83
- Role: Defines layout metrics used while building chart option objects.
- Similar files: `chart/options/ChartOptionTypes.ts`
- Combine note: Keep separate while each type file clearly belongs to a different boundary; combine only if the same fields start repeating.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `getChartLayoutMetrics` (15 lines, line 67) - Returns the shared vertical layout metrics for the main plot, toolbar lane, and slider. Needs edit: No. This function is small enough and focused enough for now.

### `ChartOptionTypes.ts`
- Path: `chart/options/ChartOptionTypes.ts`
- Lines: 94
- Role: Defines the local chart-option types used by the chart option builder layer.
- Similar files: `chart/options/ChartOptionConstants.ts`
- Combine note: Keep separate while each type file clearly belongs to a different boundary; combine only if the same fields start repeating.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `ChartSeriesUtils.ts`
- Path: `chart/options/ChartSeriesUtils.ts`
- Lines: 456
- Role: Builds chart series option fragments, highlight overlays, threshold lines, and legend selection state.
- Similar files: `chart/TimeSeriesChart.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `buildChartLegendSelectedMap` (9 lines, line 34) - Converts legend visibility into the selected-series map ECharts expects. Needs edit: No. This function is small enough and focused enough for now.
  - `buildDefaultVisibleSeriesMap` (10 lines, line 50) - Builds the default visibility map with every unique series enabled. Needs edit: No. This function is small enough and focused enough for now.
  - `buildVisibleSeriesList` (9 lines, line 68) - Returns the current legend visibility in a UI-friendly list form. Needs edit: No. This function is small enough and focused enough for now.
  - `buildChartSeriesOption` (26 lines, line 88) - Builds the series portion of the panel chart option. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `buildHighlightOverlaySeries` (76 lines, line 122) - Builds a dedicated non-legend overlay series for saved highlight ranges. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildHighlightLabelSeries` (72 lines, line 209) - Builds a dedicated clickable label series for saved highlights. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildThresholdLine` (22 lines, line 290) - Builds a threshold mark-line definition when that threshold is enabled. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `buildMainSeries` (82 lines, line 322) - Builds the main plot series definitions for the panel chart. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `buildNavigatorSeries` (44 lines, line 412) - Builds the navigator-lane series definitions for the panel chart. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `OverlapChartOption.ts`
- Path: `chart/options/OverlapChartOption.ts`
- Lines: 149
- Role: Builds the chart option used by the overlap comparison modal.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `buildOverlapChartOption` (72 lines, line 38) - Builds the single-grid chart option used by the overlap modal. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildOverlapTooltipOption` (30 lines, line 118) - Builds the tooltip configuration used by the overlap modal chart. Needs edit: No. This function is small enough and focused enough for now.

