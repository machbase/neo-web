# Highlight Implementation

- Added a `Highlight` button in the panel header to toggle highlight selection mode.
- Added `isHighlightActive` to the shared panel runtime state.
- Reused the existing chart brush interaction instead of creating a separate drag tool.
- When highlight mode is active, brush selection saves a new highlight instead of opening stats/FFT.
- New highlights are appended to `PanelInfo.highlights`.
- New highlight entries currently use the default label `unnamed`.
- Added a direct `onSavePanel` board action so the full panel can be persisted immediately.
- Saved highlights are written into the `.taz` panel data through the normal `PanelInfo` save path.
- Chart rendering uses a dedicated overlay series with `markArea` to display saved highlight ranges.
- Right-click mouse down on the chart body is blocked so context menu behavior does not fight chart dragging.
