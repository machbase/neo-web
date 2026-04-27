# `useChartSelectionPopupState`
Source: [useChartSelectionPopupState.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/chart/useChartSelectionPopupState.ts)

## Purpose
This custom hook handles what should happen after the user drags across the chart.
It chooses between:
1. Create a highlight for the selected time range.
2. Open a popup that shows summary values for that range.

## Inputs
- `chartRefs.areaChart`: used to calculate popup position.
- `panelState.isDragSelectActive`: tells whether drag-select mode is on.
- `panelState.isHighlightActive`: tells whether selection should create a highlight.
- `navigateState.chartData`: the chart data currently on screen.
- `tagSet`: metadata for each series.
- `onDragSelectStateChange(...)`: informs parent state.
- `onHighlightSelection(...)`: sends selected range to highlight logic.

## Local state
The hook stores `dragSelectState`, which contains:
- `isOpen`
- `startTime`
- `endTime`
- `seriesSummaries`
- `menuPosition`

## Main flow
When `handleSelection(event)` runs:
1. If `event.min` or `event.max` is missing, stop.
2. If highlight mode is on, call `onHighlightSelection(...)` and stop.
3. Otherwise build summary rows from the selected range.
4. If no data exists in that range, show a toast and stop.
5. Compute popup position from the chart DOM element.
6. Save the popup state with selected times and summary rows.
7. Notify the parent that drag selection is active and FFT can open.

## `useEffect`
If `isDragSelectActive` becomes `false`, the hook resets the popup state to empty.

## Return value
The hook returns:
- `dragSelectState`: state used by the popup and FFT modal.
- `handleSelection`: passed to the chart as the selection handler.
- `handleCloseDragSelect`: closes the popup and clears selection state.
