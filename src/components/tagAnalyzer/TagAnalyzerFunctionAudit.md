# TagAnalyzer Function Audit

This file inventories the current `src/components/tagAnalyzer` code files and summarizes what each named function does.

Notes:
- Generated report folders are excluded: `playwright-report`, `test-results`, and `.github` workflow files.
- `Job` comes from a nearby doc comment when available; otherwise it is inferred from the function name and context.

## common/CommonTypes.ts

- No named functions declared in this file.

## common/CommonUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| spec | callback | 43 | Implements spec. | inferred |
| spec | callback | 50 | Implements spec. | inferred |
| spec | callback | 57 | Implements spec. | inferred |
| spec | callback | 64 | Implements spec. | inferred |
| spec | callback | 71 | Implements spec. | inferred |
| spec | callback | 78 | Implements spec. | inferred |
| spec | callback | 85 | Implements spec. | inferred |
| spec | callback | 92 | Implements spec. | inferred |
| spec | callback | 99 | Implements spec. | inferred |
| spec | callback | 106 | Implements spec. | inferred |
| spec | callback | 113 | Implements spec. | inferred |
| spec | callback | 120 | Implements spec. | inferred |
| spec | callback | 127 | Implements spec. | inferred |
| spec | callback | 134 | Implements spec. | inferred |
| spec | callback | 141 | Implements spec. | inferred |
| spec | callback | 148 | Implements spec. | inferred |
| spec | callback | 155 | Implements spec. | inferred |
| normalizeTagAnalyzerTimeUnit | function | 162 | Normalizes tag analyzer time unit. | inferred |
| convertIntervalUnit | function | 192 | Normalizes short interval units into the names expected by TagAnalyzer fetch calls. | comment |
| getTimeUnitMilliseconds | function | 202 | Converts one shared time-unit value into milliseconds. | comment |
| getIntervalMs | function | 230 | Converts an interval option into milliseconds for rollup and fetch calculations. | comment |
| calculateInterval | function | 255 | Calculates the fetch interval that best matches the available chart width. | comment |
| resolveInterval | function | 277 | Resolves interval. | inferred |

## common/TagSearchModalBody.test.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| onPageChange | callback | 89 | Implements on page change. | inferred |
| onPageInputChange | callback | 91 | Implements on page input change. | inferred |

## common/TagSearchModalBody.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| mapAvailableSearchResultListItems | function | 37 | Maps available search result list items. | inferred |
| findTagNameBySearchResultId | function | 47 | Implements find tag name by search result id. | inferred |
| mapSelectedSeriesDraftListItems | function | 56 | Maps selected series draft list items. | inferred |
| TagSearchModalBody | component | 66 | Renders tag search modal body. | inferred |
| handleSelectedSeriesDraftKeyDown | function | 101 | Handles selected series draft key down. | inferred |

## common/TagSelectionHelpers.test.ts

- No named functions declared in this file.

## common/TagSelectionHelpers.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| buildSelectionLimitError | function | 9 | Builds selection limit error. | inferred |
| buildDefaultRange | function | 13 | Builds default range. | inferred |
| getTagSelectionErrorMessage | function | 27 | Returns tag selection error message. | inferred |
| getTagSelectionCountColor | function | 42 | Returns tag selection count color. | inferred |
| buildTagSelectionCountLabel | function | 49 | Builds tag selection count label. | inferred |
| buildCreateChartSeed | function | 56 | Builds create chart seed. | inferred |
| mergeSelectedTagsIntoTagSet | function | 75 | Implements merge selected tags into tag set. | inferred |

## common/TagSelectionModeRow.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| TagSelectionModeRow | component | 29 | Renders tag selection mode row. | inferred |

## common/useTagSearchModalState.test.ts

- No named functions declared in this file.

## common/useTagSearchModalState.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| buildTableColumns | function | 90 | Builds table columns. | inferred |
| getTagTotalFromResponse | function | 98 | Returns tag total from response. | inferred |
| getTagRowsFromResponse | function | 102 | Returns tag rows from response. | inferred |
| useTagSearchModalState | hook | 106 | Hook that manages tag search modal state. | inferred |

## editor/AddTagsModal.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| AddTagsModal | component | 20 | Renders add tags modal. | inferred |
| isSameSelectedTag | callback | 34 | Checks whether same selected tag. | inferred |
| handleSelectTag | function | 38 | Handles select tag. | inferred |
| setPanels | function | 46 | Sets panels. | inferred |
| onPageChange | callback | 126 | Implements on page change. | inferred |
| onPageInputChange | callback | 128 | Implements on page input change. | inferred |

## editor/OverlapTimeShiftControls.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| OverlapTimeShiftControls | component | 20 | Renders overlap time shift controls. | inferred |
| getShiftAmount | function | 38 | Returns shift amount. | inferred |
| setUtcTime | function | 42 | Sets utc time. | inferred |

## editor/PanelEditor.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelEditor | component | 21 | Renders panel editor. | inferred |
| applyEditorChanges | function | 43 | Implements apply editor changes. | inferred |
| saveEditorChanges | function | 55 | Implements save editor changes. | inferred |
| confirmSaveIfNeeded | function | 69 | Implements confirm save if needed. | inferred |

## editor/PanelEditorPreviewChart.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createInitialPreviewPanelState | function | 38 | Builds the initial preview-only panel state before the shared runtime controller loads any data. | comment |
| PanelEditorPreviewChart | component | 53 | Renders the editor preview shell and keeps preview-only initialization logic outside the shared runtime controller. | comment |
| updatePanelState | function | 78 | Updates panel state. | inferred |
| getPreviewNavigatorRange | function | 101 | Returns preview navigator range. | inferred |
| loadPreviewRanges | function | 108 | Implements load preview ranges. | inferred |
| toggleRawMode | function | 113 | Toggles raw mode. | inferred |
| onSelection | callback | 254 | Implements on selection. | inferred |

## editor/PanelEditorTypes.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| parseEditorNumber | function | 26 | Parses editor number. | inferred |

## editor/PanelEditorUtils.test.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createEditorTimeConfig | function | 34 | Creates editor time config. | inferred |

## editor/PanelEditorUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createPanelEditorConfig | function | 35 | Splits one panel payload into the sectioned editor state used by the editor tabs. | comment |
| mergePanelEditorConfig | function | 92 | Merges editor tab state back into the canonical panel info payload. | comment |
| resolveEditorTimeBounds | function | 130 | Resolves the concrete preview bounds used by the editor time controls. | comment |
| mergeAxesDraft | function | 181 | Merges one axes draft into the persisted axes shape with numeric fields normalized. | comment |
| mergeDisplayDraft | function | 225 | Merges one display draft into the persisted display shape with numeric fields normalized. | comment |
| normalizeDraftNumber | function | 241 | Normalizes editor number fields so blank inputs still round-trip into numeric panel config. | comment |

## editor/sections/AxesSection.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| formatTagDisplayLabel | function | 68 | Formats tag display label. | inferred |
| AxesSection | component | 77 | Renders axes section. | inferred |
| updateAxesConfig | function | 88 | Updates axes config. | inferred |
| setAxisFlag | function | 92 | Sets axis flag. | inferred |
| setSamplingEnabled | function | 104 | Sets sampling enabled. | inferred |
| setAxisNumber | function | 108 | Sets axis number. | inferred |
| setY2TagList | function | 114 | Sets y2 tag list. | inferred |
| setRemoveY2TagList | function | 122 | Sets remove y2 tag list. | inferred |
| renderAxisRangeRow | function | 203 | Renders axis range row. | inferred |
| renderThresholdRows | function | 271 | Renders threshold rows. | inferred |

## editor/sections/DataSection.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| DataSection | component | 19 | Renders data section. | inferred |
| openModal | function | 28 | Opens modal. | inferred |
| closeModal | function | 31 | Closes modal. | inferred |
| removeTag | function | 35 | Implements remove tag. | inferred |
| updateTagField | function | 41 | Updates tag field. | inferred |
| updateSourceTagName | function | 49 | Updates source tag name. | inferred |

## editor/sections/DisplaySection.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| DisplaySection | component | 32 | Renders display section. | inferred |
| updateDisplayConfig | function | 39 | Updates display config. | inferred |
| changeChartType | function | 43 | Implements change chart type. | inferred |
| setDisplayFlag | function | 71 | Sets display flag. | inferred |
| setDisplayNumber | function | 77 | Sets display number. | inferred |

## editor/sections/EditorTabContent.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| EditorTabContent | component | 14 | Renders editor tab content. | inferred |

## editor/sections/GeneralSection.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| GeneralSection | component | 12 | Renders general section. | inferred |
| updateGeneralConfig | function | 19 | Updates general config. | inferred |
| setGeneralFlag | function | 23 | Sets general flag. | inferred |

## editor/sections/PanelEditorSettings.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelEditorSettings | component | 8 | Renders panel editor settings. | inferred |

## editor/sections/TimeRangeSection.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| TimeRangeSection | component | 26 | Renders time range section. | inferred |
| updateTimeConfig | function | 41 | Updates time config. | inferred |
| updateInputValue | function | 56 | Updates input value. | inferred |
| getStoredBoundaryValue | function | 65 | Returns stored boundary value. | inferred |
| updateSingleBoundary | function | 68 | Updates single boundary. | inferred |
| handleTimeChange | function | 81 | Handles time change. | inferred |
| handleTimeApply | function | 87 | Handles time apply. | inferred |
| handleQuickTime | function | 92 | Handles quick time. | inferred |
| handleClear | function | 99 | Handles clear. | inferred |

## editor/TimeRangeUtils.test.ts

- No named functions declared in this file.

## editor/TimeRangeUtils.ts

- No named functions declared in this file.

## modal/CreateChartModal.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| getMinMaxBounds | function | 34 | Returns min max bounds. | inferred |
| CreateChartModal | component | 51 | Renders create chart modal. | inferred |
| isSameSelectedTag | callback | 61 | Checks whether same selected tag. | inferred |
| handleSelectTag | function | 72 | Handles select tag. | inferred |
| setPanels | function | 81 | Sets panels. | inferred |
| onPageChange | callback | 258 | Implements on page change. | inferred |
| onPageInputChange | callback | 260 | Implements on page input change. | inferred |

## modal/OverlapModal.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| OverlapModal | component | 40 | Renders the overlap comparison modal for the currently selected panels. | comment |
| syncPanelsInfoFromProps | function | 168 | Syncs the modal-local overlap panel list from the latest parent selection. | comment |
| reloadOverlapDataEffect | function | 177 | Reloads overlap data whenever the modal-local overlap selection changes. | comment |
| handleRefresh | function | 186 | Refreshes the currently loaded overlap chart without changing the selected panels. | comment |
| handleCloseModal | function | 197 | Closes the overlap modal. | comment |
| renderOverlapTimeShiftControl | function | 207 | Renders one set of time-shift controls for a loaded overlap panel. | comment |
| handleShiftTimeControl | function | 217 | Applies a time shift to the rendered overlap panel. | comment |

## modal/OverlapModalUtils.test.ts

- No named functions declared in this file.

## modal/OverlapModalUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| buildOverlapChartSeries | function | 31 | Converts one overlap fetch result into the chart-series shape used by the overlap chart. | comment |
| shiftOverlapPanels | function | 59 | Applies a time-shift change to one overlap panel without mutating the rest of the selection. | comment |
| buildOverlapLoadState | function | 80 | Splits overlap fetch results into the chart-series list and aligned start-time list. | comment |
| resolveOverlapTimeRange | function | 108 | Builds the overlap fetch window from the panel start time and anchor duration. | comment |
| calculateOverlapSampleCount | function | 125 | Calculates the overlap fetch count from the current chart width and panel density settings. | comment |
| alignOverlapTime | function | 147 | Aligns overlap fetch bounds to the calculated interval when sampling is interval-based. | comment |
| buildOverlapSeriesName | function | 163 | Builds the overlap-series display label shown in the comparison chart. | comment |
| mapOverlapRows | function | 176 | Normalizes overlap rows so every compared series starts at zero on the shared chart axis. | comment |

## panel/PanelBody.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelBody | component | 45 | Renders panel body. | inferred |
| handleSelection | function | 79 | Handles selection. | inferred |
| handleCloseDragSelect | function | 113 | Handles close drag select. | inferred |

## panel/PanelChart.test.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| getEchartsInstance | callback | 25 | Returns echarts instance. | inferred |
| getBuildPanelChartOptionMock | function | 61 | Returns build panel chart option mock. | inferred |
| getBuildPanelChartSeriesOptionMock | function | 65 | Returns build panel chart series option mock. | inferred |
| getExtractDataZoomRangeMock | function | 69 | Returns extract data zoom range mock. | inferred |

## panel/PanelChart.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| isLegendHoverPayload | function | 87 | Checks whether legend hover payload. | inferred |
| getPrimaryDataZoomState | function | 98 | Returns primary data zoom state. | inferred |
| hasExplicitDataZoomRange | function | 107 | Checks whether it has explicit data zoom range. | inferred |
| PanelChart | component | 125 | Renders panel chart. | inferred |
| setPanelRange | callback | 290 | Sets panel range. | inferred |
| getVisibleSeries | callback | 293 | Returns visible series. | inferred |
| datazoom | callback | 390 | Implements datazoom. | inferred |
| brushEnd | callback | 420 | Implements brush end. | inferred |
| legendselectchanged | callback | 457 | Implements legendselectchanged. | inferred |
| highlight | callback | 462 | Implements highlight. | inferred |
| downplay | callback | 470 | Implements downplay. | inferred |

## panel/PanelChartOptions.test.ts

- No named functions declared in this file.

## panel/PanelChartOptions.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| buildThresholdLine | function | 171 | Builds a silent threshold line when the matching axis guard is enabled. | comment |
| getMinValue | function | 200 | Finds the minimum y value in one series, optionally clamping against zero. | comment |
| getMaxValue | function | 216 | Finds the maximum y value in one series, optionally clamping against zero. | comment |
| getRoundedAxisStep | function | 231 | Chooses a chart-friendly step size for the auto y-axis maximum. | comment |
| roundAxisMaximum | function | 255 | Rounds the auto y-axis maximum up so the chart has a cleaner top boundary. | comment |
| updateAxisBounds | function | 273 | Expands the running min/max bounds for one axis side with data from a single series. | comment |
| roundAxisBounds | function | 288 | Rounds the collected axis bounds to three-decimal precision and a clean ceiling. | comment |
| getYAxisValues | function | 301 | Collects the min/max bounds needed to size both Y axes. | comment |
| resolveAxisRange | function | 329 | Resolves the effective axis bounds — returns the manual range when set, otherwise the data-driven defaults. | comment |
| formatTooltipTime | function | 345 | Formats tooltip timestamps while preserving millisecond precision when present. | comment |
| formatAxisTime | function | 370 | Chooses a compact axis label format based on the current visible time span. | comment |
| buildYAxis | function | 396 | Builds the panel Y axes from panel settings and visible data. | comment |
| buildMainSeries | function | 457 | Builds the visible main-chart line series and any axis threshold overlays. | comment |
| buildNavigatorSeries | function | 546 | Mirrors the visible main-series set into the navigator lane so it reflects the real panel series instead of relying on the slider's default data shadow. | comment |
| buildLegendSelectedMap | function | 597 | Mirrors legend visibility into the format ECharts expects for selected series. | comment |
| buildDefaultVisibleSeriesMap | function | 612 | Seeds every visible series as enabled until the user toggles the legend. | comment |
| buildVisibleSeriesList | function | 629 | Returns the current legend visibility in a UI-friendly list form. | comment |
| extractDataZoomRange | function | 646 | Resolves ECharts zoom payloads back into absolute timestamps. | comment |
| getPanelChartLayoutMetrics | function | 692 | Returns the shared vertical layout metrics for the main plot, toolbar lane, and slider. | comment |
| extractBrushRange | function | 714 | Extracts the first selected brush window from either direct or batched brush payloads. | comment |
| buildPanelChartOption | function | 740 | Builds the single-panel ECharts option used by the main chart and slider pair. | comment |
| formatter | callback | 790 | Implements formatter. | inferred |
| formatter | callback | 827 | Implements formatter. | inferred |
| buildPanelChartSeriesOption | function | 968 | Builds the series portion of the panel option so hover-only updates can merge style changes without rebuilding axes, tooltip, zoom, and layout state. | comment |
| buildOverlapChartOption | function | 989 | Builds the simpler single-grid overlap chart used by the overlap modal. | comment |
| formatter | callback | 1050 | Implements formatter. | inferred |
| formatter | callback | 1079 | Implements formatter. | inferred |

## panel/PanelContainer.test.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createBoardPanelActions | function | 129 | Creates board panel actions. | inferred |
| createBoardPanelState | function | 137 | Creates board panel state. | inferred |
| createProps | function | 151 | Creates props. | inferred |

## panel/PanelContainer.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelContainer | component | 79 | Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller. | comment |
| makeResetParams | function | 123 | Builds the reset and initialization inputs shared by the panel time-range helpers. | comment |
| handlePanelRangeApplied | function | 141 | Persists the applied panel range through the board lane after the shared runtime controller finishes loading. | comment |
| initialize | function | 184 | Implements initialize. | inferred |
| reset | function | 203 | Implements reset. | inferred |
| toggleDragSelect | function | 216 | Toggles drag select. | inferred |
| handleDragSelectStateChange | function | 235 | Handles drag select state change. | inferred |
| toggleRaw | function | 250 | Toggles raw. | inferred |
| onToggleOverlap | callback | 267 | Implements on toggle overlap. | inferred |
| onOpenFft | callback | 278 | Implements on open fft. | inferred |
| onSetGlobalTime | callback | 279 | Implements on set global time. | inferred |
| onOpenEdit | callback | 287 | Implements on open edit. | inferred |
| onDelete | callback | 293 | Implements on delete. | inferred |
| onRefreshData | callback | 374 | Implements on refresh data. | inferred |
| onRefreshTime | callback | 380 | Implements on refresh time. | inferred |
| onSelection | callback | 396 | Implements on selection. | inferred |
| arePanelContainerPropsEqual | function | 427 | Implements are panel container props equal. | inferred |

## panel/PanelFetchUtils.test.ts

- No named functions declared in this file.

## panel/PanelFooter.test.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| Button | component | 10 | Renders button. | inferred |

## panel/PanelFooter.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelFooter | component | 22 | Renders panel footer. | inferred |

## panel/PanelHeader.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| PanelHeader | component | 28 | Renders panel header. | inferred |
| handleDelete | function | 43 | Handles delete. | inferred |

## panel/PanelModel.test.ts

- No named functions declared in this file.

## panel/PanelModel.ts

- No named functions declared in this file.

## panel/PanelRangeUtils.test.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createBoardRangeParams | function | 42 | Creates board range params. | inferred |

## panel/PanelRangeUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| getNavigatorRangeFromEvent | function | 73 | Enforces the minimum navigator width expected by the footer controls. | comment |
| getZoomInPanelRange | function | 88 | Zooms the panel inward around its current center point. | comment |
| getZoomOutRange | function | 103 | Zooms the panel outward and widens the navigator when the new range escapes the current bounds. | comment |
| getFocusedPanelRange | function | 136 | Narrows the panel view to the middle slice of the current range and zooms the slider range in by half. | comment |
| createPanelRangeControlHandlers | function | 169 | Builds the panel move and zoom handlers for the board and preview shells. | comment |
| onShiftPanelRangeLeft | callback | 176 | Implements on shift panel range left. | inferred |
| onShiftPanelRangeRight | callback | 181 | Implements on shift panel range right. | inferred |
| onShiftNavigatorRangeLeft | callback | 186 | Implements on shift navigator range left. | inferred |
| onShiftNavigatorRangeRight | callback | 191 | Implements on shift navigator range right. | inferred |
| onZoomIn | callback | 198 | Implements on zoom in. | inferred |
| onZoomOut | callback | 200 | Implements on zoom out. | inferred |
| onFocus | callback | 205 | Implements on focus. | inferred |
| getMovedPanelRange | function | 218 | Shifts the visible panel range by half its width in the requested direction. | comment |
| getMovedNavigatorRange | function | 252 | Shifts the navigator window and keeps the panel inside the new overview. | comment |
| resolveBoardLastRange | function | 271 | Resolves board-level ranges expressed as "last ..." relative values. | comment |
| resolveEditBoardLastRange | function | 295 | Reuses edit-mode preview bounds when they already reflect a fetched board range. | comment |
| getDefaultBoardRange | function | 311 | Falls back to the board default range when no more specific rule applies. | comment |
| resolveEditPreviewTimeRange | function | 333 | Reuses the editor preview min/max bounds when they are already known. | comment |
| getAbsolutePanelRange | function | 348 | Returns a literal numeric panel range without any relative-time resolution. | comment |
| resolveNowPanelRange | function | 362 | Resolves panel ranges that are expressed relative to "now". | comment |
| getRelativePanelLastRange | function | 384 | Resolves panel ranges that are expressed relative to the latest fetched panel time. | comment |
| resolvePanelRangeFromRules | function | 423 | Resolves the highest-priority range rule that applies to a panel. | comment |
| resolveResetTimeRange | function | 469 | Resolves the range used when a panel is explicitly reset. | comment |
| fallbackRange | callback | 494 | Implements fallback range. | inferred |
| resolveInitialPanelRange | function | 507 | Resolves the first visible range when a panel initializes. | comment |
| fallbackRange | callback | 523 | Implements fallback range. | inferred |
| resolveTimeKeeperRanges | function | 538 | Rehydrates persisted panel and navigator ranges from the time-keeper payload. | comment |
| createPanelTimeKeeperPayload | function | 560 | Serializes the current panel and navigator windows into the time-keeper payload. | comment |
| resolveGlobalTimeTargetRange | function | 576 | Chooses the range that should be broadcast as the current global time selection. | comment |
| buildPanelPresentationState | function | 603 | Builds the header/footer presentation strings for a panel card. | comment |
| getClampedNavigatorFocusRange | function | 644 | Keeps a resized navigator range inside its previous bounds while preserving width when possible. | comment |
| getRangeWidth | function | 674 | Measures the current width of a time range. | comment |
| shiftTimeRange | function | 684 | Shifts a time range by the provided offset. | comment |
| getDirectionOffset | function | 694 | Converts a range width and direction into the signed shift offset used by move helpers. | comment |
| isRangeOutsideBounds | function | 705 | Detects whether the next panel range escaped the current navigator bounds. | comment |
| applyRangeUpdate | function | 715 | Applies a resolved range update only when one exists. | comment |
| isCompleteTimeRange | function | 730 | Detects whether a partial time range has both concrete endpoints. | comment |

## panel/usePanelController.test.ts

- No named functions declared in this file.

## panel/usePanelController.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createInitialPanelNavigateState | function | 56 | Builds the empty navigate state used before any panel data has been loaded. | comment |
| buildNavigateStatePatchFromPanelLoad | function | 73 | Converts a panel fetch result into the navigate-state patch used by both board and preview charts. | comment |
| usePanelChartRuntimeController | hook | 99 | Shares panel and slider-range orchestration between board and preview chart shells. | comment |
| updateNavigateState | function | 125 | Updates navigate state. | inferred |
| notifyPanelRangeApplied | function | 139 | Implements notify panel range applied. | inferred |
| refreshPanelData | function | 154 | Implements refresh panel data. | inferred |
| applyPanelAndNavigatorRanges | function | 205 | Implements apply panel and navigator ranges. | inferred |
| handleNavigatorRangeChange | function | 277 | Handles navigator range change. | inferred |
| handlePanelRangeChange | function | 290 | Handles panel range change. | inferred |
| setExtremes | function | 315 | Sets extremes. | inferred |
| applyLoadedRanges | function | 333 | Implements apply loaded ranges. | inferred |

## playwright.config.ts

- No named functions declared in this file.

## TagAnalyzer.test.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| Page | component | 81 | Renders page. | inferred |
| Button | component | 88 | Renders button. | inferred |
| createProps | function | 211 | Creates props. | inferred |

## TagAnalyzer.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| hasPersistedTimeKeeperStateChanged | function | 69 | Returns the next panel list with one panel's persisted time-keeper state applied. | comment |
| applyPendingPersistedTimeKeeperStateUpdates | function | 85 | Implements apply pending persisted time keeper state updates. | inferred |
| TagAnalyzer | component | 131 | Renders tag analyzer. | inferred |
| buildToolbarActionHandlers | function | 436 | Builds toolbar action handlers. | inferred |
| onOpenTimeRangeModal | callback | 448 | Implements on open time range modal. | inferred |
| onRefreshData | callback | 449 | Implements on refresh data. | inferred |
| onRefreshTime | callback | 450 | Implements on refresh time. | inferred |
| onOpenSaveModal | callback | 452 | Implements on open save modal. | inferred |
| onOpenOverlapModal | callback | 453 | Implements on open overlap modal. | inferred |
| buildBoardRangeText | function | 457 | Builds board range text. | inferred |
| buildPanelBoardActions | function | 471 | Builds panel board actions. | inferred |
| onOverlapSelectionChange | callback | 484 | Implements on overlap selection change. | inferred |
| onDeletePanel | callback | 488 | Implements on delete panel. | inferred |
| onSetGlobalTimeRange | callback | 491 | Implements on set global time range. | inferred |
| getNextOverlapPanels | function | 510 | Returns the next overlap-panel selection list after applying the requested change. | comment |

## TagAnalyzerBoard.tsx

- No named functions declared in this file.

## TagAnalyzerBoardToolbar.tsx

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| TagAnalyzerBoardToolbar | component | 23 | Renders tag analyzer board toolbar. | inferred |

## TagAnalyzerSeriesNaming.ts

- No named functions declared in this file.

## TagAnalyzerTypes.ts

- No named functions declared in this file.

## TagAnalyzerUtilCaller.test.ts

- No named functions declared in this file.

## TagAnalyzerUtilCaller.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| callTagAnalyzerBgnEndTimeRange | function | 26 | Calls the shared min/max utility with TagAnalyzer's sourceTagName-only series shape. | comment |
| callTagAnalyzerMinMaxTable | function | 45 | Calls the shared min/max table query with TagAnalyzer's sourceTagName-only draft shape. | comment |

## TagAnalyzerUtils.test.ts

- No named functions declared in this file.

## TagAnalyzerUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| checkTableUser | function | 61 | Prefixes bare table names with the current admin schema. | comment |
| getDurationInString | function | 73 | Formats a time span into a short human-readable label. | comment |
| computeSeriesCalcList | function | 90 | Builds min/max/avg summaries for the points inside the selected range. | comment |
| calculateSampleCount | function | 127 | Derives the requested row count for either sampled or full-resolution fetches. | comment |
| buildQuickSelectRows | function | 159 | Groups the saved quick-select options into keyed rows for rendering. | comment |
| formatDurationPart | function | 172 | Formats one duration segment and skips empty units. | comment |
| toChartPoints | function | 181 | Normalizes tuple-based chart series data into point objects. | comment |

## TestData/PanelChartTestData.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createMockChartInstance | function | 41 | Creates mock chart instance. | inferred |
| createPanelChartPropsFixture | function | 59 | Creates panel chart props fixture. | inferred |

## TestData/PanelEChartTestData.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createPanelChartLayoutOptionFixture | function | 14 | Creates panel chart layout option fixture. | inferred |

## TestData/PanelTestData.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| stripUndefinedFields | function | 27 | Implements strip undefined fields. | inferred |
| createTagAnalyzerTimeRangeFixture | function | 95 | Builds a time-range fixture for panel and navigator tests. | comment |
| createTagAnalyzerSeriesColumnsFixture | function | 110 | Builds the source-column mapping used by chart-series fixtures. | comment |
| createTagAnalyzerSeriesConfigFixture | function | 126 | Builds a series-config fixture for panel, fetch, and adapter tests. | comment |
| createTagAnalyzerFetchSeriesConfigFixture | function | 152 | Builds the fetch-focused series config used by TagAnalyzerFetchUtils tests. | comment |
| createTagAnalyzerChartSeriesItemFixture | function | 173 | Builds a chart-series item fixture for chart rendering tests. | comment |
| createTagAnalyzerChartSeriesListFixture | function | 194 | Builds the default chart-series list used by panel tests. | comment |
| createTagAnalyzerChartDataFixture | function | 203 | Builds navigator chart data for chart and layout tests. | comment |
| createTagAnalyzerPanelAxesFixture | function | 217 | Builds the default panel-axis config used by panel tests. | comment |
| createTagAnalyzerPanelDisplayFixture | function | 252 | Builds the default panel-display config used by chart tests. | comment |
| createTagAnalyzerPanelTimeKeeperFixture | function | 272 | Builds the default time-keeper payload used by panel-time tests. | comment |
| createTagAnalyzerPanelDataFixture | function | 287 | Builds the default panel-data config used by fetch and runtime tests. | comment |
| createTagAnalyzerPanelTimeFixture | function | 304 | Builds the default panel-time config used by runtime and editor tests. | comment |
| createEmptyTagAnalyzerPanelTimeFixture | function | 337 | Builds a panel-time fixture with blank range bounds for reset/initialization tests. | comment |
| createTagAnalyzerPanelInfoFixture | function | 352 | Builds a nested panel-info fixture for editor and model tests. | comment |
| createTagAnalyzerBoardSourceInfoFixture | function | 409 | Builds the board-source shape passed into the top-level TagAnalyzer workspace. | comment |
| createTagAnalyzerEditRequestFixture | function | 431 | Builds the top-level edit request shape used to open PanelEditor from TagAnalyzer. | comment |
| createPanelFooterPropsFixture | function | 451 | Builds the footer props needed by focused footer interaction tests. | comment |
| createOverlapPanelInfoFixture | function | 477 | Builds the minimal overlap-panel info used by overlap helper tests. | comment |

## TestData/project.ts

- No named functions declared in this file.

## TestData/TagSearchTestData.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createTagSearchSourceColumnsFixture | function | 17 | Creates tag search source columns fixture. | inferred |
| createTagSearchResultRowFixture | function | 32 | Creates tag search result row fixture. | inferred |
| createTagSearchResultRowsFixture | function | 41 | Creates tag search result rows fixture. | inferred |
| createTagSelectionDraftFixture | function | 51 | Creates tag selection draft fixture. | inferred |
| createTagSelectionDraftListFixture | function | 72 | Creates tag selection draft list fixture. | inferred |
| createTagSearchModalStateOptionsFixture | function | 80 | Creates tag search modal state options fixture. | inferred |
| isSameSelectedTag | callback | 84 | Checks whether same selected tag. | inferred |

## useTagAnalyzerWorkspaceController.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| getNextOverlapPanels | function | 49 | Returns next overlap panels. | inferred |
| getNextPanelsWithPersistedTimeKeeperState | function | 87 | Returns next panels with persisted time keeper state. | inferred |
| useTagAnalyzerWorkspaceController | hook | 118 | Hook that manages tag analyzer workspace controller. | inferred |
| refreshTopLevelBgnEndTimeRange | function | 165 | Implements refresh top level bgn end time range. | inferred |
| onOverlapSelectionChange | callback | 248 | Implements on overlap selection change. | inferred |
| onDeletePanel | callback | 252 | Implements on delete panel. | inferred |
| onPersistPanelState | callback | 254 | Implements on persist panel state. | inferred |
| onSetGlobalTimeRange | callback | 265 | Implements on set global time range. | inferred |
| onOpenTimeRangeModal | callback | 274 | Implements on open time range modal. | inferred |
| onRefreshData | callback | 275 | Implements on refresh data. | inferred |
| onRefreshTime | callback | 276 | Implements on refresh time. | inferred |
| onOpenSaveModal | callback | 278 | Implements on open save modal. | inferred |
| onOpenOverlapModal | callback | 279 | Implements on open overlap modal. | inferred |

## utils/legacy/LegacyTypes.ts

- No named functions declared in this file.

## utils/legacy/LegacyUtils.test.ts

- No named functions declared in this file.

## utils/legacy/LegacyUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| fromLegacyYn | function | 35 | Converts a legacy Y/N flag into the boolean form used inside TagAnalyzer. | comment |
| toLegacyYn | function | 44 | Converts an internal boolean flag back into the legacy Y/N representation. | comment |
| getSourceTagName | function | 53 | Resolves the canonical source-series identifier while still accepting legacy tagName payloads. | comment |
| withNormalizedSourceTagName | function | 70 | Normalizes one draft or series config to the sourceTagName-only internal shape. | comment |
| normalizeSourceTagNames | function | 90 | Normalizes a list of drafts or series configs to the sourceTagName-only internal shape. | comment |
| normalizeLegacySeriesConfigs | function | 101 | Normalizes flat panel-series configs into TagAnalyzer's required internal config shape. | comment |
| toLegacyTagNameItem | function | 118 | Recreates the legacy tagName field only when leaving the normalized TagAnalyzer domain. | comment |
| toLegacyTagNameList | function | 134 | Recreates legacy tagName fields for a list of items at a legacy utility boundary. | comment |
| toLegacySeriesConfigs | function | 145 | Converts normalized TagAnalyzer series configs back to the legacy flat-storage shape. | comment |
| normalizeLegacyBgnEndTimeRange | function | 162 | Converts the shared flat min/max payload into TagAnalyzer's nested range shape. | comment |
| normalizeLegacyChartSeries | function | 186 | Converts legacy split-array chart data into TagAnalyzer's tuple-based chart series shape. | comment |
| legacySeriesToChartPoints | function | 200 | Normalizes either tuple-based or split x/y legacy series data into point objects. | comment |
| normalizeLegacyTimeRangeBoundary | function | 232 | Converts one legacy start/end pair into the strict numeric range used by TagAnalyzer, while preserving the original legacy expression only when it is still needed. | comment |
| toLegacyTimeRangeInput | function | 246 | Converts one strict numeric range plus optional legacy expression back into the boundary input shape expected by legacy helpers. | comment |
| legacyMinMaxPairToRange | function | 253 | Implements legacy min max pair to range. | inferred |
| legacyChartSeriesHasArrays | function | 267 | Implements legacy chart series has arrays. | inferred |
| legacyChartSeriesToRows | function | 276 | Implements legacy chart series to rows. | inferred |

## utils/TagAnalyzerDateUtils.test.ts

- No named functions declared in this file.

## utils/TagAnalyzerDateUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| isRelativeTimeValue | function | 22 | Detects whether a range value uses any relative-time format (last or now). | comment |
| isLastRelativeTimeValue | function | 31 | Detects whether a range value uses the "last ..." relative-time format. | comment |
| isNowRelativeTimeValue | function | 40 | Detects whether a range value uses the "now ..." relative-time format. | comment |
| createTagAnalyzerTimeRange | function | 56 | Builds the canonical time-range shape used across TagAnalyzer. | comment |
| isSameTimeRange | function | 68 | Returns whether two time ranges describe the same visible window. | comment |
| normalizeTimeRangeSource | function | 77 | Normalizes one raw start/end pair into a concrete range source or `undefined` when either side is absent. | comment |
| normalizePanelTimeRangeSource | function | 96 | Normalizes raw panel time into the concrete range/default shape used by range resolution. | comment |
| setTimeRange | function | 116 | Resolves the effective panel range from panel, board, and default values. | comment |
| convertTimeToFullDate | function | 133 | Converts a stored range value into an absolute UTC timestamp. | comment |
| buildConcreteTimeRangeSource | function | 167 | Normalizes one start/end pair into a concrete range source or `undefined` when either side is absent. | comment |
| buildDefaultTimeRange | function | 195 | Converts the stored default range into the concrete time-range shape used by the resolver. | comment |

## utils/TagAnalyzerFetchUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| fetchParsedTables | function | 134 | Implements fetch parsed tables. | inferred |
| fetchNormalizedTopLevelTimeRange | function | 152 | Implements fetch normalized top level time range. | inferred |
| fetchPanelDatasetsFromRequest | function | 168 | Shared fetch pipeline that loads panel datasets from a PanelFetchRequest. | comment |
| loadNavigatorChartState | function | 202 | Bridges board/controller state into the navigator fetch helper. | comment |
| loadPanelChartState | function | 221 | Bridges board/controller state into the main panel fetch helper. | comment |
| createEmptyFetchResponse | function | 246 | Creates empty fetch response. | inferred |
| createEmptyFetchPanelDatasetsResult | function | 255 | Creates empty fetch panel datasets result. | inferred |
| isFetchableTimeRange | function | 272 | Returns whether a time range is concrete enough to send to the repository. | comment |
| fetchPanelDatasets | function | 304 | Fetches every saved series config and normalizes the responses into chart datasets. | comment |
| fetchSeriesRows | function | 397 | Fetches rows for one series config through the shared raw/calculated request path. | comment |
| calculatePanelFetchCount | function | 440 | Calculates the requested row count for the current panel fetch. | comment |
| resolvePanelFetchTimeRange | function | 464 | Resolves the concrete fetch window from panel, board, and override ranges. | comment |
| resolvePanelFetchInterval | function | 490 | Chooses either the saved interval or a width-based fallback interval. | comment |
| fetchCalculatedSeriesRows | function | 528 | Fetches calculated rows for one series config through the MachIOT repository API. | comment |
| fetchRawSeriesRows | function | 567 | Fetches raw rows for one series config through the MachIOT repository API. | comment |
| mapRowsToChartData | function | 597 | Drops any extra repository columns and keeps the timestamp/value pair expected by the chart. | comment |
| getSeriesName | function | 611 | Builds the display label for a series, preferring aliases when present. | comment |
| buildChartSeriesItem | function | 630 | Converts one fetched series-config response into the chart-series structure used by TagAnalyzer. | comment |
| analyzePanelDataLimit | function | 653 | Detects whether a raw fetch hit its row limit and therefore clamped the visible range. | comment |

## utils/TagAnalyzerPanelInfoConversion.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| normalizeTagAnalyzerBoardInfo | function | 70 | Normalizes tag analyzer board info. | inferred |
| normalizeTagAnalyzerPanelInfo | function | 86 | Normalizes tag analyzer panel info. | inferred |
| flattenTagAnalyzerPanelInfo | function | 153 | Implements flatten tag analyzer panel info. | inferred |
| normalizeNumericValue | function | 210 | Normalizes numeric value. | inferred |
| normalizeNumericRange | function | 218 | Normalizes numeric range. | inferred |

## utils/TagAnalyzerSaveUtils.test.ts

- No named functions declared in this file.

## utils/TagAnalyzerSaveUtils.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| updateBoardPanels | function | 13 | Returns a new board list with the target board's panels transformed by the given callback. | comment |
| getNextBoardListWithSavedPanels | function | 30 | Returns the next board list with one board's panel list saved from nested panel info. | comment |
| getNextBoardListWithSavedPanel | function | 48 | Returns the next board list with one nested panel saved into the target board. | comment |
| getNextBoardListWithoutPanel | function | 68 | Returns the next board list with one panel removed from the target board. | comment |

## utils/TagAnalyzerTimeRangeConfig.ts

| Function | Kind | Line | Job | Source |
| --- | --- | ---: | --- | --- |
| createEmptyTimeBoundary | function | 25 | Creates the empty boundary used when a panel inherits time from a higher scope. | comment |
| createAbsoluteTimeBoundary | function | 32 | Creates one absolute UTC-millisecond boundary. | comment |
| createRelativeTimeBoundary | function | 42 | Creates one relative boundary anchored to either now or the latest fetched data time. | comment |
| createRawTimeBoundary | function | 60 | Creates one raw string boundary when persisted data contains an unsupported expression. | comment |
| createTimeRangeConfig | function | 70 | Creates the structured start/end holder used inside TagAnalyzer. | comment |
| parseLegacyTimeBoundary | function | 83 | Parses one persisted legacy time value into the structured internal boundary model. | comment |
| parseTimeRangeInputValue | function | 109 | Parses one editor input string into the structured boundary model. | comment |
| parseLegacyTimeRangeConfig | function | 128 | Parses one persisted legacy start/end pair into the structured internal holder. | comment |
| formatTimeRangeInputValue | function | 141 | Formats one structured boundary for the editor text input. | comment |
| toLegacyTimeRangeInput | function | 157 | Converts the structured time-range holder into the current legacy input payload. | comment |
| toLegacyTimeValue | function | 175 | Converts one structured boundary back into the persisted legacy scalar value. | comment |
| normalizeTimeRangeConfig | function | 192 | Resolves the numeric range used by TagAnalyzer runtime code from the structured holder. | comment |
| isEmptyTimeBoundary | function | 208 | Returns whether one boundary is empty. | comment |
| isAbsoluteTimeBoundary | function | 217 | Returns whether one boundary is absolute. | comment |
| isRelativeTimeBoundary | function | 226 | Returns whether one boundary is relative. | comment |
| isLastRelativeTimeBoundary | function | 235 | Returns whether one boundary is a `last`-anchored relative expression. | comment |
| isNowRelativeTimeBoundary | function | 244 | Returns whether one boundary is a `now`-anchored relative expression. | comment |
| isRelativeTimeRangeConfig | function | 253 | Returns whether both boundaries are relative expressions. | comment |
| isLastRelativeTimeRangeConfig | function | 265 | Returns whether both boundaries are `last`-anchored relative expressions. | comment |
| isNowRelativeTimeRangeConfig | function | 277 | Returns whether both boundaries are `now`-anchored relative expressions. | comment |
| isAbsoluteTimeRangeConfig | function | 289 | Returns whether both boundaries are concrete absolute timestamps. | comment |
| resolveTimeBoundaryValue | function | 301 | Resolves one structured boundary into an absolute UTC millisecond timestamp when possible. | comment |
| parseRelativeTimeBoundary | function | 323 | Parses relative time boundary. | inferred |
| formatRelativeTimeBoundaryExpression | function | 337 | Formats relative time boundary expression. | inferred |

