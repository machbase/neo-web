# TagAnalyzer Features

## Board view

- Toolbar
  Time range, refresh data, refresh time, save, save as, and overlap chart.

- Panel card
  Title, visible time text, interval text, raw toggle, drag-select toggle, FFT, set global time, refresh, edit, save to local, and delete.

- Chart area
  Main chart, overview/navigator, range shift buttons, drag-select summary, and FFT launch.

- Footer
  Navigator start/end labels plus shift, zoom in/out, and focus actions.

- New chart modal
  Select table, chart type, tags, and calculation mode for a new panel.

- Overlap modal
  Compare selected single-tag panels on one shared chart with per-series offset controls.

## Editor view

- Header
  Back, discard, apply, and save.

- Preview
  Uses the same chart body as the live panel, with preview-specific header actions.

- Settings tabs
  `General`, `Data`, `Axes`, `Display`, and `Time`.

## Behaviors worth knowing

- `Apply` updates the preview only.
- `Save` persists the currently applied preview panel.
- Preview header/footer buttons update preview runtime state immediately.
- Overlap selection is only available for single-tag panels.
- The first selected overlap panel becomes the anchor.

## Settings ownership

- `General`
  Cross-cutting draft values such as title, zoom mode, and time-keeper behavior.

- `Data`
  Tag set and calculation mode.

- `Axes`
  X/Y scale, tick lines, sampling, thresholds, and Y2 assignment.

- `Display`
  Chart type, legend, points, fill, and stroke.

- `Time`
  Absolute or relative panel time override.
