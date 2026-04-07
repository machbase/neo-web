# TagAnalyzer Docs

This folder now keeps only the short docs that are most useful day to day.

## Read these first

- `Architecture.md`
  Current runtime structure, data flow, and the main file boundaries.

- `Features.md`
  What the user can do in board view and editor view, plus the behaviors that matter most.

- `EChartsMigration.md`
  What changed when TagAnalyzer moved from Highcharts to ECharts and where that logic now lives.

- `RecoilUsage.md`
  How Recoil is used in the wider project and how TagAnalyzer depends on it.

## Mental model

- `TagAnalyzer.tsx` is the feature coordinator.
- `PanelBoardChart.tsx` is the live panel controller.
- `PanelChart.tsx` is the chart renderer.
- `PanelEditor.tsx` owns the draft editor and preview flow.
- `OverlapModal.tsx` is the board-level comparison flow.

## Notes

- These docs intentionally replace the older long-form notes.
- The goal is fast orientation, not exhaustive historical detail.
