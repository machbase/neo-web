# SeriesLabelFormatter.test.ts Audit

## File Role

`SeriesLabelFormatter.test.ts` verifies the expected label variants produced by `SeriesLabelFormatter.ts`.

## Reusable Function Audit

This file contains no reusable named functions. It uses Jest callback functions to verify behavior.

## Test Role Audit

### `getSeriesShortName` alias test (`SeriesLabelFormatter.test.ts:18`)

Role: Verifies that the short-name path returns the alias when an alias is present.

### `getSeriesShortName` fallback test (`SeriesLabelFormatter.test.ts:24`)

Role: Verifies that the short-name path falls back to the normalized source tag name when no alias exists.

### `getSeriesEditorName` calculation-mode test (`SeriesLabelFormatter.test.ts:30`)

Role: Verifies that editor labels keep the original calculation-mode text instead of lowercasing it.

### `getSeriesName` alias test (`SeriesLabelFormatter.test.ts:36`)

Role: Verifies that chart labels also honor the alias override.

### `getSeriesName` lowercase calculation test (`SeriesLabelFormatter.test.ts:40`)

Role: Verifies that the standard chart label lowercases the calculation mode.

### `getSeriesName` raw-label test (`SeriesLabelFormatter.test.ts:44`)

Role: Verifies that the chart label switches to the `raw` suffix when explicitly requested.

