# SeriesPointConverters.ts Audit

## File Role

`SeriesPointConverters.ts` normalizes series data into a single `{ x, y }` point shape so downstream code can work with one consistent structure.

## Function Audit

### `seriesDataToPoints`

Role: Core normalization function for concrete series data arrays.

Behavior summary:

- Converts tuple rows like `[time, value]` into `{ x: time, y: value }`.
- Returns object-based points unchanged when they are already in `{ x, y }` form.

### `chartSeriesToPoints`

Role: Small adapter for callers that already hold a chart-series object.

Behavior summary:

- Accepts an object with a `data` field.
- Delegates the actual conversion work to `seriesDataToPoints(...)`.

## Notes

- The file is pure. It has no side effects.
- The normalization logic is intentionally concentrated in one place so other files do not duplicate tuple-to-point conversion.
- There is no direct test file for this module in the current folder.

