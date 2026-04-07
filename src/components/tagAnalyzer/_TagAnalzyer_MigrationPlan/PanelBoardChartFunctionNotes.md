# PanelBoardChart Function Notes

This file explains what each function in [PanelBoardChart.tsx](/c:/_github_repos/neo-web/src/components/tagAnalyzer/panel/PanelBoardChart.tsx) is doing today.

## Overall role

`PanelBoardChart` is the runtime board-panel controller for one open TagAnalyzer panel.

It is responsible for:
- loading main chart data
- loading navigator data
- reacting to zoom and range changes
- handling selection/min/max behavior
- toggling raw mode
- coordinating overlap selection
- opening edit mode
- syncing with board-level refresh and global time changes

## Component-level functions

### `PanelBoardChart(...)`
Main component function.

It:
- receives the panel model and board context
- owns refs for the chart and DOM container
- owns local panel UI state and navigation/chart state
- builds handler objects for header/body/footer
- wires the chart into board-level actions

### `getChart()`
Returns the current Highcharts chart instance from `chartRef`.

Purpose:
- avoid repeating `chartRef.current?.chart`

### `updateNav(patch)`
Merges a partial patch into `navState`.

Purpose:
- short helper for navigation/chart state updates

### `setExtremes(panel, navigator?)`
Imperatively updates chart ranges.

It:
- always updates the main x-axis range
- optionally updates the navigator range too

Purpose:
- central place for chart `setExtremes(...)` calls

## Fetch parameter builders

### `makeFetchParams(timeRange?, raw?)`
Builds the shared parameter object passed into `resolveNavigatorChartState(...)` and `resolvePanelChartState(...)`.

It gathers:
- tag set
- panel config
- board range
- chart width
- raw flag
- requested time range
- rollup tables

Purpose:
- avoid rebuilding the same input object twice

### `makeResetParams()`
Builds the shared parameter object passed into `resolveInitialPanelRange(...)` and `resolveResetTimeRange(...)`.

It gathers:
- board range
- panel config
- current board begin/end override
- `isEdit: false`

Purpose:
- centralize the reset/initialize resolver inputs

## Data loading

### `refreshNavigator(timeRange?, raw?)`
Loads navigator overview data and stores it into `navState.navigatorData`.

It:
- calls `resolveNavigatorChartState(...)`
- writes the result into local state

Purpose:
- refresh the small overview chart independently of the main chart

### `refreshPanel(timeRange?, raw?)`
Loads main chart data and stores the result into local state.

It:
- calls `resolvePanelChartState(...)`
- converts the result into a local nav-state patch with `buildNavPatchFromLoad(...)`
- handles overflow range behavior by forcing the chart to the returned overflow range

Purpose:
- refresh the main panel chart data for the currently visible range

## Lifecycle / initialization

### `initialize()`
Initial load path for the panel.

It:
- exits if the panel width is not ready yet
- resolves the initial visible range
- prefers saved time-keeper ranges when enabled
- loads main chart data
- loads navigator data
- stores both panel and navigator ranges into local state

Purpose:
- fully boot the chart when the panel first becomes active or after edit-save refresh

### `reset()`
Resolves the reset range and applies it to both the panel and navigator chart windows.

It:
- only runs when this panel is the selected board tab
- skips work if the chart is not mounted
- uses `resolveResetTimeRange(...)`

Purpose:
- respond to board-level time refresh/reset behavior

## Chart event handlers

### `onPanelRangeChange(event)`
Handles main-chart x-axis range changes.

It:
- ignores empty events
- computes the next panel range from `event.min/max`
- expands the navigator window if needed
- refreshes main chart data unless the next fetch should be skipped
- updates local panel range state
- persists time-keeper state when enabled
- updates the overlap selection timing in the parent

Purpose:
- keep the main chart, saved time state, and overlap state in sync after zoom/pan

### `onSelectionRange(event)`
Handles drag-selection inside the chart.

It:
- ignores selection when there is no x-axis selection or no chart data
- draws a temporary plot band over the selected area
- computes min/max/avg info for the selected time window
- shows an error toast if the selected area has no data
- opens the selection UI and saves FFT start/end time plus menu position

Purpose:
- drive the selection popup and FFT source range

### `onNavigatorRangeChange(event)`
Handles navigator range changes.

It:
- computes the next navigator range from the event
- stores it locally
- reloads navigator data only when the new window crosses a reload threshold

Purpose:
- keep the navigator window and overview data synchronized

## Navigation handlers

### `onZoom(action, zoom?)`
Handles zoom button actions from the footer/header flow.

It:
- resolves the new range using `resolveZoomRange(...)`
- applies the resulting main/navigator ranges to the chart

Purpose:
- central entry point for zoom-in, zoom-out, and focus actions

### `onShiftPanel(dir)`
Shifts the main visible panel window left or right.

It:
- computes the next shifted range with `getMovedPanelRange(...)`
- applies the new main and optional navigator ranges to the chart

Purpose:
- move the main view without rebuilding the logic in the component

### `onShiftNavigator(dir)`
Shifts the navigator window left or right.

It:
- computes the next shifted ranges with `getMovedNavigatorRange(...)`
- applies both ranges to the chart

Purpose:
- move the overall navigator window and keep the panel range aligned

## Toggle / mode handlers

### `toggleDragSelect()`
Opens or clears drag-select mode.

When drag-select is already active, it:
- removes the plot band
- clears the stored selection axis
- resets selection-related panel state while preserving `isRaw`

When drag-select is not active, it:
- marks drag-select mode as active

Purpose:
- act as the main open/close switch for drag-select UI state

### `toggleRaw()`
Switches between sampled and raw mode.

It:
- flips `panelState.isRaw`
- persists the current range into board state when a chart exists
- refreshes main chart data for the new mode
- refreshes navigator data too when sampling is enabled

Purpose:
- change how data is fetched/rendered while keeping the current time window

## Composed handler objects

These are not standalone named functions, but they are the callback surface passed to child components.

### `navigationHandlers.onRefreshData`
Refreshes the current main chart data using the current panel range.

### `navigationHandlers.onRefreshTime`
Runs `reset()`.

### `navigationHandlers.onZoomAction`
Forwards to `onZoom(...)`.

### `navigationHandlers.onShiftPanelRange`
Forwards to `onShiftPanel(...)`.

### `navigationHandlers.onShiftNavigatorRange`
Forwards to `onShiftNavigator(...)`.

### `actionHandlers.onToggleOverlap`
Adds/removes this panel from overlap selection, but only when it has exactly one tag.

### `actionHandlers.onToggleRaw`
Forwards to `toggleRaw()`.

### `actionHandlers.onToggleDragSelect`
Forwards to `toggleDragSelect()`.

### `actionHandlers.onOpenFft`
Opens the FFT modal by setting `panelState.isFFTModal`.

### `actionHandlers.onSetGlobalTime`
Pushes the current chart range back up to board/global time state.

It:
- ignores the action if there is no interval option yet
- resolves the correct global target range
- sends panel range, navigator range, and interval info to the parent

### `actionHandlers.onOpenEdit`
Requests the parent to open the panel editor.

It passes:
- the current panel model
- the current navigator range
- a setter the editor uses to mark that the panel should refresh after edit-save

### `actionHandlers.onDelete`
Asks the parent to delete this panel using the current panel time range and raw state.

## Derived presentation

### `presentationState`
This is not a function, but it is an important derived object.

It is built with `buildPanelPresentationState(...)` and contains:
- title
- formatted time display info
- raw/edit/overlap flags
- selection visibility flags
- whether overlap toggle is allowed
- whether local save actions are allowed

Purpose:
- give `PanelHeader` a UI-facing view model instead of raw panel internals

## Effects

These are anonymous effect callbacks rather than named functions, but they still represent core behaviors.

### Global time effect
When board/global time changes:
- updates local interval option
- applies the new panel and navigator ranges to the chart

### Refresh count effect
When board refresh count changes:
- refreshes the current panel data

### Refresh-after-edit effect
When the panel model changes and this panel is marked for post-edit refresh:
- re-runs `initialize()`
- clears the `shouldRefreshAfterEdit` flag

### Board begin/end reset effect
When board begin/end override changes:
- runs `reset()`

### First-activation effect
When the selected board tab becomes active and the chart DOM is ready:
- runs `initialize()`

## Pure helper functions at the bottom

### `resolveZoomRange(action, panelRange, navigatorRange, zoom?)`
Pure helper that turns a zoom action into the next chart-range update.

It:
- zooms in with `getZoomInPanelRange(...)`
- zooms out with `getZoomOutRange(...)`
- focuses with `getFocusedPanelRange(...)`

Purpose:
- keep zoom action mapping out of the component body

### `buildNavPatchFromLoad(result)`
Pure helper that converts the resolved main-chart load result into a local `PanelNavigateState` patch.

It:
- stores datasets into `chartData`
- stores the interval/range option
- stores overflow range info when present
- otherwise resets `preOverflowTimeRange`

Purpose:
- centralize the shape transformation from load result to local nav state

## Practical reading order

If you want to understand this file quickly, the best order is:

1. `PanelBoardChart(...)`
2. `refreshPanel(...)`
3. `refreshNavigator(...)`
4. `initialize()`
5. `reset()`
6. `onPanelRangeChange(...)`
7. `onSelectionRange(...)`
8. `toggleRaw()`
9. `actionHandlers`
10. `resolveZoomRange(...)`
11. `buildNavPatchFromLoad(...)`
