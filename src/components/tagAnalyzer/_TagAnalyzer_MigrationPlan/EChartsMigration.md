# ECharts Migration

The migration replaced the chart-runtime boundary, not just the chart option syntax.

## Status

The active TagAnalyzer chart runtime is now ECharts.

The active file paths are:

- `panel/PanelBoardChart.tsx`
- `editor/PanelEditorPreviewChart.tsx`
- `modal/OverlapChart.tsx`
- `modal/OverlapModal.tsx`

## Main files

- `panel/PanelEChartUtil.ts`
  Builds ECharts options directly from panel state.

- `panel/PanelChart.tsx`
  Wraps `ReactECharts`, exposes a small chart handle, and forwards zoom / brush / legend events.

- `panel/PanelBoardChart.tsx`
  Live panel controller.

- `editor/PanelEditorPreviewChart.tsx`
  Preview controller using the same chart contract.

- `modal/OverlapChart.tsx` and `modal/OverlapModal.tsx`
  ECharts overlap rendering plus offset/fetch orchestration.

## Highcharts to ECharts mapping

- Highstock navigator
  Replaced by `dataZoom` plus a secondary overview grid/series.

- `setExtremes(...)`
  Replaced by ECharts `dispatchAction({ type: 'dataZoom' })`.

- Selection + plot band
  Replaced by brush selection plus React popup state.

- Y-axis `plotLines`
  Replaced by `markLine`.

- Highcharts visible-series lookup
  Replaced by ECharts legend selected state and `getVisibleSeries()`.

## What did not change

- Panel fetch logic
- Runtime panel model
- Board/editor ownership
- Most header/footer UI behavior

## Practical takeaway

The important change was replacing the old Highcharts runtime boundary with:

- React-owned panel/navigator state
- an ECharts option builder
- a smaller chart handle used by both board and preview controllers
