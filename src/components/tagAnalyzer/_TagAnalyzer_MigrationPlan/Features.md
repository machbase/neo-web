# TagAnalyzer Features

## Main tasks

- Build a new panel
  Choose a source table, chart type, and tags, then add a new panel to the board.

- Work with a live board panel
  Each panel can refresh data, switch to raw-value view, select a sub-range, open the FFT (frequency analysis) flow, copy its current range into shared board time, or move into the editor.

- Compare panels in overlap mode
  The overlap modal renders selected single-tag panels on one shared chart and lets the user offset series for visual alignment. Multi-tag panels are not eligible here.

- Edit a panel draft
  Change panel settings in the editor, preview them, and save only when ready.

## Behaviors worth knowing

- A new chart seeds its first time range from the fetched min/max bounds.
- `Apply` updates the preview only.
- `Save` persists the currently applied preview panel.
- The editor keeps changes in draft state until save.
- Preview header/footer buttons update preview runtime state immediately.
- Overlap selection is only available for single-tag panels.
- The first selected overlap panel becomes the anchor.

## Settings ownership

- `General`
  Cross-cutting draft values such as title, zoom behavior, and whether the panel follows shared board time.

- `Data`
  Which series the panel should fetch and how they should be calculated.

- `Axes`
  X/Y axis scale behavior, sampling, thresholds, and which series should use the secondary axis.

- `Display`
  Visual presentation such as chart type, legend behavior, points, fill, and stroke.

- `Time`
  Absolute or relative time overrides when the panel should not simply follow the board window.
