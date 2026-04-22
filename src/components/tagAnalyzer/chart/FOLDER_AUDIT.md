# Folder Audit: `chart`

## Summary
- Date: 2026-04-22
- Direct files: `8`
- Direct subfolders: `chart/options`
- Responsibility: This folder owns the auditable production files for this area.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `chart/TimeSeriesChart.tsx` (673 lines)
- Helper hotspot: `chart/useChartRuntimeController.ts` (11 named functions)

## Files

### `ChartBody.tsx`
- Path: `chart/ChartBody.tsx`
- Lines: 262
- Role: Renders the chart body area and wires drag selection, highlight interactions, chart empty states, and footer controls.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `ChartBody` (214 lines, line 46) - Combines the chart view with the local popup UI around it. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `handleSelection` (34 lines, line 83) - Captures the selected chart window and opens the local stats popup for that range. Needs edit: No. This function is small enough and focused enough for now.
  - `handleCloseDragSelect` (4 lines, line 123) - Clears the current drag selection and closes the summary popup. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; check whether this tiny abstraction is carrying enough meaning to keep.
  - `handleChartMouseDownCapture` (8 lines, line 139) - Stops right-button presses from reaching the chart surface. Needs edit: No. This function is small enough and focused enough for now.

### `ChartFooter.scss`
- Path: `chart/ChartFooter.scss`
- Lines: 52
- Role: Stores SCSS styles for chart footer.
- Similar files: `chart/ChartHeader.scss`, `chart/ChartShell.scss`
- Combine note: Keep separate; each style file is already attached to a different visual area.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `ChartFooter.tsx`
- Path: `chart/ChartFooter.tsx`
- Lines: 114
- Role: Renders the footer controls and status text for panel range, raw mode, drag selection, and highlight mode.
- Similar files: `chart/ChartFooter.scss`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `ChartFooter` (85 lines, line 26) - Displays the footer controls between the main panel and bottom zoom slider. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.

### `ChartHeader.scss`
- Path: `chart/ChartHeader.scss`
- Lines: 75
- Role: Stores SCSS styles for chart header.
- Similar files: `chart/ChartFooter.scss`, `chart/ChartShell.scss`
- Combine note: Keep separate; each style file is already attached to a different visual area.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `ChartShell.scss`
- Path: `chart/ChartShell.scss`
- Lines: 53
- Role: Stores SCSS styles for chart shell.
- Similar files: `chart/ChartFooter.scss`, `chart/ChartHeader.scss`
- Combine note: Keep separate; each style file is already attached to a different visual area.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `ChartTimeSummary.tsx`
- Path: `chart/ChartTimeSummary.tsx`
- Lines: 29
- Role: Renders the compact time summary text shown beside the chart controls.
- Similar files: `utils/series/SeriesSummaryUtils.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `ChartTimeSummary` (17 lines, line 9) - Renders the shared time and interval summary used by board and preview panel headers. Needs edit: No. This function is small enough and focused enough for now.

### `TimeSeriesChart.tsx`
- Path: `chart/TimeSeriesChart.tsx`
- Lines: 673
- Role: Wraps the ECharts instance and translates chart events, drag ranges, highlights, and zoom state into panel callbacks.
- Similar files: `chart/options/ChartSeriesUtils.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `isLegendHoverPayload` (5 lines, line 112) - Returns whether a highlight/downplay payload came from legend hover actions. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `getPrimaryDataZoomState` (9 lines, line 124) - Returns the primary data-zoom payload regardless of whether ECharts sent it directly or inside `batch`. Needs edit: No. This function is small enough and focused enough for now.
  - `hasExplicitDataZoomRange` (13 lines, line 140) - Returns whether a live data-zoom payload exposes enough state to reconstruct a range. Needs edit: No. This function is small enough and focused enough for now.
  - `TimeSeriesChart` (510 lines, line 160) - Displays the main panel graph and its navigator/scroll area. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.

### `useChartRuntimeController.ts`
- Path: `chart/useChartRuntimeController.ts`
- Lines: 362
- Role: Shares panel chart loading, navigator state, visible-range updates, and panel-range callbacks between board and preview charts.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `createInitialPanelNavigateState` (10 lines, line 44) - Builds the empty navigate state used before any panel data has been loaded. Needs edit: No. This function is small enough and focused enough for now.
  - `buildNavigateStatePatchFromPanelLoad` (14 lines, line 62) - Converts a panel fetch result into the navigate-state patch used by both board and preview charts. Needs edit: No. This function is small enough and focused enough for now.
  - `useChartRuntimeController` (273 lines, line 89) - Shares panel and slider-range orchestration between board and preview chart shells. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `updateNavigateState` (7 lines, line 114) - Merges a navigate-state patch into both the React state and the imperative ref snapshot. Needs edit: No. This function is small enough and focused enough for now.
  - `notifyPanelRangeApplied` (6 lines, line 129) - Notifies the outer shell that a panel-range change has fully applied. Needs edit: No. This function is small enough and focused enough for now.
  - `refreshPanelData` (40 lines, line 145) - Reloads the main panel dataset and reapplies any overflow-clamped visible range. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `applyPanelAndNavigatorRanges` (64 lines, line 196) - Applies a visible panel range, reloading chart data when the visible window zooms (width changes) or escapes the currently loaded data range. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `handleNavigatorRangeChange` (6 lines, line 268) - Tracks slider window changes and stores the new overview range. Needs edit: No. This function is small enough and focused enough for now.
  - `handlePanelRangeChange` (20 lines, line 282) - Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window. Needs edit: No. This function is small enough and focused enough for now.
  - `setExtremes` (10 lines, line 311) - Applies a panel range and optional navigator range through the shared chart event path. Needs edit: No. This function is small enough and focused enough for now.
  - `applyLoadedRanges` (20 lines, line 330) - Loads a matched panel/slider-range pair for initialization or explicit refresh flows. Needs edit: No. This function is small enough and focused enough for now.

