# Folder Rename Audit: `src/components/tagAnalyzer/chart`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `ChartBody.test.tsx`
- `ChartBody.tsx`
- `ChartDataZoomStateUtils.ts`
- `ChartFooter.scss`
- `ChartFooter.test.tsx`
- `ChartFooter.tsx`
- `ChartHeader.scss`
- `ChartHighlightHitTesting.ts`
- `ChartRuntimeTypes.ts`
- `ChartSelectionSummaryPopover.tsx`
- `ChartShell.scss`
- `ChartTimeSummary.tsx`
- `FOLDER_AUDIT.md`
- `PanelChartDatasetFetcher.ts`
- `PanelChartFetchPolicy.ts`
- `PanelChartLoadContracts.ts`
- `PanelChartOverflowPolicy.ts`
- `PanelChartRangePolicy.ts`
- `PanelChartStateLoader.test.ts`
- `PanelChartStateLoader.ts`
- `PanelNavigateStateUtils.ts`
- `RESPONSIBILITY_REFACTOR_PLAN.md`
- `TimeSeriesChart.test.tsx`
- `TimeSeriesChart.tsx`
- `useChartRuntimeController.test.ts`
- `useChartRuntimeController.ts`
- `useChartSelectionPopupState.ts`
- `useEChartsPanelInstance.ts`
- `usePanelChartBrushSync.ts`
- `usePanelChartDataRefresh.ts`
- `usePanelChartEvents.ts`
- `usePanelChartLegendHover.ts`
- `usePanelChartRangeSync.ts`

### Verify
- Direct file count: 33

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `ChartBody.test.tsx`
- `MockTimeSeriesChart` - line 27, arrow function
- `FFTModal` - line 47, arrow function
- `Popover` - line 51, arrow function
- `MockDesignSystemButton` - line 61, arrow function
- `MockDesignSystemPage` - line 73, arrow function
- `MockChevronLeftIcon` - line 97, arrow function
- `MockChevronRightIcon` - line 98, arrow function
- `MockCloseIcon` - line 99, arrow function
- `createChartBodyProps` - line 113, function

#### `ChartBody.tsx`
- `ChartBody` - line 24, arrow function
- `handleChartMouseDownCapture` - line 70, function

#### `ChartDataZoomStateUtils.ts`
- `getPrimaryDataZoomState` - line 13, arrow function
- `hasExplicitDataZoomRange` - line 32, arrow function

#### `ChartFooter.test.tsx`
- `MockDesignSystemButton` - line 16, arrow function

#### `ChartFooter.tsx`
- `ChartFooter` - line 26, arrow function

#### `ChartHighlightHitTesting.ts`
- `getHighlightIndexAtClientPosition` - line 19, function

#### `ChartRuntimeTypes.ts`
- No named functions found.

#### `ChartSelectionSummaryPopover.tsx`
- `ChartSelectionSummaryPopover` - line 14, function

#### `ChartTimeSummary.tsx`
- `ChartTimeSummary` - line 9, arrow function

#### `PanelChartDatasetFetcher.ts`
- `fetchPanelDatasets` - line 48, function
- `fetchPanelDatasetsFromRequest` - line 150, function
- `createEmptyFetchPanelDatasetsResult` - line 183, function

#### `PanelChartFetchPolicy.ts`
- `isFetchableTimeRange` - line 27, function
- `calculatePanelFetchCount` - line 44, function
- `resolvePanelFetchTimeRange` - line 70, function
- `resolveRawFetchSampling` - line 93, function
- `resolvePanelFetchInterval` - line 119, function

#### `PanelChartLoadContracts.ts`
- No named functions found.

#### `PanelChartOverflowPolicy.ts`
- `analyzePanelDataLimit` - line 18, function
- `createPanelOverflowRange` - line 50, function

#### `PanelChartRangePolicy.ts`
- `resolvePanelRangeApplicationDecision` - line 21, function

#### `PanelChartStateLoader.test.ts`
- No named functions found.

#### `PanelChartStateLoader.ts`
- `loadNavigatorChartState` - line 32, function
- `loadPanelChartState` - line 52, function

#### `PanelNavigateStateUtils.ts`
- `createInitialPanelNavigateState` - line 13, function
- `buildNavigateStatePatchFromPanelLoad` - line 31, function

#### `TimeSeriesChart.test.tsx`
- `getEchartsInstance` - line 25, arrow function
- `getBuildChartOptionMock` - line 75, arrow function
- `getBuildChartSeriesOptionMock` - line 86, arrow function
- `getExtractDataZoomRangeMock` - line 97, arrow function
- `serializeMockChartRect` - line 218, arrow function
- `getMockAreaChartRect` - line 219, arrow function

#### `TimeSeriesChart.tsx`
- `TimeSeriesChart` - line 33, arrow function

#### `useChartRuntimeController.test.ts`
- No named functions found.

#### `useChartRuntimeController.ts`
- `useChartRuntimeController` - line 54, function
- `updateNavigateState` - line 74, function expression
- `notifyPanelRangeApplied` - line 102, function expression
- `applyPanelAndNavigatorRanges` - line 117, function expression
- `handleNavigatorRangeChange` - line 165, function expression
- `handlePanelRangeChange` - line 178, function expression
- `setExtremes` - line 206, function expression
- `applyLoadedRanges` - line 224, function expression
- `refreshPanelData` - line 249, arrow function

#### `useChartSelectionPopupState.ts`
- `useChartSelectionPopupState` - line 47, function
- `handleSelection` - line 69, arrow function
- `handleCloseDragSelect` - line 109, arrow function

#### `useEChartsPanelInstance.ts`
- `useEChartsPanelInstance` - line 41, function
- `usePanelChartHandleBridge` - line 65, function
- `setPanelRange` - line 74, arrow function
- `getVisibleSeries` - line 77, arrow function
- `usePanelChartReadySync` - line 96, function

#### `usePanelChartBrushSync.ts`
- `usePanelChartBrushSync` - line 15, function

#### `usePanelChartDataRefresh.ts`
- `usePanelChartDataRefresh` - line 33, function
- `refreshPanelData` - line 54, function expression

#### `usePanelChartEvents.ts`
- `isLegendHoverPayload` - line 33, arrow function
- `usePanelChartEvents` - line 61, function
- `datazoom` - line 78, arrow function
- `brushEnd` - line 105, arrow function
- `legendselectchanged` - line 139, arrow function
- `highlight` - line 143, arrow function
- `downplay` - line 150, arrow function
- `click` - line 157, arrow function

#### `usePanelChartLegendHover.ts`
- `usePanelChartLegendHover` - line 19, function

#### `usePanelChartRangeSync.ts`
- `usePanelChartRangeSync` - line 23, function

### Verify
- Direct code files inspected: 28
- Named functions recorded: 70
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `ChartBody.test.tsx`
- `MockTimeSeriesChart` line 27: `pChartHandlers` (used)
- `FFTModal` line 47: no parameters
- `Popover` line 51: `children` (used)
- `MockDesignSystemButton` line 61: `children` (used), `onClick` (used)
- `MockDesignSystemPage` line 73: `children` (used)
- `MockChevronLeftIcon` line 97: no parameters
- `MockChevronRightIcon` line 98: no parameters
- `MockCloseIcon` line 99: no parameters
- `createChartBodyProps` line 113: no parameters

#### `ChartBody.tsx`
- `ChartBody` line 24: `pChartRefs` (used), `pChartState` (used), `pPanelState` (used), `pNavigateState` (used), `pChartHandlers` (used), `pShiftHandlers` (used), `pTagSet` (used), `pSetIsFFTModal` (used), `pOnDragSelectStateChange` (used), `pOnHighlightSelection` (used)
- `handleChartMouseDownCapture` line 70: `aEvent` (used)

#### `ChartDataZoomStateUtils.ts`
- `getPrimaryDataZoomState` line 13: `aDataZoomState` (used)
- `hasExplicitDataZoomRange` line 32: `aDataZoomState` (used)

#### `ChartFooter.test.tsx`
- `MockDesignSystemButton` line 16: `onClick` (used)

#### `ChartFooter.tsx`
- `ChartFooter` line 26: `pPanelSummary` (used), `pVisibleRange` (used), `pShiftHandlers` (used), `pZoomHandlers` (used)

#### `ChartHighlightHitTesting.ts`
- `getHighlightIndexAtClientPosition` line 19: `areaChartRef` (used), `chartInstance` (used), `highlights` (used), `clientX` (used), `clientY` (used)

#### `ChartRuntimeTypes.ts`
- No named functions found.

#### `ChartSelectionSummaryPopover.tsx`
- `ChartSelectionSummaryPopover` line 14: `dragSelectState` (used), `onClose` (used)

#### `ChartTimeSummary.tsx`
- `ChartTimeSummary` line 9: `pPresentationState` (used)

#### `PanelChartDatasetFetcher.ts`
- `fetchPanelDatasets` line 48: `seriesConfigSet` (used), `panelData` (used), `panelTime` (used), `panelAxes` (used), `boardTime` (used), `chartWidth` (used), `isRaw` (used), `timeRange` (used), `rollupTableList` (used), `useSampling` (used), `includeColor` (used), `isNavigator` (used)
- `fetchPanelDatasetsFromRequest` line 150: `aRequest` (used), `aUseSampling` (used), `aIncludeColor` (used), `aIsNavigator` (used)
- `createEmptyFetchPanelDatasetsResult` line 183: no parameters

#### `PanelChartFetchPolicy.ts`
- `isFetchableTimeRange` line 27: `aTimeRange` (used)
- `calculatePanelFetchCount` line 44: `aLimit` (used), `aUseSampling` (used), `aIsRaw` (used), `aAxes` (used), `aChartWidth` (used)
- `resolvePanelFetchTimeRange` line 70: `aPanelTime` (used), `aBoardTime` (used), `aTimeRange` (used)
- `resolveRawFetchSampling` line 93: `aUseSampling` (used), `aSamplingValue` (used)
- `resolvePanelFetchInterval` line 119: `aPanelData` (used), `aAxes` (used), `aTimeRange` (used), `aChartWidth` (used), `aIsRaw` (used), `aIsNavigator = default` (used)

#### `PanelChartLoadContracts.ts`
- No named functions found.

#### `PanelChartOverflowPolicy.ts`
- `analyzePanelDataLimit` line 18: `aIsRaw` (used), `aRows` (used), `aCount` (used), `aCurrentLimitEnd` (used)
- `createPanelOverflowRange` line 50: `aFetchResult` (used)

#### `PanelChartRangePolicy.ts`
- `resolvePanelRangeApplicationDecision` line 21: `aPanelRange` (used), `aNavigatorRange` (used), `aCurrentPanelRange` (used), `aCurrentNavigatorRange` (used), `aLoadedDataRange` (used)

#### `PanelChartStateLoader.test.ts`
- No named functions found.

#### `PanelChartStateLoader.ts`
- `loadNavigatorChartState` line 32: `aRequest` (used)
- `loadPanelChartState` line 52: `aRequest` (used)

#### `PanelNavigateStateUtils.ts`
- `createInitialPanelNavigateState` line 13: no parameters
- `buildNavigateStatePatchFromPanelLoad` line 31: `aResult` (used), `aPanelRange` (used)

#### `TimeSeriesChart.test.tsx`
- `getEchartsInstance` line 25: no parameters
- `getBuildChartOptionMock` line 75: no parameters
- `getBuildChartSeriesOptionMock` line 86: no parameters
- `getExtractDataZoomRangeMock` line 97: no parameters
- `serializeMockChartRect` line 218: no parameters
- `getMockAreaChartRect` line 219: no parameters

#### `TimeSeriesChart.tsx`
- `TimeSeriesChart` line 33: `pChartRefs` (used), `pChartState` (used), `pPanelState` (used), `pNavigateState` (used), `pChartHandlers` (used)

#### `useChartRuntimeController.test.ts`
- No named functions found.

#### `useChartRuntimeController.ts`
- `useChartRuntimeController` line 54: `panelInfo` (used), `boardTime` (used), `areaChartRef` (used), `chartRef` (used), `rollupTableList` (used), `isRaw` (used), `onPanelRangeApplied` (used)
- `updateNavigateState` line 74: `aPatch` (used)
- `notifyPanelRangeApplied` line 102: `aPanelRange` (used)
- `applyPanelAndNavigatorRanges` line 117: `aPanelRange` (used), `aNavigatorRange` (used), `aRaw = default` (used)
- `handleNavigatorRangeChange` line 165: `aEvent` (used)
- `handlePanelRangeChange` line 178: `aEvent` (used)
- `setExtremes` line 206: `aPanelRange` (used), `aNavigatorRange` (used)
- `applyLoadedRanges` line 224: `aPanelRange` (used), `aNavigatorRange = default` (used)
- `refreshPanelData` line 249: `aTimeRange` (used), `aRaw = default` (used), `aDataRange = default` (used)

#### `useChartSelectionPopupState.ts`
- `useChartSelectionPopupState` line 47: `chartRefs` (used), `panelState` (used), `navigateState` (used), `tagSet` (used), `onDragSelectStateChange` (used), `onHighlightSelection` (used)
- `handleSelection` line 69: `aEvent` (used)
- `handleCloseDragSelect` line 109: no parameters

#### `useEChartsPanelInstance.ts`
- `useEChartsPanelInstance` line 41: no parameters
- `usePanelChartHandleBridge` line 65: `chartRefs` (used), `chartData` (used), `visibleSeriesRef` (used), `syncPanelRange` (used), `getHighlightIndexAtClientPosition` (used)
- `setPanelRange` line 74: `aRange` (used)
- `getVisibleSeries` line 77: no parameters
- `usePanelChartReadySync` line 96: `panelRange` (used), `syncBrushInteraction` (used), `syncPanelRange` (used), `hoveredLegendSeriesRef` (used), `applyLegendHoverState` (used)

#### `usePanelChartBrushSync.ts`
- `usePanelChartBrushSync` line 15: `getChartInstance` (used), `isBrushActive` (used)

#### `usePanelChartDataRefresh.ts`
- `usePanelChartDataRefresh` line 33: `panelInfo` (used), `boardTime` (used), `areaChartRef` (used), `chartRef` (used), `rollupTableList` (used), `navigateStateRef` (used), `updateNavigateState` (used)
- `refreshPanelData` line 54: `aTimeRange` (used), `aRaw` (used), `aDataRange` (used)

#### `usePanelChartEvents.ts`
- `isLegendHoverPayload` line 33: `aPayload` (used)
- `usePanelChartEvents` line 61: `getChartInstance` (used), `navigateState` (used), `panelState` (used), `chartRefs` (used), `chartHandlers` (used), `isSelectionMode` (used), `isDragZoomEnabled` (used), `lastZoomRangeRef` (used), `appliedZoomRangeRef` (used), `skipNextPanelRangeSyncRef` (used), `applyLegendHoverState` (used), `setVisibleSeries` (used), `visibleSeriesRef` (used)
- `datazoom` line 78: `aParams` (used)
- `brushEnd` line 105: `aParams` (used)
- `legendselectchanged` line 139: `aParams` (used)
- `highlight` line 143: `aParams` (used)
- `downplay` line 150: `aParams` (used)
- `click` line 157: `aParams` (used)

#### `usePanelChartLegendHover.ts`
- `usePanelChartLegendHover` line 19: `getChartInstance` (used), `chartState` (used), `navigateState` (used), `panelState` (used)

#### `usePanelChartRangeSync.ts`
- `usePanelChartRangeSync` line 23: `getChartInstance` (used), `panelRange` (used), `navigatorRange` (used)

### Verify
- Named functions checked: 70
- Parameters recorded: 161
- Parameters used: 161
- Parameters unused: 0

### Changed
- Recorded parameter usage for each named function in this folder.
## Step 4. Parameter Names

### Plan
- Decide whether each parameter name is explicit enough for its function role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded parameter names are accepted for now.

### Verify
- Parameter names reviewed: 161
- Parameter rename candidates: 0

### Changed
- No parameter rename candidates remain after the source cleanup.
## Step 5. Function Names

### Plan
- Decide whether each function name matches the function's role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded function names are accepted for now.

### Verify
- Function names reviewed: 70
- Function rename candidates: 0

### Changed
- No function rename candidates remain after the source cleanup.
## Step 6. Unneeded Parameters

### Plan
- Review the unused parameters found in Step 3.
- Remove only parameters that are not required by callbacks, interfaces, tests, or external call signatures.

### Execute
- No unused parameters found in the recorded named functions.

### Verify
- Unused parameter candidates reviewed: 0

### Changed
- No source parameters needed removal in this cleanup pass.
## Step 7. Unneeded Functions

### Plan
- Review each named function for evidence that it is still needed.
- Use a static name scan only as a candidate finder, not as proof that deletion is safe.

### Execute
- No unneeded functions were confirmed by the static scan.

### Verify
- Function removal candidates reviewed: 0

### Changed
- No function removal candidates remain after the source cleanup.
## Step 8. File Consolidation

### Plan
- Review direct files in this folder for consolidation opportunities.
- Consolidate only when it makes ownership clearer and reduces reasons to change.

### Execute
- Direct files reviewed: 33
- Code files: 28
- Test files: 5
- Style files: 3
- Documentation/data/other files: 2
- Decision: Keep style files beside their components; do not merge style and behavior files.
- Decision: Keep type-only files separated when they define shared contracts: `ChartRuntimeTypes.ts`, `PanelChartLoadContracts.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
