# TagAnalyzer Structure

This document explains the current active structure of the `tagAnalyzer` feature and how the main files fit together.

## 1. Top-Level Flow

The feature starts in:

- `src/components/tagAnalyzer/TagAnalyzer.tsx`

`TagAnalyzer.tsx` is the top-level coordinator for the whole feature.

It currently does four main jobs:

1. Loads shared table metadata and rollup metadata.
2. Converts persisted flat panel data into the nested runtime panel model.
3. Owns board-level state that is shared across panels.
4. Switches between:
   - board mode
   - panel editor mode

### Board-level state owned by `TagAnalyzer.tsx`

`TagAnalyzer.tsx` owns the state that should not belong to any one panel:

- selected overlap panels
- board refresh counter
- top-level board time bounds
- current edit request
- global panel+navigator time sync target
- global modals like overlap modal and time range modal

This is the feature boundary. Child components below it mostly render or coordinate one slice of that state.

## 2. Main Runtime Tree

The active runtime tree looks like this:

```text
TagAnalyzer.tsx
├─ TagAnalyzerBoardToolbar.tsx
├─ TagAnalyzerBoard.tsx
│  └─ PanelBoardChart.tsx   (one per panel)
│     ├─ PanelHeader.tsx
│     │  └─ PanelHeaderButtonGroup.tsx
│     ├─ PanelBody.tsx
│     │  ├─ NewEChart.tsx
│     │  └─ PanelFFTModal.tsx
│     └─ PanelFooter.tsx
│        └─ PanelFooterZoomGroup.tsx
├─ TagAnalyzerNewPanelButton.tsx
│  └─ modal/ModalCreateChart.tsx
├─ modal/OverlapModal.tsx
└─ ../modal/TimeRangeModal
```

## 3. Board Layer

### `TagAnalyzerBoard.tsx`

This file is intentionally thin.

Its job is:

- map the current board's panels
- derive overlap flags for each panel
- inject narrow board context into each panel
- inject panel-specific board callbacks

It does **not** own chart logic.

It passes each panel:

- `pPanelInfo`
- a narrowed `pBoardContext`
- board-scoped state needed by the chart
- board-scoped actions needed by the chart
- overlap booleans
- overlap/delete callbacks already bound to that panel

This is the main bridge between board state and one runtime panel.

### `TagAnalyzerBoardToolbar.tsx`

This is the board-level action bar.

It owns only the board header UI for:

- time range modal
- refresh data
- refresh time
- save
- save as
- overlap modal

It does not know panel internals.

### `TagAnalyzerNewPanelButton.tsx`

This is just the add-panel entry point.

It opens `modal/ModalCreateChart.tsx`, which is responsible for:

- choosing a table
- choosing chart type
- searching tags
- selecting tags
- creating a new panel and appending it to the board

## 4. Runtime Panel Layer

### `panel/PanelBoardChart.tsx`

This is the main runtime controller for a single live panel on the board.

It owns the panel behavior that is broader than pure chart rendering:

- panel-local runtime state
- panel+navigator range state
- data refresh for main chart and navigator
- raw mode toggle
- overlap toggle
- open editor
- delete panel
- set global time
- reset/initialize range
- syncing back to board time keeper state

It coordinates the panel, but it no longer owns the local drag-select popup workflow.

### `panel/PanelHeader.tsx`

This renders the top strip of a panel.

It shows:

- title
- overlap anchor flag
- current visible time text
- interval text
- panel actions
- refresh buttons
- saved-to-local modal
- delete confirm modal

It is a display/action surface only. The state and callbacks come from `PanelBoardChart.tsx`.

### `panel/PanelBody.tsx`

This is the chart-area interaction layer.

It owns the behavior that is local to the visible chart body:

- left/right shift buttons for the visible panel window
- drag-select handling
- selection plot band
- selection popup
- min/max/avg summary for selected range
- FFT modal input state

This is an important design distinction:

- `PanelBoardChart.tsx` owns panel/board range coordination
- `PanelBody.tsx` owns local chart-body interaction

### `panel/NewEChart.tsx`

This is the Highcharts wrapper.

It is responsible for:

- assembling chart config
- wiring main chart events
- wiring navigator events
- wiring drag-select event when drag-select is active
- pushing current chart/navigator series into Highcharts

It should be thought of as the chart renderer, not the business-logic owner.

### `panel/PanelFooter.tsx`

This is the lower navigator/zoom control area.

It owns the UI for:

- navigator shift left/right
- navigator start/end labels
- zoom in/out/focus buttons

It does not compute ranges itself. It only triggers handlers given by the parent.

## 5. Editor Layer

The editor path is separate from the board path.

The active editor tree looks like this:

```text
editor/PanelEditor.tsx
├─ editor/PanelEditorPreview.tsx
│  └─ editor/PanelEditorPreviewChart.tsx
│     ├─ editor/PanelEditorPreviewHeader.tsx
│     ├─ editor/PanelEditorPreviewBody.tsx
│     │  └─ panel/NewEChart.tsx
│     └─ panel/PanelFooter.tsx
└─ editor/sections/PanelEditorSettings.tsx
   └─ editor/sections/EditTab.tsx
      ├─ General.tsx
      ├─ Data.tsx
      ├─ Axes.tsx
      ├─ Display.tsx
      └─ TimeRange.tsx
```

### `editor/PanelEditor.tsx`

This is the editor shell.

It owns:

- the editable draft config
- apply/save/discard flow
- panel preview source state
- conversion between:
  - runtime panel model
  - editor draft config
- save-back to the board list

### `editor/PanelEditorPreview.tsx`

This is only the preview pane wrapper.

It keeps preview layout separate from the rest of the editor shell.

### `editor/PanelEditorPreviewChart.tsx`

This is the preview-only chart controller.

It is intentionally lighter than `PanelBoardChart.tsx`.

It supports:

- preview data loading
- preview navigator loading
- preview zoom/shift/reset/raw toggle

It does **not** own board-only runtime behavior like:

- overlap workflow
- delete panel
- editor-open action
- drag-select summary workflow
- FFT workflow

### `editor/sections/*`

These files are the section editors for the panel draft config.

The editor is split by concern:

- `General.tsx`
- `Data.tsx`
- `Axes.tsx`
- `Display.tsx`
- `TimeRange.tsx`

This keeps the editor form section-based while the preview remains a real chart.

## 6. Modal Layer

### `modal/ModalCreateChart.tsx`

Creates a new panel.

Main responsibilities:

- choose source table
- search and page tags
- select chart type
- choose tag calculation modes
- fetch min/max time
- create default panel shape and append it to the selected board

### `modal/OverlapModal.tsx`

This is the multi-panel comparison chart.

It works from the list of overlap-selected panels and:

- fetches overlap data for each selected panel
- aligns series on a shared overlap axis
- lets the user shift a panel's relative overlap start
- renders the overlap chart plus per-panel shift controls

It is separate from `PanelBoardChart.tsx` because overlap is a board-level comparison flow, not a single-panel concern.

## 7. Shared Type Layers

### `TagAnalyzerType.ts`

This file holds feature-level contracts, mainly around board and editor coordination.

Examples:

- board source shape
- normalized board shape
- narrowed board context
- board panel state/actions contracts
- edit request contract

Use this file for feature wiring contracts, not panel model details.

### `panel/TagAnalyzerPanelModelTypes.ts`

This is the nested runtime panel model.

It defines the actual panel data shapes:

- `TagAnalyzerPanelInfo`
- `TagAnalyzerPanelMeta`
- `TagAnalyzerPanelData`
- `TagAnalyzerPanelTime`
- `TagAnalyzerPanelAxes`
- `TagAnalyzerPanelDisplay`
- time range / chart / overlap data shapes

This is the runtime/domain layer for one panel.

### `panel/TagAnalyzerPanelTypes.ts`

This file holds panel view-state and panel handler contracts.

Examples:

- `PanelPresentationState`
- `PanelActionHandlers`
- `PanelRefreshHandlers`
- `PanelZoomHandlers`
- `PanelShiftHandlers`
- `PanelState`
- `PanelNavigateState`
- `PanelChartState`

This file is the panel view/controller contract layer, not the persisted model layer.

### `editor/PanelEditorTypes.ts`

This file holds editor-only draft/config types.

Examples:

- editor tabs
- editor numeric input draft values
- section config types
- `TagAnalyzerPanelEditorConfig`

This is separate from the runtime panel model because editor draft input types do not always match saved runtime types exactly.

## 8. Shared Utility Layers

### `panel/PanelModelUtil.ts`

This is the model conversion layer.

Main responsibilities:

- create shared `TagAnalyzerTimeRange` values
- normalize flat persisted panel info into nested runtime panel info
- flatten nested runtime panel info back into persisted board format

This file is the boundary between storage shape and runtime shape.

### `panel/PanelRuntimeUtil.ts`

This is the runtime behavior helper layer used by both:

- `PanelBoardChart.tsx`
- `PanelEditorPreviewChart.tsx`

It contains reusable logic for:

- zoom/shift range math
- navigator expansion rules
- fetch-state resolution
- panel/navigator dataset fetching
- reset/init time-range resolution
- time-keeper helpers
- presentation-state building

This is the main shared runtime logic for the chart controllers.

### `TagAnalyzerUtil.ts`

This is the feature-wide shared helper file for utilities reused across panel, modal, and editor code.

Examples:

- interval calculation
- interval conversion
- series min/max/avg calculation
- duration formatting
- shared count calculation

### `tagAnalyzerUtilReplacement/TagAnalyzerDateUtil.ts`

This is the local date/time range helper layer for TagAnalyzer.

It provides narrower feature-local replacements for general date range logic, mainly around:

- relative range conversion
- converting `"last-..."` / `"now-..."` style values
- turning panel/board range config into concrete `TagAnalyzerTimeRange` values

## 9. Data Shape Flow

The data shape flow is important to understanding the feature:

1. Persisted board data starts as flat panel objects.
2. `TagAnalyzer.tsx` normalizes them into nested `TagAnalyzerPanelInfo`.
3. Runtime board panels use the nested model.
4. `PanelEditor.tsx` converts one runtime panel into an editor draft config.
5. On save, the editor merges draft config back into runtime panel info.
6. `PanelModelUtil.ts` flattens the nested panel back into the board storage shape.

So the feature has three important data layers:

- flat persisted panel data
- nested runtime panel model
- editor draft config

## 10. Practical Mental Model

If you want a simple way to think about the structure:

- `TagAnalyzer.tsx`
  = feature coordinator

- `TagAnalyzerBoard.tsx`
  = board panel mapper

- `PanelBoardChart.tsx`
  = one live board panel controller

- `PanelBody.tsx`
  = chart-area interaction owner

- `NewEChart.tsx`
  = Highcharts renderer

- `PanelEditor.tsx`
  = editor shell + save/apply boundary

- `PanelEditorPreviewChart.tsx`
  = lighter chart controller used only during editing

- `PanelRuntimeUtil.ts`
  = shared runtime chart logic

- `PanelModelUtil.ts`
  = runtime/storage model conversion

- `TagAnalyzerPanelModelTypes.ts`
  = panel domain model

- `TagAnalyzerPanelTypes.ts`
  = panel controller/view contracts

- `PanelEditorTypes.ts`
  = editor-only draft contracts

This is the current active structure of the feature.
