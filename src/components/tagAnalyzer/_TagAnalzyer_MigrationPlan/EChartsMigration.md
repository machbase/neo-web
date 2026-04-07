# ECharts Migration

## Status

The active TagAnalyzer chart runtime is now ECharts.

The migrated paths are:

- live board chart
- editor preview chart
- overlap chart

## Main files

- `panel/PanelEChartUtil.ts`
  Builds ECharts options directly from panel state.

- `panel/NewEChart.tsx`
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

This was not only an option-format conversion.

The important change was replacing the old Highcharts runtime boundary with:

- React-owned panel/navigator state
- an ECharts option builder
- a smaller chart handle used by both board and preview controllers
