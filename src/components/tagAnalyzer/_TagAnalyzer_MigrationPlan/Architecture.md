# TagAnalyzer Architecture

## Main pieces

- `TagAnalyzer.tsx`
  Top-level coordinator. Loads shared table metadata, owns board-level state, and switches between board mode and editor mode.

- `TagAnalyzerBoard.tsx`
  Maps board panels into live panel controllers.

- `panel/PanelBoardChart.tsx`
  Runtime controller for one live panel. Owns panel range state, navigator state, fetch/reload behavior, raw mode, overlap actions, and board sync.

- `panel/PanelBody.tsx` + `panel/PanelChart.tsx` + `panel/PanelFooter.tsx`
  Chart interaction layer, chart renderer, and zoom/shift footer UI.

- `editor/PanelEditor.tsx`
  Owns the editor draft, preview apply/save flow, and settings tabs.

- `modal/CreateChartModal.tsx` and `modal/OverlapModal.tsx`
  New-panel creation and multi-panel comparison.

## Runtime flow

1. Persisted board data is normalized into `TagAnalyzerPanelInfo`.
2. `PanelBoardChart.tsx` loads main-series data and navigator data.
3. `PanelChart.tsx` renders the chart and emits zoom / brush / legend events.
4. The controller updates panel range state, reloads data if needed, and syncs board-owned actions.
5. Saving flattens the runtime panel model back into board storage shape.

## Editor flow

1. `PanelEditor.tsx` creates a draft config from one runtime panel.
2. Settings tabs edit only the draft.
3. `Apply` merges the draft into a preview panel and refreshes the preview chart.
4. `Save` writes the applied preview panel back to the board list.

## Important boundaries

- Recoil holds shared app state such as board list, selected tab, tables, and rollup tables.
- Local React state holds panel-local ranges, preview runtime state, drag-select state, and modal visibility.
- `PanelFetchUtils.ts` handles loading data.
- `PanelRuntimeUtils.ts` handles range math and controller helpers.
- `PanelEChartUtil.ts` builds ECharts options from panel state.

## File map

- Coordinator: `TagAnalyzer.tsx`
- Board layer: `TagAnalyzerBoard.tsx`, `TagAnalyzerBoardToolbar.tsx`, `TagAnalyzerNewPanelButton.tsx`
- Live chart path: `panel/PanelBoardChart.tsx`, `panel/PanelBody.tsx`, `panel/PanelChart.tsx`, `panel/PanelFooter.tsx`
- Editor path: `editor/PanelEditor.tsx`, `editor/PanelEditorPreviewChart.tsx`, `editor/sections/*`
- Modals: `modal/CreateChartModal.tsx`, `modal/OverlapModal.tsx`
