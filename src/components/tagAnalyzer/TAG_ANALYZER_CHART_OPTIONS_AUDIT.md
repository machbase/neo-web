# TagAnalyzer Chart And Options Audit

## Reusable Audit Process

Use this process for future folder audits.

1. Delete old audit markdown files inside the target folders before starting.
2. List every file in the target folders after cleanup.
3. For every file, record the file responsibility.
4. If a file has multiple responsibilities, list each responsibility separately.
5. For every function, record the function name, parameters, return type, and responsibility.
6. If a function has multiple responsibilities, list each responsibility separately.
7. Keep the audit output in a new markdown file outside folders that were just cleaned.
8. Do not make behavior changes during the audit unless the user asks for implementation.

## Audit Scope

- Folder audited: `src/components/tagAnalyzer/chart`
- Folder audited: `src/components/tagAnalyzer/chart/options`
- Deleted old audit files:
- `src/components/tagAnalyzer/chart/FOLDER_AUDIT.md`
- `src/components/tagAnalyzer/chart/options/FOLDER_AUDIT.md`
- New audit file: `src/components/tagAnalyzer/TAG_ANALYZER_CHART_OPTIONS_AUDIT.md`

## Files Audited

- `chart/ChartBody.test.tsx`
- `chart/ChartBody.tsx`
- `chart/ChartFooter.scss`
- `chart/ChartFooter.test.tsx`
- `chart/ChartFooter.tsx`
- `chart/ChartHeader.scss`
- `chart/ChartShell.scss`
- `chart/ChartTimeSummary.tsx`
- `chart/PanelChartLoadContracts.ts`
- `chart/PanelChartStateLoader.test.ts`
- `chart/PanelChartStateLoader.ts`
- `chart/TimeSeriesChart.test.tsx`
- `chart/TimeSeriesChart.tsx`
- `chart/useChartRuntimeController.test.ts`
- `chart/useChartRuntimeController.ts`
- `chart/options/ChartAxisUtils.ts`
- `chart/options/ChartInteractionUtils.ts`
- `chart/options/ChartOptionBuilder.test.ts`
- `chart/options/ChartOptionBuilder.ts`
- `chart/options/ChartOptionConstants.ts`
- `chart/options/ChartOptionSections.ts`
- `chart/options/ChartOptionTypes.ts`
- `chart/options/ChartSeriesUtils.ts`
- `chart/options/OverlapChartOption.ts`

## File And Function Audit

### `chart/ChartBody.test.tsx`

File responsibilities:

- Mock chart, modal, popover, design-system, and icon dependencies for focused ChartBody tests.
- Verify right-click capture behavior.
- Verify highlight-mode selection routing.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `MockTimeSeriesChart` | `{ pChartHandlers }: { pChartHandlers: { onSelection: (aEvent: { min: number; max: number }) => void } }` | implicit JSX | Render a lightweight chart stub. Expose a button that triggers `onSelection`. |
| `FFTModal` mock | none | implicit JSX/null | Replace the real modal so ChartBody tests stay focused. |
| `Popover` mock | `{ children }: { children: unknown }` | implicit JSX | Render children without real popover behavior. |
| `Button` mock | `{ children, onClick }: { children?: unknown; onClick?: (() => void) \| undefined }` | implicit JSX | Render a minimal clickable button. |
| `Page` mock | `{ children }: { children?: unknown }` | implicit JSX | Render a minimal page container. |
| `VscChevronLeft` mock | none | implicit JSX | Replace the left icon with stable test output. |
| `VscChevronRight` mock | none | implicit JSX | Replace the right icon with stable test output. |
| `Close` mock | none | implicit JSX | Replace the close icon with stable test output. |
| `createChartBodyProps` | none | implicit object | Build the minimum ChartBody props needed by tests. Provide mock refs, state, handlers, and tag config. |

### `chart/ChartBody.tsx`

File responsibilities:

- Render the chart body shell around `TimeSeriesChart`.
- Manage drag-select popup state.
- Route brush selections to summary popup or highlight persistence.
- Render FFT modal from the selected range.
- Stop right-click mouse-down events before ECharts treats them as brush gestures.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `ChartBody` | chart refs, chart state, panel state, navigate state, chart handlers, shift handlers, tag set, FFT setter, drag-select callback, highlight callback | implicit JSX | Render chart navigation buttons and chart body. Own local drag-select popup state. Compose chart handlers with local selection handling. Render FFT modal and selection summary popover. |
| `handleSelection` | `event: PanelRangeChangeEvent` | implicit boolean | Reject incomplete ranges. In highlight mode, persist the selected highlight range. In drag-select mode, build selected-series summaries. Show an error when no data exists in the selected range. Open the summary popover and notify parent drag-select state. |
| `handleCloseDragSelect` | none | implicit void | Reset local drag-select state. Notify parent that drag selection and FFT opening are no longer active. |
| `handleChartMouseDownCapture` | `aEvent: MouseEvent<HTMLDivElement>` | implicit void | Ignore non-right-click events. Prevent and stop right-click propagation so panel context menu can open safely. |

### `chart/ChartFooter.scss`

File responsibilities:

- Style the footer toolbar container.
- Style range arrow groups and toolbar button groups.
- Position the footer toolbar over the chart footer lane.

Functions:

- None.

### `chart/ChartFooter.test.tsx`

File responsibilities:

- Mock date formatting and design-system button dependencies.
- Verify footer range labels.
- Verify navigator shift button wiring.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `Button` mock | `{ onClick }: { onClick: (() => void) \| undefined }` | implicit JSX | Render a minimal button and forward click handlers. |

### `chart/ChartFooter.tsx`

File responsibilities:

- Render navigator range start/end labels.
- Render navigator shift controls.
- Render zoom in, zoom out, and focus controls.
- Position toolbar controls using shared chart layout metrics.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `ChartFooter` | `{ pPanelSummary, pVisibleRange, pShiftHandlers, pZoomHandlers }` | implicit JSX | Calculate toolbar position from layout metrics. Render left/right navigator shift controls. Render visible range labels. Render zoom and focus buttons. |

### `chart/ChartHeader.scss`

File responsibilities:

- Style panel header layout.
- Style title, time summary, option controls, dividers, and hover states.

Functions:

- None.

### `chart/ChartShell.scss`

File responsibilities:

- Style the outer panel chart shell.
- Style chart body layout and side navigation button areas.
- Apply chart container sizing and overflow behavior.

Functions:

- None.

### `chart/ChartTimeSummary.tsx`

File responsibilities:

- Render panel time text.
- Render interval text when the panel is not in raw mode.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `ChartTimeSummary` | `{ pPresentationState }: { pPresentationState: Pick<PanelPresentationState, 'timeText' \| 'intervalText' \| 'isRaw'> }` | implicit JSX | Display the formatted time summary. Conditionally display interval text for calculated data mode. |

### `chart/PanelChartLoadContracts.ts`

File responsibilities:

- Define fetch request contracts.
- Define fetch result contracts.
- Define panel chart load state contracts.
- Define panel data limit state contracts.

Functions:

- None.

### `chart/PanelChartStateLoader.test.ts`

File responsibilities:

- Verify panel chart data fetching behavior.
- Verify raw and calculated fetch paths.
- Verify data limit analysis.
- Verify interval and time-range resolution.
- Verify empty/unresolved range behavior.
- Verify navigator and main panel load state behavior.

Functions:

- No named reusable functions. Anonymous Jest callbacks act as test cases and return `void` or `Promise<void>`.

### `chart/PanelChartStateLoader.ts`

File responsibilities:

- Load chart datasets for navigator and main panel views.
- Resolve fetch ranges, intervals, counts, and sampling.
- Coordinate raw/calculated per-series fetches.
- Convert repository rows into chart series items.
- Detect raw data overflow limits.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `loadNavigatorChartState` | `aRequest: PanelFetchRequest` | `Promise<ChartData>` | Fetch navigator datasets. Use navigator sampling behavior. Return an empty dataset set when nothing can be fetched. |
| `loadPanelChartState` | `aRequest: PanelFetchRequest` | `Promise<PanelChartLoadState>` | Fetch main panel datasets. Return chart data and interval metadata. Convert raw overflow into an overflow range. Return stable empty state when no data exists. |
| `isFetchableTimeRange` | `aTimeRange: TimeRangeMs \| undefined` | `aTimeRange is TimeRangeMs` | Validate that a range is concrete. Reject incomplete, zero-width, or reversed ranges. |
| `fetchPanelDatasets` | `FetchPanelDatasetsParams` | `Promise<FetchPanelDatasetsResult>` | Calculate fetch count. Resolve fetch time range. Resolve fetch interval. Fetch every series in parallel. Map fetched rows into chart series. Track raw data limit metadata. |
| `calculatePanelFetchCount` | `aLimit: number, aUseSampling: boolean, aIsRaw: boolean, aAxes: PanelAxes, aChartWidth: number` | `number` | Delegate panel fetch count calculation to the sampling helper. Pass raw/calculated tick settings explicitly. |
| `resolvePanelFetchTimeRange` | `aPanelTime: PanelTime, aBoardTime: InputTimeBounds, aTimeRange: TimeRangeMs \| undefined` | `TimeRangeMs` | Prefer an explicit time range. Otherwise resolve from panel time and board time. |
| `resolveRawFetchSampling` | `aUseSampling: boolean, aSamplingValue: number` | `RawFetchSampling` | Return disabled sampling when sampling is off. Return enabled sampling with the configured value when sampling is on. |
| `resolvePanelFetchInterval` | `aPanelData: PanelData, aAxes: PanelAxes, aTimeRange: TimeRangeMs, aChartWidth: number, aIsRaw: boolean, aIsNavigator = false` | `IntervalOption` | Use explicit panel interval type when present. Otherwise calculate interval from range, chart width, mode, and navigator context. |
| `analyzePanelDataLimit` | `aIsRaw: boolean, aRows: TagFetchRow[] \| undefined, aCount: number, aCurrentLimitEnd: number` | `PanelDataLimitState` | Ignore non-raw or incomplete-limit cases. Detect full raw fetches. Pick the safest limit end timestamp for overflow clamping. |
| `fetchPanelDatasetsFromRequest` | `aRequest: PanelFetchRequest, aUseSampling: boolean, aIncludeColor: boolean, aIsNavigator: boolean \| undefined` | `Promise<FetchPanelDatasetsResult \| undefined>` | Extract tag set from request. Short-circuit empty tag sets. Forward normalized request fields to `fetchPanelDatasets`. |
| `createEmptyFetchPanelDatasetsResult` | none | `FetchPanelDatasetsResult` | Return the shared empty fetch result shape. |

### `chart/TimeSeriesChart.test.tsx`

File responsibilities:

- Mock ECharts wrapper and chart option builders.
- Verify brush cursor synchronization.
- Verify brush zoom and selection routing.
- Verify imperative range synchronization.
- Verify legend hover patching.
- Verify highlight hit testing.
- Verify slider zoom payload handling.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `getEchartsInstance` mock | none | implicit mock instance | Provide the mocked ECharts instance to the component under test. |
| `getBuildChartOptionMock` | none | `jest.Mock` | Return the mocked structural chart option builder. |
| `getBuildChartSeriesOptionMock` | none | `jest.Mock` | Return the mocked series option builder. |
| `getExtractDataZoomRangeMock` | none | `jest.Mock` | Return the mocked zoom range extractor. |
| `value` mock | none | implicit DOMRect-like object | Provide a test bounding rect for highlight hit testing. |
| `toJSON` mock | none | implicit undefined | Satisfy the DOMRect-like test object shape. |

### `chart/TimeSeriesChart.tsx`

File responsibilities:

- Render the ECharts time-series panel.
- Build structural chart options.
- Synchronize ECharts brush, dataZoom, legend hover, and click interactions with React state.
- Expose an imperative chart handle to parent controllers.
- Keep live zoom state stable without rebuilding the full option tree.
- Detect saved-highlight hit positions.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `isLegendHoverPayload` | `aPayload: ChartHighlightPayload \| undefined` | `aPayload is ChartHighlightPayload & { excludeSeriesId: string[] }` | Detect ECharts legend hover payloads. Separate legend hover from ordinary series highlight events. |
| `getPrimaryDataZoomState` | `aDataZoomState: EChartDataZoomEventPayload \| EChartDataZoomOptionStateItem \| undefined` | `EChartDataZoomEventItem \| EChartDataZoomOptionStateItem \| undefined` | Normalize direct and batched dataZoom state. Return the first zoom item. |
| `hasExplicitDataZoomRange` | `aDataZoomState: EChartDataZoomEventPayload \| EChartDataZoomOptionStateItem \| undefined` | `boolean` | Check whether zoom state has enough absolute or percentage values to reconstruct a range. |
| `TimeSeriesChart` | `{ pChartRefs, pChartState, pPanelState, pNavigateState, pChartHandlers }` | implicit JSX/null | Render ReactECharts. Own local visible-series and hover refs. Build chart options. Wire ECharts events. Expose chart handle. Synchronize imperative chart state. |
| `getChartInstance` | none | `ChartInstance \| undefined` | Read the mounted ECharts instance. Hide third-party ref shape from the rest of the component. |
| `getHighlightIndexAtClientPosition` | `aClientX: number, aClientY: number` | `number \| undefined` | Convert viewport coordinates to chart time. Check whether the position is inside a saved highlight. Return the matched highlight index. |
| `getLivePanelRange` | `aInstance: ChartInstance \| undefined` | `TimeRangeMs \| undefined` | Read live ECharts dataZoom state. Convert it into a panel time range when possible. |
| `syncBrushInteraction` | `aInstance: ChartInstance \| undefined` | implicit void | Enable line brush for drag-select or drag-zoom modes. Clear brush areas and disable brush cursor when inactive. |
| `syncPanelRange` | `aRange: TimeRangeMs, aInstance: ChartInstance \| undefined, aForce = false` | implicit void | Avoid duplicate range dispatches. Prefer live ECharts range when available. Dispatch dataZoom actions for external panel range changes. |
| `setPanelRange` | `aRange` | implicit void | Expose panel range synchronization through the parent chart handle. |
| `getVisibleSeries` | none | implicit `PanelVisibleSeriesItem[]` | Expose current legend visibility as a panel-friendly list. |
| `sOption` memo callback | none | implicit `PanelChartOption` | Build the structural chart option from chart data, axes, display, legend state, and highlights. |
| `applyLegendHoverState` | `aHoveredLegendSeries: string \| undefined, aForce = false` | implicit void | Validate hovered series. Avoid duplicate hover patches. Apply hover-only series styling with `setOption`. |
| `sOnEvents` memo callback | none | implicit event map | Build the ECharts event handler map. Keep event handler identity stable between renders. |
| `datazoom` event handler | `aParams: EChartDataZoomEventPayload` | implicit void | Convert slider zoom into a concrete range. Notify navigator extremes only when range changed. Prefer live drag payload over stale option state. |
| `brushEnd` event handler | `aParams: EChartBrushPayload` | implicit void | Extract brush range. Route selection mode to selection handler. Route drag-zoom mode to panel extremes handler. |
| `legendselectchanged` event handler | `aParams: ChartLegendChangePayload` | implicit void | Store visible series map in ref and state. |
| `highlight` event handler | `aParams: ChartHighlightPayload` | implicit void | Apply legend hover styling for legend-originated highlight events. |
| `downplay` event handler | `aParams: ChartHighlightPayload` | implicit void | Clear legend hover styling for legend-originated downplay events. |
| `click` event handler | `aParams: ChartClickPayload` | implicit void | Open highlight rename UI only for clicks on highlight label series. Resolve fallback click position from chart rect. |
| `handleChartReady` | `aInstance: ChartInstance` | implicit void | Store the ready chart instance. Reapply brush mode, panel range, and legend hover state after mount or remount. |

### `chart/useChartRuntimeController.test.ts`

File responsibilities:

- Verify shared chart runtime controller range behavior.
- Verify local range moves avoid unnecessary fetches.
- Verify zoom and post-zoom pan fetch behavior.
- Verify loaded navigator and panel range behavior.

Functions:

- No named reusable functions. Anonymous render-hook and Jest callbacks act as test cases and return `void` or `Promise<void>`.

### `chart/useChartRuntimeController.ts`

File responsibilities:

- Own shared chart navigation state for board and preview charts.
- Coordinate panel data reloads.
- Decide when range changes require fresh data.
- Keep navigator and panel range state synchronized.
- Notify outer shell when panel ranges are applied.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `createInitialPanelNavigateState` | none | `PanelNavigateState` | Return the empty navigate-state shape. Initialize chart data, navigator data, panel range, navigator range, range option, and overflow range. |
| `buildNavigateStatePatchFromPanelLoad` | `aResult: PanelChartLoadState, aPanelRange: TimeRangeMs \| undefined` | `Partial<PanelNavigateState>` | Convert loaded chart state to navigate-state fields. Apply panel range when provided. Apply overflow range when returned. Reset pre-overflow range when no overflow exists. |
| `useChartRuntimeController` | `{ panelInfo, boardTime, areaChartRef, chartRef, rollupTableList, isRaw, onPanelRangeApplied }` | implicit controller object | Manage navigate state and refs. Provide range handlers. Provide data refresh handlers. Share controller logic between board and preview chart shells. |
| `updateNavigateState` | `aPatch: Partial<PanelNavigateState>` | implicit void | Merge patch into React state. Keep imperative navigate-state ref synchronized. |
| `notifyPanelRangeApplied` | `aPanelRange: TimeRangeMs` | implicit void | Notify parent callback with applied panel range, navigator range, and raw mode. |
| `refreshPanelData` | `aTimeRange: TimeRangeMs \| undefined, aRaw = isRaw, aDataRange: TimeRangeMs \| undefined` | `Promise<PanelRefreshResult>` | Build load request. Fetch panel chart state. Ignore stale responses. Store loaded data range. Update navigate state. Apply overflow clamp to live chart when needed. |
| `applyPanelAndNavigatorRanges` | `aPanelRange: TimeRangeMs, aNavigatorRange: TimeRangeMs, aRaw = isRaw` | implicit `Promise<void>` | Skip unchanged ranges. Detect navigator range changes. Detect visible-range zoom. Detect pan outside loaded data. Update range state. Fetch data when needed. Preserve navigator overview data for zoom-scoped fetches. Notify parent after applying final range. |
| `handleNavigatorRangeChange` | `aEvent: PanelRangeChangeEvent` | implicit void | Convert navigator event to a range. Store latest navigator range. |
| `handlePanelRangeChange` | `aEvent: PanelRangeChangeEvent` | implicit `Promise<void>` | Ignore incomplete range events. Convert event to panel range. Skip one fetch after overflow clamp. Apply panel and navigator ranges through shared flow. |
| `setExtremes` | `aPanelRange: TimeRangeMs, aNavigatorRange: TimeRangeMs \| undefined` | implicit void | Route external range changes through shared range application. Reuse current navigator range when not supplied. |
| `applyLoadedRanges` | `aPanelRange: TimeRangeMs, aNavigatorRange: TimeRangeMs = aPanelRange` | implicit `Promise<void>` | Set initial or refreshed panel/navigator ranges. Fetch data for the loaded range. Apply final clamped range after fetch. |

### `chart/options/ChartAxisUtils.ts`

File responsibilities:

- Build ECharts x-axis options for main chart and navigator.
- Build ECharts y-axis options for left, right, and navigator axes.
- Resolve auto and manual y-axis ranges.
- Share y-axis range logic with overlap charts.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `buildChartXAxisOption` | `aNavigatorRange: TimeRangeMs, aDisplay: PanelDisplay, aAxes: PanelAxes` | implicit array | Build main time x-axis. Build hidden navigator x-axis. Keep both axes locked to navigator range. |
| x-axis `formatter` | `aValue: number` | implicit string | Format main x-axis labels against navigator range. |
| `buildChartYAxisOption` | `aAxes: PanelAxes, aChartData: ChartSeriesItem[], aIsRaw: boolean, aUseNormalize: boolean` | `PanelYAxisOptions` | Resolve left-axis range. Resolve right-axis range. Apply raw/manual/normalized range rules. Return visible panel axes and hidden navigator axis. |
| `resolveOverlapYAxisRange` | `aChartData: ChartSeriesItem[], aZeroBase: boolean` | `ResolvedYAxisRange` | Reuse panel y-axis scanning with neutral overlap axes. Return shared overlap min/max. |
| `getSeriesValueRange` | `aSeriesData: NonEmptyChartSeriesData` | `[number, number]` | Scan one non-empty series for min and max y-values. |
| `getRoundedAxisStep` | `aValue: number` | `number` | Pick a display-friendly tick step. Use 1, 2, 5, or 10 times a power of ten. |
| `roundAxisMaximum` | `aValue: number` | `number` | Expand max value to a readable ceiling. Keep non-finite or zero values unchanged. |
| `updateAxisBounds` | `aBounds: number[], aSeriesData: NonEmptyChartSeriesData, aZeroBase: boolean` | `void` | Extend running min/max bounds. Include zero when zero-base is enabled. Mutate the bounds array. |
| `roundAxisBounds` | `aBounds: number[]` | `void` | Round min down. Round max up and add headroom. Mutate the bounds array. |
| `getYAxisValues` | `aChartData: ChartSeriesItem[], aAxes: PanelAxes` | `YAxisValueMap` | Split series by y-axis. Gather left and right bounds. Apply zero-base and rounding rules. |
| `resolveAxisRange` | `aManualRange: { min: number; max: number }, aDefaultMin: number \| undefined, aDefaultMax: number \| undefined` | `ResolvedYAxisRange` | Use computed defaults when manual range is `[0, 0]`. Otherwise return manual min/max. |

### `chart/options/ChartInteractionUtils.ts`

File responsibilities:

- Normalize ECharts dataZoom payloads.
- Convert zoom payloads into absolute time ranges.
- Convert brush payloads into selected time ranges.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `extractDataZoomRange` | `aParams: DataZoomRangeInput, aCurrentRange: TimeRangeMs, aAxisRange: TimeRangeMs = aCurrentRange` | `TimeRangeMs` | Prefer explicit zoom range. Convert percentage zoom values against axis range. Fall back to current range when payload is incomplete. |
| `getPrimaryDataZoomItem` | `aZoomData: DataZoomRangeInput` | `DataZoomRangeItem \| undefined` | Return first batched zoom item or direct zoom item. |
| `getExplicitDataZoomRange` | `aZoomData: DataZoomRangeItem \| undefined` | `TimeRangeMs \| undefined` | Read explicit start/end values. Return absolute range only when both values exist. |
| `getZoomBoundaryValue` | `aValue: number \| string \| Date \| undefined` | `number \| string \| Date \| undefined` | Return the zoom boundary value unchanged. Centralize boundary normalization for future payload shapes. |
| `extractBrushRange` | `aParams: EChartBrushPayload` | `TimeRangeMs \| undefined` | Read first direct or batched brush range. Floor start and ceil end. Return undefined for empty payloads. |

### `chart/options/ChartOptionBuilder.test.ts`

File responsibilities:

- Verify panel chart option layout.
- Verify tooltip filtering.
- Verify navigator lane setup.
- Verify legend hover styling.
- Verify y-axis range behavior.
- Verify highlight overlay and label series.
- Verify overlap chart y-axis behavior.
- Verify zoom and brush extraction helpers.

Functions:

- No named reusable functions. Inline `filter` and `find` callbacks support assertions only.

### `chart/options/ChartOptionBuilder.ts`

File responsibilities:

- Compose the full ECharts option for the panel chart.
- Delegate axis, grid, legend, zoom, series, tooltip, toolbox, title, and no-data sections.
- Format panel chart tooltips.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `buildChartOption` | `aChartData: ChartSeriesItem[], aNavigatorRange: TimeRangeMs, aAxes: PanelAxes, aDisplay: PanelDisplay, aIsRaw: boolean, aUseNormalize: boolean, aVisibleSeries: Record<string, boolean>, aNavigatorChartData: ChartSeriesItem[] = aChartData, aHoveredLegendSeries?: string, aHighlights: PanelHighlight[] = []` | `PanelChartOption` | Compose the full chart option. Keep structural option construction in one place. Pass chart data to section builders explicitly. |
| `buildChartTooltipOption` | none | implicit object | Build tooltip config for the panel chart. Add cross axis pointer. Provide formatter for main-series rows. |
| tooltip `formatter` | `aParams: unknown` | implicit string | Normalize tooltip params into an array. Ignore navigator series. Format time. Render HTML rows for main series values. |
| `formatTooltipTime` | `aValue: number` | `string` | Apply timezone offset. Format ISO timestamp for tooltip display. Preserve fractional millisecond suffix when present. |

### `chart/options/ChartOptionConstants.ts`

File responsibilities:

- Define shared chart dimensions.
- Define shared chart colors and opacity constants.
- Define shared ECharts style fragments.
- Calculate reusable layout metrics.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `getChartLayoutMetrics` | `aShowLegend: boolean` | `PanelChartLayoutMetrics` | Calculate main grid top. Calculate main grid height. Calculate toolbar lane position. Calculate slider lane position. |

### `chart/options/ChartOptionSections.ts`

File responsibilities:

- Define static option sections for panel chart base, brush, hidden toolbox, hidden title, and no-data.
- Build grid, legend, and dataZoom option sections.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `buildPanelChartGridOption` | `aDisplay: PanelDisplay` | implicit array | Build two-grid layout for main chart and navigator. Account for legend height through layout metrics. |
| `buildPanelChartLegendOption` | `aChartData: ChartSeriesItem[], aDisplay: PanelDisplay, aVisibleSeries: Record<string, boolean>` | implicit object | Build legend display settings. Build selected-series map. Keep legend option separate from top-level composer. |
| `buildPanelChartDataZoomOption` | `aDisplay: PanelDisplay` | implicit array | Build disabled/enabled inside zoom option. Build slider option. Keep slider visuals and behavior centralized. |

### `chart/options/ChartOptionTypes.ts`

File responsibilities:

- Define ECharts dataZoom payload types.
- Define ECharts brush payload types.
- Define tooltip value and parameter types.
- Define threshold, y-axis, series, layout, and full chart option types.

Functions:

- None.

### `chart/options/ChartSeriesUtils.ts`

File responsibilities:

- Build legend selected state.
- Build visible-series lists for panel UI.
- Build all ECharts series for main chart, navigator chart, highlight overlays, highlight labels, and threshold lines.
- Apply legend-hover dimming behavior.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `buildChartLegendSelectedMap` | `aChartData: ChartSeriesItem[], aVisibleSeries: Record<string, boolean>` | `Record<string, boolean>` | Convert current visible-series map into ECharts legend selected state. Default missing series to visible. |
| `buildDefaultVisibleSeriesMap` | `aChartData: ChartSeriesItem[]` | `Record<string, boolean>` | Build initial visibility map. Enable each unique series name once. |
| `buildVisibleSeriesList` | `aChartData: ChartSeriesItem[], aVisibleSeries: Record<string, boolean>` | `PanelVisibleSeriesItem[]` | Convert chart data into a UI-friendly visibility list. Default missing series to visible. |
| `buildChartSeriesOption` | `aChartData: ChartSeriesItem[], aDisplay: PanelDisplay, aAxes: PanelAxes, aNavigatorChartData: ChartSeriesItem[] = aChartData, aHoveredLegendSeries?: string, aHighlights: PanelHighlight[] = [], aNavigatorRange?: TimeRangeMs, aIsRaw = false, aUseNormalize = false` | `Pick<PanelChartOption, 'series'>` | Combine highlight overlay series. Combine highlight label series. Combine main chart series. Combine navigator series. |
| `buildHighlightOverlaySeries` | `aHighlights: PanelHighlight[], aNavigatorRange: TimeRangeMs \| undefined` | `PanelSeriesOptions` | Filter invalid highlight ranges. Build markArea shading. Return no series when no valid highlight or navigator range exists. |
| highlight area `map` callback | `aHighlight` | implicit tuple | Convert one highlight into a markArea start/end tuple. |
| `buildHighlightLabelSeries` | `aHighlights: PanelHighlight[], aChartData: ChartSeriesItem[], aAxes: PanelAxes, aIsRaw: boolean, aUseNormalize: boolean` | `PanelSeriesOptions` | Resolve primary y-axis range. Calculate label y-position. Build clickable scatter labels for valid highlights. |
| highlight label `map` callback | `aHighlight, aIndex` | implicit object | Convert one highlight into a label point with text, center x-position, y-position, and highlight index. |
| `buildThresholdLine` | `aUseFlag: boolean, aColor: string, aValue: number` | `ThresholdLineOption \| undefined` | Return undefined when disabled. Build a silent ECharts threshold mark-line when enabled. |
| `buildMainSeries` | `aChartData: ChartSeriesItem[], aDisplay: PanelDisplay, aAxes: PanelAxes, aHoveredLegendSeries?: string` | `PanelSeriesOptions` | Build main line series. Apply point, fill, stroke, large-data, and sampling options. Attach left/right threshold lines. Apply legend-hover emphasis and dimming. |
| `buildNavigatorSeries` | `aChartData: ChartSeriesItem[], aHoveredLegendSeries?: string` | `PanelSeriesOptions` | Build lower navigator line series. Disable symbols, tooltip, and interaction. Apply legend-hover dimming. |

### `chart/options/OverlapChartOption.ts`

File responsibilities:

- Build ECharts option for the overlap comparison modal.
- Apply overlap-specific colors, grid, legend, axes, tooltip, and series.
- Reuse shared y-axis range calculation.

Functions:

| Function | Params | Return | Responsibilities |
| --- | --- | --- | --- |
| `buildOverlapChartOption` | `aChartData: ChartSeriesItem[], aStartTimeList: number[], aZeroBase: boolean` | `EChartsOption` | Resolve shared overlap y-axis range. Build single-grid overlap option. Build overlap line series. Disable toolbox. |
| x-axis `formatter` | `aValue: number` | implicit string | Format overlap x-axis value as UTC `HH:mm:ss`. |
| `buildOverlapTooltipOption` | `aChartData: ChartSeriesItem[], aStartTimeList: number[]` | implicit object | Build tooltip base for overlap chart. Attach overlap tooltip formatter. |
| overlap tooltip `formatter` | `aParams: unknown` | implicit string | Normalize tooltip params. Rebuild original timestamps using series start times and timezone offset. Render HTML rows for overlap series values. |

## Planned Follow-Up Changes

- Consider making implicit return types explicit for exported option builders and React components.
- Consider moving tooltip HTML string builders into smaller named helpers so formatter responsibilities are easier to test.
- Consider replacing in-place mutation helpers in axis utilities with return-value helpers if that makes the data flow clearer.
- Consider extracting TimeSeriesChart event handlers into named helpers if the component continues to grow.

## Exhaustive Inline Callback Audit

This section records inline callbacks that are not primary named helpers but are still functions in the audited files.

### `chart/ChartBody.test.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 21 | `jest.mock` callback for `./TimeSeriesChart` | none | implicit | Configure the TimeSeriesChart mock module. |
| 36 | `select-range` click callback | none | implicit | Trigger the mocked chart selection event with fixed range `120` to `180`. |
| 46 | `jest.mock` callback for `../modal/FFTModal` | none | implicit | Configure the FFTModal mock module. |
| 50 | `jest.mock` callback for `Popover` | none | implicit | Configure the Popover mock module. |
| 54 | `jest.mock` callback for design-system components | none | implicit | Configure Button, Page, and Toast mocks. |
| 74 | `Page.DpRow` mock | `{ children }: { children?: unknown }` | implicit JSX | Render a minimal row wrapper. |
| 75 | `Page.ContentDesc` mock | `{ children }: { children?: unknown }` | implicit JSX | Render a minimal content description wrapper. |
| 78 | `Page.ContentText` mock | `{ pContent }: { pContent: string \| number }` | implicit JSX | Render supplied content text. |
| 79 | `Page.Space` mock | none | implicit JSX | Render a minimal spacer. |
| 90 | `jest.mock` callback for icons | none | implicit | Configure icon mocks. |
| 108 | `getVisibleSeries` mock callback | none | implicit array | Return an empty visible-series list. |
| 109 | `getHighlightIndexAtClientPosition` mock callback | none | implicit undefined | Return no matching highlight. |
| 152 | `describe` callback | none | implicit | Group ChartBody tests. |
| 153 | `beforeEach` callback | none | implicit | Clear mocks before each ChartBody test. |
| 157 | `it` callback | none | implicit | Verify right-button mouse down does not reach chart surface. |
| 167 | `it` callback | none | implicit | Verify left-button mouse down reaches chart surface. |
| 177 | `it` callback | none | implicit | Verify highlight mode routes selection into highlight persistence. |

### `chart/ChartBody.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 74 | `useEffect` callback | none | implicit void | Reset drag-select state when drag-select mode is turned off. |
| 235 | `seriesSummaries.map` callback | `aItem, aIndex` | implicit JSX | Render one selected-series summary row. Use name plus index as key. |

### `chart/ChartFooter.test.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 5 | `jest.mock` callback for date helper | none | implicit | Configure date formatter mock. |
| 6 | `changeUtcToText` mock callback | `aValue: number` | implicit string | Return deterministic text for a timestamp. |
| 9 | `jest.mock` callback for design-system components | none | implicit | Configure Button mock. |
| 21 | `Button.Group` mock | `{ children }: { children: React.ReactNode }` | implicit JSX | Render grouped button children. |
| 25 | `jest.mock` callback for chart constants | none | implicit | Configure chart layout constants mock. |
| 27 | `getChartLayoutMetrics` mock callback | none | implicit object | Return deterministic toolbar layout metrics. |
| 33 | `describe` callback | none | implicit | Group ChartFooter tests. |
| 34 | `it` callback | none | implicit | Verify range labels render beside navigator buttons. |
| 44 | `it` callback | none | implicit | Verify footer move buttons call provided handlers. |

### `chart/ChartFooter.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 61 | zoom-in 0.4 click callback | none | implicit void | Call `pZoomHandlers.onZoomIn(0.4)`. |
| 69 | zoom-in 0.2 click callback | none | implicit void | Call `pZoomHandlers.onZoomIn(0.2)`. |
| 85 | zoom-out 0.2 click callback | none | implicit void | Call `pZoomHandlers.onZoomOut(0.2)`. |
| 93 | zoom-out 0.4 click callback | none | implicit void | Call `pZoomHandlers.onZoomOut(0.4)`. |

### `chart/PanelChartStateLoader.test.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 31 | `jest.mock` callback for utils | none | implicit | Configure utility module mock while preserving actual exports. |
| 62 | `describe` callback | none | implicit | Group fetch utility tests. |
| 63 | `beforeEach` callback | none | implicit | Clear and reset mocks before each fetch utility test. |
| 70 | `describe` callback | none | implicit | Group `mapRowsToChartData` tests. |
| 71 | `it` callback | none | implicit | Verify empty rows map to an empty chart data array. |
| 77 | `it` callback | none | implicit | Verify raw row tuples map to `[time, value]` chart points. |
| 91 | `describe` callback | none | implicit | Group `buildChartSeriesItem` tests. |
| 99 | `it` callback | none | implicit | Verify chart series item includes mapped rows and color. |
| 123 | `it` callback | none | implicit | Verify color can be omitted from chart series item. |
| 134 | `describe` callback | none | implicit | Group `analyzePanelDataLimit` tests. |
| 135 | `it` callback | none | implicit | Verify non-limit cases return no data limit. |
| 147 | `it` callback | none | implicit | Verify matching limit tail uses second-to-last point. |
| 166 | `it` callback | none | implicit | Verify changed tail uses last point. |
| 185 | `it` callback | none | implicit | Verify single-row raw limit fallback. |
| 194 | `describe` callback | none | implicit | Group `resolvePanelFetchInterval` tests. |
| 225 | `it` callback | none | implicit | Verify explicit interval type is respected. |
| 242 | `it` callback | none | implicit | Verify calculated interval fallback. |
| 260 | `describe` callback | none | implicit | Group `resolvePanelFetchTimeRange` tests. |
| 261 | `it` callback | none | implicit | Verify panel default range fallback for unresolved board time. |
| 279 | `describe` callback | none | implicit | Group `isFetchableTimeRange` tests. |
| 280 | `it` callback | none | implicit | Verify unresolved or zero-width ranges are rejected. |
| 288 | `it` callback | none | implicit | Verify concrete forward ranges are accepted. |
| 293 | `describe` callback | none | implicit | Group `fetchPanelDatasets` tests. |
| 294 | `it` callback | none | implicit Promise | Verify calculated datasets are built for selected tags. |
| 395 | `it` callback | none | implicit Promise | Verify multi-series fetches start in parallel. |
| 403 | `Promise` callback | `aResolve` | implicit void | Capture resolver for the first mocked fetch. |
| 406 | `Promise` callback | `aResolve` | implicit void | Capture resolver for the second mocked fetch. |
| 411 | `mockImplementationOnce` callback | none | implicit Promise | Return first pending fetch promise. |
| 412 | `mockImplementationOnce` callback | none | implicit Promise | Return second pending fetch promise. |
| 477 | `it` callback | none | implicit Promise | Verify sampled raw datasets and data limit metadata. |
| 548 | `it` callback | none | implicit Promise | Verify unresolved ranges skip repository fetches. |
| 584 | `describe` callback | none | implicit | Group `fetchCalculatedSeriesRows` tests. |
| 585 | `it` callback | none | implicit Promise | Verify calculated single-series request uses calculation endpoint. |
| 621 | `it` callback | none | implicit Promise | Verify unresolved calculated range returns empty response. |
| 653 | `describe` callback | none | implicit | Group `fetchRawSeriesRows` tests. |
| 654 | `it` callback | none | implicit Promise | Verify raw single-series request uses raw endpoint. |
| 691 | `it` callback | none | implicit Promise | Verify unresolved raw range returns empty response. |
| 723 | `describe` callback | none | implicit | Group navigator chart load tests. |
| 724 | `it` callback | none | implicit Promise | Verify no tags produce empty navigator datasets. |
| 744 | `it` callback | none | implicit Promise | Verify navigator reuses fetch pipeline without color metadata. |
| 800 | `describe` callback | none | implicit | Group panel chart load tests. |
| 801 | `it` callback | none | implicit Promise | Verify no tags produce stable empty panel chart state. |
| 822 | `it` callback | none | implicit Promise | Verify raw limit returns chart data, interval, and overflow range. |
| 884 | `it` callback | none | implicit Promise | Verify unresolved requested range returns empty chart state. |

### `chart/PanelChartStateLoader.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 167 | raw `seriesConfigSet.map` callback | `aSeriesConfig` | implicit Promise object | Fetch one raw series and pair it with its series config. |
| 179 | calculated `seriesConfigSet.map` callback | `aSeriesConfig` | implicit Promise object | Fetch one calculated series and pair it with its series config. |

### `chart/TimeSeriesChart.test.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 15 | `jest.mock` callback for `echarts-for-react` | none | implicit | Configure ReactECharts mock. |
| 18 | `React.forwardRef` callback | `props: MockReactEChartsProps, ref` | implicit JSX | Render mock chart and expose imperative ECharts instance. |
| 24 | `useImperativeHandle` callback | none | implicit object | Return mocked wrapper handle. |
| 30 | `useEffect` callback | none | implicit void | Call `onChartReady` with the mock chart instance. |
| 38 | `jest.mock` callback for option builder | none | implicit | Configure chart option builder mock. |
| 39 | `buildChartOption` mock callback | `aChartData, aNavigatorRange` | implicit object | Return deterministic option key from range and data length. |
| 44 | `jest.mock` callback for series utils | none | implicit | Configure series utility mocks. |
| 46 | `buildChartSeriesOption` mock callback | `_aChartData, _aDisplay, _aAxes, _aNavigatorChartData, aHoveredLegendSeries` | implicit object | Return deterministic hover series patch. |
| 50 | `buildDefaultVisibleSeriesMap` mock callback | none | implicit object | Return deterministic visible-series map. |
| 51 | `buildVisibleSeriesList` mock callback | none | implicit array | Return deterministic visible-series list. |
| 54 | `jest.mock` callback for interaction utils | none | implicit | Configure brush and zoom extractor mocks. |
| 55 | `extractBrushRange` mock callback | `aParams` | implicit range/undefined | Extract direct or batched brush range for tests. |
| 64 | `extractDataZoomRange` mock callback | none | implicit range | Return deterministic zoom range. |
| 100 | `describe` callback | none | implicit | Group TimeSeriesChart tests. |
| 101 | `beforeEach` callback | none | implicit | Clear mocks and reset latest chart props. |
| 106 | `it` callback | none | implicit Promise | Verify brush cursor reapplies after option-changing rerender. |
| 110 | `waitFor` callback | none | implicit | Wait for initial brush cursor dispatch. |
| 120 | `dispatchAction.filter` callback | `[aAction]` | implicit boolean | Count brush cursor dispatch actions. |
| 128 | `waitFor` callback | none | implicit | Wait for another brush cursor dispatch after rerender. |
| 130 | `dispatchAction.filter` callback | `[aAction]` | implicit boolean | Count brush cursor dispatch actions after rerender. |
| 137 | `it` callback | none | implicit | Verify brush zoom commits only on brush end. |
| 167 | `it` callback | none | implicit | Verify highlight mode routes brush selection to selection handler. |
| 196 | `it` callback | none | implicit Promise | Verify chart handle exposes highlight hit testing. |
| 211 | `waitFor` callback | none | implicit | Wait for chart handle to be assigned. |
| 217 | `getBoundingClientRect.value` callback | none | implicit object | Return deterministic chart rectangle. |
| 226 | `toJSON` callback | none | implicit undefined | Complete DOMRect-like test object. |
| 238 | `it` callback | none | implicit Promise | Verify external range changes sync imperatively. |
| 245 | `waitFor` callback | none | implicit | Wait for chart option builder call. |
| 251 | `dispatchAction.filter` callback | `[aAction]` | implicit boolean | Count dataZoom dispatch actions. |
| 273 | `waitFor` callback | none | implicit | Wait for new dataZoom action. |
| 275 | `dispatchAction.filter` callback | `[aAction]` | implicit boolean | Count dataZoom dispatch actions after rerender. |
| 289 | `it` callback | none | implicit Promise | Verify equal chart config objects do not rebuild option. |
| 295 | `waitFor` callback | none | implicit | Wait for initial option build. |
| 324 | `it` callback | none | implicit Promise | Verify legend hover styling applies imperatively. |
| 330 | `waitFor` callback | none | implicit | Wait for initial option build. |
| 336 | `act` callback | none | implicit void | Dispatch ordinary highlight event. |
| 346 | `act` callback | none | implicit void | Dispatch legend hover highlight event. |
| 353 | `waitFor` callback | none | implicit | Wait for hover series patch. |
| 362 | `act` callback | none | implicit void | Dispatch legend hover downplay event. |
| 369 | `waitFor` callback | none | implicit | Wait for hover clear patch. |
| 379 | `it` callback | none | implicit | Verify live slider drag payload wins over stale absolute zoom state. |
| 384 | `mockImplementation` callback | `aPayload` | implicit range | Return different ranges for percentage and absolute zoom payloads. |

### `chart/TimeSeriesChart.tsx`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 259 | `highlights.findIndex` callback | `aHighlight` | implicit boolean | Match a highlight whose time range contains the converted click time. |
| 290 | `useEffect` callback | none | implicit void | Merge default visible-series state with current legend state after chart data changes. |
| 300 | `useEffect` callback | none | implicit void | Keep last zoom range ref aligned with panel range state. |
| 395 | `useEffect` callback | none | implicit void | Expose `setPanelRange`, `getVisibleSeries`, and highlight hit testing through chart ref. |
| 453 | chart data `map` callback | `aSeries` | implicit string | Build set of known series names for hover validation. |
| 498 | `useEffect` callback | none | implicit void | Reapply brush, range, and hover state after structural option changes. |
| 507 | `useEffect` callback | none | implicit void | Sync panel range changes into the live chart instance. |
| 662 | ReactECharts `ref` callback | `aChart` | implicit void | Store ReactECharts wrapper ref. |
| 667 | `onChartReady` callback | `aInstance` | implicit void | Cast and forward ready ECharts instance to `handleChartReady`. |

### `chart/options/ChartAxisUtils.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 208 | `aChartData.some` callback | `aItem` | implicit boolean | Check whether any series uses the right y-axis. |
| 274 | `aSeriesData.reduce` callback | `aResult, aCurrent` | implicit tuple | Accumulate min and max y-values for one series. |
| 387 | `aChartData.forEach` callback | `aItem` | implicit void | Add one series to left or right y-axis bounds. |

### `chart/options/ChartOptionBuilder.test.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 17 | `describe` callback | none | implicit | Group panel chart option utility tests. |
| 18 | `describe` callback | none | implicit | Group `buildChartOption` tests. |
| 19 | `it` callback | none | implicit | Verify main plot stays above slider with legend. |
| 30 | `it` callback | none | implicit | Verify main plot stays above slider without legend. |
| 41 | `it` callback | none | implicit | Verify live zoom window is not stored in structural option. |
| 52 | `it` callback | none | implicit | Verify toolbar lane is between plot and slider. |
| 60 | `it` callback | none | implicit | Verify main series mirror into navigator lane. |
| 75 | `series.some` callback | `aSeries` | implicit boolean | Find whether a navigator series exists. |
| 85 | `it` callback | none | implicit | Verify tooltip ignores navigator mirror series. |
| 114 | `it` callback | none | implicit | Verify navigator lane does not show hover markers. |
| 129 | `series.filter` callback | `aSeries` | implicit boolean | Select navigator series. |
| 130 | `navigatorSeries.every` callback | `aSeries` | implicit boolean | Verify navigator tooltips are disabled. |
| 134 | `it` callback | none | implicit | Verify built-in legend hover linking is off. |
| 143 | `series.every` callback | `aSeries` | implicit boolean | Verify all series disable `legendHoverLink`. |
| 146 | `it` callback | none | implicit | Verify direct line hover does not isolate series. |
| 153 | `series.filter` callback | `aSeries` | implicit boolean | Select main series. |
| 156 | `mainSeries.every` callback | `aSeries` | implicit boolean | Verify main series have no focus emphasis. |
| 159 | `it` callback | none | implicit | Verify non-hovered series fade during legend hover. |
| 206 | `series.find` callback | `aSeries` | implicit boolean | Find hovered main series. |
| 207 | `series.find` callback | `aSeries` | implicit boolean | Find dimmed main series. |
| 209 | `series.find` callback | `aSeries` | implicit boolean | Find hovered navigator series. |
| 212 | `series.find` callback | `aSeries` | implicit boolean | Find dimmed navigator series. |
| 226 | `it` callback | none | implicit | Verify hidden regular points still keep hover marker size. |
| 252 | `series.find` callback | `aSeries` | implicit boolean | Find main series for marker assertion. |
| 258 | `it` callback | none | implicit | Verify zero-base includes zero for positive-only data. |
| 287 | `it` callback | none | implicit | Verify manual y-axis max is preserved. |
| 314 | `it` callback | none | implicit | Verify saved highlights render overlay and label series. |
| 354 | `series.find` callback | `aSeries` | implicit boolean | Find highlight overlay series. |
| 355 | `series.find` callback | `aSeries` | implicit boolean | Find highlight label series. |
| 367 | `it` callback | none | implicit | Verify zero-base includes zero above negative-only data. |
| 397 | `describe` callback | none | implicit | Group overlap chart option tests. |
| 398 | `it` callback | none | implicit | Verify overlap chart max uses clean rounded ceiling. |
| 418 | `describe` callback | none | implicit | Group `extractDataZoomRange` tests. |
| 419 | `it` callback | none | implicit | Verify explicit zoom axis values win. |
| 436 | `it` callback | none | implicit | Verify percentage zoom payload conversion. |
| 453 | `it` callback | none | implicit | Verify incomplete zoom payload falls back to current range. |
| 468 | `describe` callback | none | implicit | Group `extractBrushRange` tests. |
| 469 | `it` callback | none | implicit | Verify direct brush coordinate range extraction. |
| 489 | `it` callback | none | implicit | Verify batched brush range extraction. |
| 513 | `it` callback | none | implicit | Verify unusable brush payload returns undefined. |

### `chart/options/ChartOptionBuilder.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 96 | `sItems.filter` callback | `aItem` | implicit boolean | Keep only main chart series tooltip params. |
| 112 | `sMainSeriesItems.map` callback | `aItem` | implicit string | Render one tooltip HTML row for a main series value. |

### `chart/options/ChartSeriesUtils.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 38 | `aChartData.reduce` callback | `aResult, aSeries` | implicit object | Add one series to ECharts legend selected map. |
| 53 | `aChartData.reduce` callback | `aResult, aSeries` | implicit object | Add one unique series name to default visibility map. |
| 72 | `aChartData.map` callback | `aSeries` | implicit object | Convert one series into UI visible-series item. |
| 138 | highlight `filter` callback | `aHighlight` | implicit boolean | Keep only finite, forward-moving highlight ranges for overlay series. |
| 143 | highlight `map` callback | `aHighlight` | implicit markArea tuple | Convert one highlight into markArea start/end data. |
| 230 | label `filter` callback | `aHighlight` | implicit boolean | Keep only finite, forward-moving highlight ranges for label series. |
| 235 | label `map` callback | `aHighlight, aIndex` | implicit object | Convert one highlight into clickable label point data. |
| 349 | main `aChartData.map` callback | `aSeries, aIndex` | implicit series option | Build one main chart line series. Attach thresholds and hover styling. |
| 432 | navigator `aChartData.map` callback | `aSeries, aIndex` | implicit series option | Build one navigator line series. Apply hover dimming and disable interaction. |

### `chart/options/OverlapChartOption.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 88 | `aChartData.map` callback | `aSeries, aIndex` | implicit series option | Build one overlap chart line series. |
| 128 | tooltip `sItems.map` callback | `aItem` | implicit string | Render one overlap tooltip HTML row with reconstructed timestamp and value. |

### `chart/useChartRuntimeController.test.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 10 | `jest.mock` callback | none | implicit | Configure PanelChartStateLoader mock. |
| 17 | `describe` callback | none | implicit | Group useChartRuntimeController tests. |
| 18 | `beforeEach` callback | none | implicit | Clear mocks before each controller test. |
| 22 | `it` callback | none | implicit Promise | Verify slider drags inside navigator range are local view changes. |
| 28 | `getVisibleSeries` mock callback | none | implicit array | Return no visible series. |
| 29 | `getHighlightIndexAtClientPosition` mock callback | none | implicit undefined | Return no highlight hit. |
| 33 | `renderHook` callback | none | implicit controller | Create controller for local slider-drag test. |
| 45 | `act` callback | none | implicit void | Seed initial panel and navigator range. |
| 52 | `act` callback | none | implicit Promise | Apply panel range change. |
| 78 | `it` callback | none | implicit Promise | Verify visible range width change refetches data. |
| 88 | `renderHook` callback | none | implicit controller | Create controller for zoom refetch test. |
| 101 | `act` callback | none | implicit void | Seed broad range before zoom. |
| 109 | `act` callback | none | implicit Promise | Apply zoom-in panel range change. |
| 130 | `it` callback | none | implicit Promise | Verify pan outside loaded zoom range refetches data. |
| 138 | `renderHook` callback | none | implicit controller | Create controller for post-zoom pan test. |
| 151 | `act` callback | none | implicit Promise | Load initial data range. |
| 161 | `act` callback | none | implicit Promise | Apply zoom-in range change. |
| 172 | `act` callback | none | implicit Promise | Apply pan outside loaded range. |
| 188 | `it` callback | none | implicit Promise | Verify overview changes load data for navigator range. |
| 199 | `renderHook` callback | none | implicit controller | Create controller for navigator overview load test. |
| 211 | `act` callback | none | implicit Promise | Apply loaded panel and navigator ranges. |

### `chart/useChartRuntimeController.ts`

| Line | Function | Params | Return | Responsibilities |
| --- | --- | --- | --- | --- |
| 115 | `setNavigateState` callback | `aPrev` | implicit `PanelNavigateState` | Merge current state with patch. Store same next state in ref. Return next React state. |
