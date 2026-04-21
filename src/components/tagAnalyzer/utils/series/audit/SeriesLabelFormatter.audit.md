# SeriesLabelFormatter.ts Audit

## File Role

`SeriesLabelFormatter.ts` centralizes the naming rules for a series so the list view, editor view, and chart view all derive labels from the same source policy.

## Function Audit

### `formatSeriesLabel` (`SeriesLabelFormatter.ts:19`)

Role: This is the core label-decision function. It applies the alias override first, then falls back to the normalized source tag name, and finally formats the suffix based on the requested target.

Behavior summary:

- Returns `alias` immediately when the series has one.
- Uses `getSourceTagName(...)` when there is no alias.
- For `short`, returns only the normalized tag name.
- For `editor`, appends the original `calculationMode` text.
- For `chart`, appends either `raw` or the lowercase calculation mode.

### `getSeriesShortName` (`SeriesLabelFormatter.ts:48`)

Role: Thin wrapper that requests the compact label used in selection or list-style UI.

Behavior summary:

- Delegates to `formatSeriesLabel(...)` with `target: 'short'`.
- Exists to keep call sites explicit about the intent of the returned label.

### `getSeriesEditorName` (`SeriesLabelFormatter.ts:59`)

Role: Thin wrapper that requests the label variant intended for editing workflows.

Behavior summary:

- Delegates to `formatSeriesLabel(...)` with `target: 'editor'`.
- Preserves the original calculation-mode casing because the shared formatter uses the raw `calculationMode` string for this target.

### `getSeriesName` (`SeriesLabelFormatter.ts:71`)

Role: Thin wrapper that requests the chart-facing display label.

Behavior summary:

- Delegates to `formatSeriesLabel(...)` with `target: 'chart'`.
- Accepts `aUseRawLabel` so callers can explicitly choose the `raw` suffix instead of the calculated mode suffix.

## Notes

- The file is pure. It has no side effects.
- The wrapper functions are intentionally small and descriptive. Their main value is semantic clarity at call sites.

