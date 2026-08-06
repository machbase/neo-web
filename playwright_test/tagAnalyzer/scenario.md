# TagAnalyzer Test Scenarios

Implemented in [`scenarios/scenarios.spec.ts`](scenarios/scenarios.spec.ts).

## Shared requirement

- `[M.1]` Authentication - Complete the login flow.
- `[1.1.1]` Data source - Use `MACHROLL` for every data-backed test.

## 1. Create a chart

- `[1.1.3]` Clickable card - Open a new TagAnalyzer board.
- `[1.3.1.1]` Button - Open the New Chart modal.
- `[1.3.2.1]` Dropdown - Select `MACHROLL` as the table.
- `[1.3.2.3]` Button - Search for tags.
- `[1.3.2.6]` Button - Add a `MACHROLL` series.
- `[1.3.3.3]` Button - Apply the modal and create the configured panel.
- `[1.4.2.1.1]` Chart - Render the populated state.
- `[1.4.2.1.2]` Chart - Render the configured series and chart type.

## 2. Navigate and zoom

- `[1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3]` Setup - Create a `MACHROLL` chart.
- `[1.4.2.2.1]` Mouse wheel - Zoom in.
- `[1.4.2.2.2]` Mouse wheel - Zoom out.

## 3. Analyze a selected range

- `[1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3]` Setup - Create a `MACHROLL` chart.
- `[1.4.4.4.1]` Button - Enable data-range selection mode.
- `[1.4.4.4.3]` Chart drag - Select a data range.
- `[1.4.4.4.4]` Dialog - Open the Selection Summary.
- `[1.4.4.4.5]` Summary - Show the selected range and per-series values.
- `[1.4.4.5.1]` Button - Open the FFT modal.
- `[1.4.4.5.4]` Chart - Render the 2D FFT result.

## 4. Compare series

- `[1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3]` Setup - Create two `MACHROLL` charts.
- `[1.4.1.17]` Toggle button - Add panels to the overlap selection.
- `[1.2.4.1]` Button - Enable Overlap for compatible panels.
- `[1.2.4.3]` Button - Open the Overlap modal.
- `[1.2.4.5]` Chart - Render all selected `MACHROLL` series.

## 5. Save and reopen

- `[1.1.3]` Clickable card - Open a new TagAnalyzer board.
- `[1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3]` Setup - Create a `MACHROLL` chart.
- `[1.2.2.3]` Inputs - Set the board range to `first` and `last`.
- `[1.4.3.2.2]` Checkbox - Disable drag zoom.
- `[1.2.3.1]` Button - Save from the toolbar.
- `[1.1.4]` File-tree item - Reopen the saved `.taz` board.
- `[1.2.3.9]` Persistence - Preserve the range, panel, `MACHROLL` series, and drag setting.
- `[1.2.3.11]` Persistence - Reproduce the saved runtime configuration.
