# TagAnalyzer Docs

These are the current short orientation docs for the active TagAnalyzer runtime.

The folder name still says `_TagAnalyzer_MigrationPlan`, but the files below are the maintained quick-reference docs for the current implementation.

## Read these first

- `Architecture.md`
  Current runtime structure, data flow, and the main file boundaries.

- `Features.md`
  What the user can do in board view and editor view, plus the behaviors that matter most.

- `EChartsMigration.md`
  What changed when TagAnalyzer moved from Highcharts to ECharts and where that logic now lives.

- `RecoilUsage.md`
  Which shared app state TagAnalyzer reads from Recoil and what stays local instead.

## Mental model

- `TagAnalyzer.tsx` is the feature coordinator.
- `PanelBoardChart.tsx` is the live panel controller.
- `PanelChart.tsx` is the chart renderer.
- `PanelEditor.tsx` owns the draft editor and preview flow.
- `OverlapModal.tsx` is the board-level comparison flow.
