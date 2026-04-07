# TagAnalyzer Prop Grouping Analysis

This document maps `tagAnalyzer` bottom-up.

For each component, it lists:
- the fields it actually needs from its inputs
- the natural groups those fields fall into
- which parent component needs to assemble those groups

This is based on the current code under:
- `panel`
- `edit`
- `modal`
- the board-level files up to `TagAnalyzer.tsx`

## Grouping Rules Used

- Keep domain objects whole when the component truly operates on the whole thing.
- Group fields when they move together by responsibility.
- Prefer action callbacks over passing parent-owned internals.
- Avoid giving leaf children whole objects when they only use one slice.

## Bottom Layer

### `panel/PanelHeader.tsx`

Current fields used:
- `pHeaderState.title`
- `pHeaderState.timeText`
- `pHeaderState.intervalText`
- `pHeaderState.isEdit`
- `pHeaderState.isRaw`
- `pHeaderState.isSelectedForOverlap`
- `pHeaderState.isOverlapAnchor`
- `pHeaderState.canToggleOverlap`
- `pHeaderState.isDragSelectActive`
- `pHeaderState.canOpenFft`
- `pHeaderState.canSaveLocal`
- `pHeaderActions.onToggleOverlap`
- `pHeaderActions.onToggleRaw`
- `pHeaderActions.onToggleDragSelect`
- `pHeaderActions.onOpenFft`
- `pHeaderActions.onSetGlobalTime`
- `pHeaderActions.onRefreshData`
- `pHeaderActions.onRefreshTime`
- `pHeaderActions.onOpenEdit`
- `pHeaderActions.onDelete`
- `pSavedToLocalInfo.chartData`
- `pSavedToLocalInfo.chartRef`

Natural groups:
- `panelHeaderState`
- `panelHeaderActions`
- `savedToLocalPayload`

Parent that should assemble them:
- `panel/Panel.tsx`

Notes:
- This is already grouped well.
- `PanelHeader` should stay mostly presentational.

### `panel/PanelFooter.tsx`

Current fields used:
- `pFooterDisplay.tagCount`
- `pFooterDisplay.showLegend`
- `pNavigatorRange.startTime`
- `pNavigatorRange.endTime`
- `pSetButtonRange`
- `pMoveNavigatorTimRange`

Natural groups:
- `panelFooterDisplay`
- `panelFooterRange`
- `panelFooterActions`

Recommended shape:
- `panelFooterDisplay`
  - `tagCount`
  - `showLegend`
- `panelFooterRange`
  - `startTime`
  - `endTime`
- `panelFooterActions`
  - `onZoomChange`
  - `onMoveNavigatorRange`

Parent that should assemble them:
- `panel/Panel.tsx`

Notes:
- It does not need full `TagAnalyzerPanelInfo`.
- Current code is already narrower than before.

### `panel/NewEChart.tsx`

Current fields used:
- `pChartRefs.areaChart`
- `pChartRefs.chartWrap`
- `pChartModel.panelInfo.axes`
- `pChartModel.panelInfo.display`
- `pChartModel.isRaw`
- `pChartModel.navigatorData`
- `pChartModel.chartData`
- `pChartModel.panelRange`
- `pChartModel.navigatorRange`
- `pChartModel.isUpdate`
- `pChartActions.onSetExtremes`
- `pChartActions.onSetNavigatorExtremes`
- `pChartActions.onSelection`

Natural groups:
- `chartRefs`
- `chartModel`
- `chartActions`

Recommended refinement:
- `chartModel` can be split further later into:
  - `chartConfig`
    - `axes`
    - `display`
    - `isRaw`
  - `chartDataState`
    - `navigatorData`
    - `chartData`
    - `panelRange`
    - `navigatorRange`
    - `isUpdate`

Parent that should assemble them:
- `panel/PanelBody.tsx`
- originally sourced from `panel/Panel.tsx`

Notes:
- `NewEChart` still receives `panelInfo`, but it really only needs panel `axes` and `display`.

### `panel/Chart.tsx`

Current role:
- legacy Highcharts-oriented chart renderer

Current grouping need:
- it should mirror the same `chartRefs`, `chartModel`, and `chartActions` boundaries as `NewEChart`

Notes:
- This file does not appear to be the active renderer path right now.
- If it stays in the repo, it should follow the same grouping model as `NewEChart` so the panel body does not need two different chart contracts.

### `panel/PanelBody.tsx`

Current fields used:
- `pChartRefs`
- `pChartModel`
- `pChartActions`
- `pBodyActions.onMoveTimeRange`
- `pBodyActions.onCloseMinMaxPopup`
- `pBodyActions.getDuration`
- `pPopupState.minMaxList`
- `pPopupState.isFFTModal`
- `pPopupState.setIsFFTModal`
- `pPopupState.fftMinTime`
- `pPopupState.fftMaxTime`
- `pPopupState.isMinMaxMenu`
- `pPopupState.menuPosition`
- `pChartModel.panelInfo.data.tag_set`

Natural groups:
- `chartRender`
  - `chartRefs`
  - `chartModel`
  - `chartActions`
- `panelBodyActions`
- `panelPopupState`

Recommended refinement:
- `pChartModel.panelInfo.data.tag_set` should become a direct `tagSet` field inside `pPopupState` or `chartRender`.

Parent that should assemble them:
- `panel/Panel.tsx`

Notes:
- This is already grouped better than before.
- It still indirectly receives more panel model than it needs through `pChartModel`.

### `edit/sections/General.tsx`

Current fields used:
- `pGeneralConfig.chart_title`
- `pGeneralConfig.use_zoom`
- `pGeneralConfig.use_time_keeper`
- `pGeneralConfig.time_keeper`
- `pOnChangeGeneralConfig`

Natural groups:
- `generalConfig`
- `generalConfigActions`

Parent that should assemble them:
- `edit/sections/EditTab.tsx`

### `edit/sections/Data.tsx`

Current fields used:
- `pDataConfig.index_key`
- `pDataConfig.tag_set`
- `pOnChangeTagSet`

Natural groups:
- `dataConfig`
- `tagSetActions`

Parent that should assemble them:
- `edit/sections/EditTab.tsx`

### `edit/sections/Axes.tsx`

Current fields used:
- `pAxesConfig`
- `pTagSet`
- `pOnChangeAxesConfig`
- `pOnChangeTagSet`

Natural groups:
- `axesConfig`
- `tagSet`
- `axesActions`

Parent that should assemble them:
- `edit/sections/EditTab.tsx`

### `edit/sections/Display.tsx`

Current fields used:
- `pDisplayConfig.chart_type`
- `pDisplayConfig.show_legend`
- `pDisplayConfig.show_point`
- `pDisplayConfig.point_radius`
- `pDisplayConfig.fill`
- `pDisplayConfig.stroke`
- `pOnChangeDisplayConfig`

Natural groups:
- `displayConfig`
- `displayActions`

Parent that should assemble them:
- `edit/sections/EditTab.tsx`

### `edit/sections/TimeRange.tsx`

Current fields used:
- `pTimeConfig.range_bgn`
- `pTimeConfig.range_end`
- `pOnChangeTimeConfig`

Natural groups:
- `timeConfig`
- `timeActions`

Parent that should assemble them:
- `edit/sections/EditTab.tsx`

### `edit/AddTag.tsx`

Current fields used:
- `pCloseModal`
- `pTagSet`
- `pOnChangeTagSet`

Natural groups:
- `tagSelectionSource`
  - `tagSet`
- `tagSelectionActions`
  - `onClose`
  - `onChangeTagSet`

Parent that should assemble them:
- `edit/sections/Data.tsx`

Notes:
- This component is already reasonably narrow.

### `edit/OverlapButtonList.tsx`

Current fields used:
- `pPanelInfo.board.meta.index_key`
- `pPanelInfo.board.data.tag_set[0]`
- `pPanelInfo.start`
- `pPanelsInfo[0].duration`
- `pSetTime`
- `pIdx`

Natural groups:
- `overlapRowDisplay`
  - `seriesColorIndex`
  - `panelStart`
  - `duration`
  - `firstTag`
- `overlapRowActions`
  - `onShiftTime`

Recommended shape:
- `pPanelInfo` is too broad here.
- This component could receive:
  - `pColorIndex`
  - `pLabel`
  - `pStart`
  - `pDuration`
  - `pOnShiftTime`

Parent that should assemble them:
- `modal/OverlapModal.tsx`

### `modal/OverlapChart.tsx`

Current fields used:
- `pChartData`
- `pStartTimeList`
- `pZeroBase`
- `pAreaChart`
- `pChartRef`

Natural groups:
- `overlapChartData`
  - `chartData`
  - `startTimeList`
  - `zeroBase`
- `overlapChartRefs`
  - `areaChart`
  - `chartRef`

Parent that should assemble them:
- `modal/OverlapModal.tsx`

### `modal/ModalCreateChart.tsx`

Current fields used from props:
- `isOpen`
- `onClose`

Natural groups:
- `modalVisibility`
  - `isOpen`
  - `onClose`

Parent that should assemble them:
- `TagAnalyzerNewPanelButton.tsx`
- `modal/CreateChart.tsx`

Notes:
- Internal state in this component is still broad, but from a prop-boundary point of view it is narrow.

### `modal/CreateChart.tsx`

Current fields used:
- none from parent

Natural groups:
- none needed externally

Parent that should assemble them:
- none

Notes:
- This is a self-contained modal trigger.
- It duplicates the same role as `TagAnalyzerNewPanelButton.tsx`.

## Mid Layer

### `edit/sections/EditTab.tsx`

Current fields used:
- `pSelectedTab`
- `pEditorConfig.general`
- `pEditorConfig.data`
- `pEditorConfig.axes`
- `pEditorConfig.display`
- `pEditorConfig.time`
- `pSetEditorConfig`

Natural groups:
- `editorTabState`
  - `selectedTab`
- `editorConfig`
  - `general`
  - `data`
  - `axes`
  - `display`
  - `time`
- `editorConfigActions`
  - `setEditorConfig`

Parent that should assemble them:
- `edit/sections/PanelEditorSettings.tsx`

Notes:
- This is the component that converts one editor draft into section-level props.
- This is a good place for section slicing.

### `edit/sections/PanelEditorSettings.tsx`

Current fields used:
- `pTabs`
- `pSelectedTab`
- `pSetSelectedTab`
- `pEditorConfig`
- `pSetEditorConfig`

Natural groups:
- `tabNavigation`
  - `tabs`
  - `selectedTab`
  - `setSelectedTab`
- `editorDraftBinding`
  - `editorConfig`
  - `setEditorConfig`

Parent that should assemble them:
- `edit/PanelEditor.tsx`

### `edit/PanelEditorPreview.tsx`

Current fields used:
- `pPanelInfo`
- `pBgnEndTimeRange`
- `pNavigatorRange`
- `pBoardInfo`
- `pIsLoading`

Natural groups:
- `previewSource`
  - `panelInfo`
  - `bgnEndTimeRange`
  - `navigatorRange`
  - `boardInfo`
- `previewState`
  - `isLoading`

Parent that should assemble them:
- `edit/PanelEditor.tsx`

### `edit/PanelEditor.tsx`

Current fields used from parent:
- `pPanelInfo`
- `pBoardInfo`
- `pSetEditPanel`
- `pSetSaveEditedInfo`
- `pNavigatorRange`

Natural groups:
- `editorSource`
  - `panelInfo`
  - `boardInfo`
  - `navigatorRange`
- `editorShellActions`
  - `setEditPanel`
  - `setSaveEditedInfo`

Internal subgroups it assembles:
- `previewSource`
- `tabNavigation`
- `editorDraftBinding`

Parent that should assemble them:
- `TagAnalyzer.tsx`

Notes:
- This component still has a lot of local `any` state.
- Boundary grouping is still clear even if internal typing is loose.

### `modal/OverlapModal.tsx`

Current fields used from parent:
- `pSetIsModal`
- `pPanelsInfo`

Natural groups:
- `overlapModalVisibility`
  - `setIsModal`
- `overlapSelectionSource`
  - `panelsInfo`

Internal groups it assembles:
- `overlapChartData`
- `overlapChartRefs`
- `overlapRowDisplay`
- `overlapRowActions`

Recommended refinement:
- It should likely split its internal children into:
  - `overlapFetchState`
  - `overlapChartView`
  - `overlapControlRows`

Parent that should assemble them:
- `TagAnalyzer.tsx`

### `TagAnalyzerBoardToolbar.tsx`

Current fields used:
- `pToolbarInfo.range_bgn`
- `pToolbarInfo.range_end`
- `pPanelsInfoCount`
- `pToolbarActions.onOpenTimeRangeModal`
- `pToolbarActions.onRefreshData`
- `pToolbarActions.onRefreshTime`
- `pToolbarActions.onSave`
- `pToolbarActions.onOpenSaveModal`
- `pToolbarActions.onOpenOverlapModal`

Natural groups:
- `boardToolbarInfo`
  - `range_bgn`
  - `range_end`
- `boardToolbarState`
  - `panelsInfoCount`
- `boardToolbarActions`

Parent that should assemble them:
- `TagAnalyzer.tsx`

### `TagAnalyzerNewPanelButton.tsx`

Current fields used:
- none from parent

Natural groups:
- none needed externally

Parent that should assemble them:
- `TagAnalyzer.tsx`

Notes:
- This is self-contained and already clean.

### `panel/Panel.tsx`

Current fields used from parent:
- `pPanelInfo`
- `pBoardInfo`
- `pIsEdit`
- `pFooterRange`
- `pNavigatorRange`
- `pBgnEndTimeRange`
- `pPanelBoardState`
- `pPanelBoardActions`

Natural groups:
- `panelSource`
  - `panelInfo`
  - `boardInfo`
- `panelMode`
  - `isEdit`
- `panelPreviewOverrides`
  - `footerRange`
  - `navigatorRange`
  - `bgnEndTimeRange`
- `boardPanelState`
  - `refreshCount`
  - `overlapPanels`
  - `bgnEndTimeRange`
  - `globalTimeRange`
- `boardPanelActions`
  - `onOverlapSelectionChange`
  - `onDeletePanel`
  - `onPersistPanelState`
  - `onSetGlobalTimeRange`
  - `onOpenEditRequest`

Child groups it assembles:
- `panelHeaderState`
- `panelHeaderActions`
- `savedToLocalPayload`
- `chartRefs`
- `chartModel`
- `chartActions`
- `panelBodyActions`
- `panelPopupState`
- `panelFooterDisplay`
- `panelFooterRange`
- `panelFooterActions`

Notes:
- `Panel.tsx` is the main composition boundary for the panel subtree.
- It still needs the full `pPanelInfo` because it owns fetching, range control, and child-group assembly.

## Upper Layer

### `TagAnalyzerBoard.tsx`

Current fields used from parent:
- `pInfo`
- `pPanelBoardState`
- `pPanelBoardActions`

Natural groups:
- `boardSource`
  - `boardInfo`
- `boardPanelState`
- `boardPanelActions`

Child groups it assembles:
- for each `Panel`
  - `panelSource`
  - `boardPanelState`
  - `boardPanelActions`

Notes:
- This component is already acting as a simple board-body renderer.
- It does not need toolbar actions or modal state.

### `TagAnalyzer.tsx`

Current responsibilities:
- loads board source data
- normalizes incoming panel data
- owns board-level state
- owns modal open state
- owns panel editor open state
- owns overlap selection state
- owns global time-range state

Groups it assembles for children:

For `TagAnalyzerBoardToolbar`:
- `boardToolbarInfo`
- `boardToolbarState`
- `boardToolbarActions`

For `TagAnalyzerBoard`:
- `boardSource`
- `boardPanelState`
- `boardPanelActions`

For `TagAnalyzerNewPanelButton`:
- no external props

For `OverlapModal`:
- `overlapModalVisibility`
- `overlapSelectionSource`

For `PanelEditor`:
- `editorSource`
- `editorShellActions`

Recommended top-level view of `TagAnalyzer.tsx`:
- `toolbarGroups`
- `boardGroups`
- `modalGroups`
- `editorGroups`

## Group Catalog

These are the main group names that best describe the current component tree.

### Panel Groups

- `panelSource`
- `panelMode`
- `panelPreviewOverrides`
- `panelHeaderState`
- `panelHeaderActions`
- `savedToLocalPayload`
- `chartRefs`
- `chartModel`
- `chartActions`
- `panelBodyActions`
- `panelPopupState`
- `panelFooterDisplay`
- `panelFooterRange`
- `panelFooterActions`

### Editor Groups

- `editorSource`
- `editorShellActions`
- `previewSource`
- `previewState`
- `tabNavigation`
- `editorDraftBinding`
- `editorTabState`
- `editorConfig`
- `editorConfigActions`
- `generalConfig`
- `dataConfig`
- `axesConfig`
- `displayConfig`
- `timeConfig`

### Modal Groups

- `modalVisibility`
- `overlapModalVisibility`
- `overlapSelectionSource`
- `overlapChartData`
- `overlapChartRefs`
- `overlapRowDisplay`
- `overlapRowActions`
- `tagSelectionSource`
- `tagSelectionActions`

### Board and Feature Groups

- `boardSource`
- `boardToolbarInfo`
- `boardToolbarState`
- `boardToolbarActions`
- `boardPanelState`
- `boardPanelActions`
- `toolbarGroups`
- `boardGroups`
- `modalGroups`
- `editorGroups`

## Biggest Current Wins If You Refactor Further

### Best existing boundaries

- `PanelHeader`
- `PanelFooter`
- `PanelBody`
- `EditTab`
- `TagAnalyzerBoardToolbar`

These already follow clear grouped responsibilities.

### Best next candidates

- `NewEChart`
  - stop passing full `panelInfo`
  - pass `axes` and `display` directly

- `OverlapButtonList`
  - stop passing full `pPanelInfo`
  - pass `label`, `start`, `duration`, and one callback

- `OverlapModal`
  - break internal fetch/control/chart row state into explicit groups

- `PanelEditor`
  - replace loose `any` state with named source, draft, and preview groups

## Summary

Current architecture already has a good direction:
- leaf components in `panel` mostly receive grouped props
- editor leaf sections already receive section-specific config slices
- the board layer is cleaner than before

The main remaining broad surfaces are:
- `panel/NewEChart.tsx`
- `modal/OverlapModal.tsx`
- `edit/PanelEditor.tsx`
- `edit/OverlapButtonList.tsx`

If future cleanup follows this document, the clearest ownership flow is:
- leaf components receive focused groups
- middle components assemble child groups
- `Panel.tsx`, `PanelEditor.tsx`, `TagAnalyzerBoard.tsx`, and `TagAnalyzer.tsx` stay as the main composition boundaries
