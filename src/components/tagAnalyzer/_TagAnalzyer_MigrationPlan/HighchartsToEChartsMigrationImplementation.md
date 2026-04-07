# Highcharts to ECharts Migration Implementation

This document explains how the TagAnalyzer Highcharts-to-ECharts migration was actually implemented.

It complements:

- `HighchartsToEChartsMigrationPlan.md`
- `NewTagAnalyzerStructure.md`
- `PanelBoardChartFunctionNotes.md`

The plan document described the risky areas.
This document records the implementation that was used to move the active TagAnalyzer chart runtime to ECharts.

## Outcome

The active TagAnalyzer chart paths now render through ECharts:

- board panel chart
- editor preview chart
- overlap chart

The migration kept the existing panel/runtime data flow and replaced the renderer/runtime chart boundary instead of trying to translate Highcharts options one-for-one.

## Main idea

The migration was done as a renderer swap with a small adapter boundary.

Instead of:

- React state -> Highcharts option builder
- controller logic calling `chart.xAxis[0].setExtremes(...)`
- controller logic calling `chart.navigator.xAxis.setExtremes(...)`

the new flow is:

- React state -> ECharts option builder
- controllers talk to a small chart handle
- zoom/select/legend events flow back up through React callbacks

This followed the direction recommended in `HighchartsToEChartsMigrationPlan.md`:

- keep fetch/state logic
- replace the renderer contract
- re-implement runtime behavior around that contract

## Files involved

### New active ECharts runtime files

- `panel/PanelEChartUtil.ts`
- `panel/NewEChart.tsx`

### Controllers updated to use the ECharts runtime

- `panel/PanelBoardChart.tsx`
- `editor/PanelEditorPreviewChart.tsx`
- `panel/PanelBody.tsx`
- `modal/OverlapChart.tsx`
- `modal/OverlapModal.tsx`

### Shared type/helper updates

- `panel/TagAnalyzerPanelTypes.ts`
- `TagAnalyzerUtil.ts`
- `panel/Panel.scss`

### Legacy helper files left as deprecated stubs

- `EChartUtil.ts`
- `panel/HighChartConfigure.ts`
- `modal/OverlapChartUtil.ts`

These files were not kept as active runtime paths after the migration.

## Migration steps

## 1. Install the runtime dependency

The migration first added `echarts` so `echarts-for-react` had the real runtime available.

Checkpoint commit:

- `7703199b` `chore(tag-analyzer): add echarts runtime dependency`

## 2. Create a new chart runtime boundary

The existing Highcharts path leaked chart-library details into controller components.

To reduce that coupling, `TagAnalyzerPanelTypes.ts` gained a small chart handle:

- `setPanelRange(range)`
- `getVisibleSeries()`

This let the controllers stop depending on:

- `chartRef.current.chart`
- `xAxis[0].setExtremes(...)`
- `navigator.xAxis.getExtremes()`

and instead talk to a smaller renderer-owned contract.

## 3. Build ECharts options directly from panel state

`panel/PanelEChartUtil.ts` was introduced as the new option/runtime helper.

It builds:

- main panel series
- navigator series
- dual-grid layout
- dual x-axis layout
- y-axis ranges
- UCL/LCL lines
- tooltip formatters
- legend selected state
- overlap-chart options

It also added small extraction helpers for:

- `dataZoom` range events
- brush selection range events
- visible-series mapping

The important architectural choice here was:

- do not convert Highcharts options at runtime
- build ECharts options directly from TagAnalyzer panel state

## 4. Replace `NewEChart.tsx`

`panel/NewEChart.tsx` was changed from a Highcharts wrapper into an ECharts wrapper.

Old responsibilities:

- create a Highstock chart
- configure navigator through Highstock
- configure selection through Highcharts events
- mutate Highcharts DOM after render

New responsibilities:

- render `ReactECharts`
- build options with `PanelEChartUtil.ts`
- dispatch `dataZoom` for panel range updates
- enable/disable brush mode for drag selection
- surface legend visibility through `getVisibleSeries()`

Key event mappings:

- Highcharts `setExtremes` -> ECharts `datazoom`
- Highcharts selection event -> ECharts `brushSelected`
- Highcharts visible series lookup -> ECharts legend selected map

## 5. Rewire the main board controller

`panel/PanelBoardChart.tsx` kept its fetch/state/orchestration role.

What changed:

- the chart ref now points to `PanelChartHandle`
- `setExtremes(...)` now updates navigator state and then calls `setPanelRange(...)`
- overflow handling now calls the renderer handle instead of Highcharts APIs
- raw-mode persistence uses React-held navigator state instead of reading Highcharts navigator extremes

What did not change:

- panel data fetching
- navigator data fetching
- raw mode semantics
- board/global-time coordination
- overlap selection ownership

This kept the migration localized to the chart boundary instead of rewriting the panel runtime.

## 6. Rewire the editor preview controller

`editor/PanelEditorPreviewChart.tsx` was updated in the same way as the board controller.

Changes:

- preview chart ref now uses `PanelChartHandle`
- panel range changes call `setPanelRange(...)`
- navigator reload decisions stay in React state
- overflow correction uses the new renderer handle

This kept the preview flow aligned with the board flow and avoided maintaining a second chart runtime.

## 7. Move drag-select behavior off Highcharts plot bands

`panel/PanelBody.tsx` previously depended on:

- Highcharts `selection`
- `addPlotBand(...)`
- `removePlotBand(...)`

After migration:

- selection comes from ECharts brush events
- the selection result is passed in as `{ min, max }`
- min/max/avg is computed directly from chart dataset arrays

This was also the reason `TagAnalyzerUtil.ts` was updated:

- `computeSeriesCalcList(...)` now accepts the ECharts-style `[x, y]` dataset shape

The FFT popup and selection summary stayed in `PanelBody.tsx`; only the selection source changed.

## 8. Migrate the overlap chart

`modal/OverlapChart.tsx` was moved to `ReactECharts`.

`modal/OverlapModal.tsx` kept the existing fetch/orchestration logic, but its renderer changed to the overlap option builder in `PanelEChartUtil.ts`.

A follow-up bug fix was also applied:

- refreshing the overlap modal now uses the current shifted panel offsets instead of snapping back to the original input state

This was important because the first-pass migration changed the renderer, but refresh behavior still depended on stale panel state.

## 9. Remove remaining active Highcharts paths inside TagAnalyzer

Once the active renderers were switched, the old helper files inside TagAnalyzer were reduced to deprecation stubs:

- `EChartUtil.ts`
- `panel/HighChartConfigure.ts`
- `modal/OverlapChartUtil.ts`

That made it explicit that:

- the active runtime no longer uses Highcharts
- the current source of truth is `PanelEChartUtil.ts`

## 10. Clean up controller effect wiring

The migration also added small inline comments in the migrated controllers to document why some effects intentionally depend on board/editor signals instead of every local callback reference.

This was a practical follow-up so the new chart controller flow is easier to read.

## ECharts behavior mapping

The most important behavior mappings were:

### Panel zoom / pan

- old: Highcharts `setExtremes`
- new: ECharts `dataZoom`

### Navigator window

- old: Highstock navigator x-axis
- new: React-owned navigator range + ECharts slider/secondary grid

### Drag selection

- old: Highcharts selection + plot band
- new: ECharts brush + React popup state

### Threshold lines

- old: Highcharts y-axis `plotLines`
- new: ECharts `markLine`

### Visible series for export/save-local

- old: inspect Highcharts `series.visible`
- new: track legend selected state and expose it through `getVisibleSeries()`

## What stayed unchanged

The migration intentionally did not rewrite the data/model side.

These parts stayed largely intact:

- `PanelFetchUtil.ts`
- `PanelRuntimeUtil.ts`
- `PanelModelUtil.ts`
- panel model types
- board/editor wiring

That kept the risk focused on the renderer and interaction layer.

## Commits used as checkpoints

The migration was checkpointed in small commits so the work would not be lost:

- `7703199b` `chore(tag-analyzer): add echarts runtime dependency`
- `921bc6b9` `feat(tag-analyzer): migrate charts to echarts`
- `2c0585a6` `chore(tag-analyzer): clean up legacy chart helpers`
- `a882ecc4` `chore(tag-analyzer): document chart effect wiring`

## Remaining notes

The active TagAnalyzer runtime is migrated, but a few non-migration items still exist:

- some older TagAnalyzer `useEffect` lint warnings remain in root/editor files outside the migrated chart controller path
- the markdown planning docs still describe the pre-migration architecture and were preserved as historical notes

Those are documentation/cleanup tasks rather than active Highcharts runtime dependencies.

## Practical summary

The migration was completed by:

1. installing the ECharts runtime
2. introducing a small chart handle boundary
3. building ECharts options directly from TagAnalyzer panel state
4. swapping the board and preview controllers onto the new renderer
5. replacing drag selection with brush-based selection
6. migrating the overlap chart
7. stubbing the old Highcharts helper files inside TagAnalyzer

In short:

- data/state logic was preserved
- runtime chart behavior was reimplemented on ECharts
- active Highcharts rendering was removed from TagAnalyzer
