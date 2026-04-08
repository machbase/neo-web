# TagAnalyzer Architecture

## Main pieces

- `TagAnalyzer.tsx`
  Top-level coordinator. Loads shared table metadata, owns board-level state, and switches between board mode and editor mode.

- `TagAnalyzerBoard.tsx`
  Maps board panels into live panel controllers.

- `panel/PanelBoardChart.tsx`
  Runtime controller for one live panel. Owns panel range state, navigator state, fetch/reload behavior, raw mode, overlap actions, and board sync.

- `panel/PanelBody.tsx`
  Lays out the chart body and wires panel interaction state into the chart renderer.

- `panel/PanelChart.tsx`
  ECharts renderer boundary. Emits zoom, brush, and legend events back to the controller.

- `panel/PanelFooter.tsx`
  Footer controls for navigator shifting, zoom actions, and focus actions.

- `editor/PanelEditor.tsx`
  Owns the editor draft, preview apply/save flow, and settings tabs.

- `modal/CreateChartModal.tsx` and `modal/OverlapModal.tsx`
  New-panel creation and multi-panel comparison.

- `common/useTagSearchModalState.ts` and related `common/*` helpers
  Shared modal layer for available search results, selected series drafts, and the conversion into saved panel series configs. Those saved configs now use `sourceTagName` internally, with a small utility-caller boundary recreating legacy `tagName` only when older shared helpers still need it.

## Runtime flow

1. Persisted board data is normalized into `TagAnalyzerPanelInfo`.
2. `PanelBoardChart.tsx` loads main-series data and navigator data.
3. `PanelChart.tsx` renders the chart and emits zoom / brush / legend events.
4. The controller updates panel range state, reloads data if needed, and syncs board-owned actions.

## Editor flow

1. `PanelEditor.tsx` creates a draft config from one runtime panel.
2. Settings tabs edit only the draft.
3. `Apply` merges the draft into a preview panel and refreshes the preview chart.
4. `Save` writes the applied preview panel back to the board list.

## Save path

- Runtime panels are flattened back into the board storage shape by `flattenTagAnalyzerPanelInfo`.
- Board save actions persist the current board-owned panel list, not the editor draft by itself.

## Important boundaries

- Recoil holds shared app state such as board list, selected tab, tables, and rollup tables.
- Local React state holds panel-local ranges, preview runtime state, drag-select state, and modal visibility.
- `PanelFetchUtils.ts` handles loading data.
- `PanelRuntimeUtils.ts` handles range math and controller helpers.
- `PanelEChartUtil.ts` builds ECharts options from panel state.

## Where to start reading

- Start with `TagAnalyzer.tsx` for top-level mode switching and shared board ownership.
- Then read `panel/PanelBoardChart.tsx` for the live-panel runtime path.
- Read `editor/PanelEditor.tsx` and `editor/PanelEditorPreviewChart.tsx` for draft and preview behavior.
- Read `PanelFetchUtils.ts`, `PanelRuntimeUtils.ts`, and `PanelEChartUtil.ts` for the three main helper boundaries: fetch, range/runtime logic, and chart-option building.
