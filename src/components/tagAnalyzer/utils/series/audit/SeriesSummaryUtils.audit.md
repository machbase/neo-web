# SeriesSummaryUtils.ts Audit

## File Role

`SeriesSummaryUtils.ts` prepares summary-table data for the visible chart window and exposes the supported aggregation-mode option lists used by the tag analyzer.

## Supporting Values

### `TAG_ANALYZER_AGGREGATION_MODES` (`SeriesSummaryUtils.ts:6`)

Role: Declares the supported aggregation mode identifiers and display values.

### `TAG_ANALYZER_AGGREGATION_MODE_OPTIONS` (`SeriesSummaryUtils.ts:16`)

Role: Converts the aggregation-mode definitions into `{ label, value, disabled }` option objects for UI consumers.

## Function Audit

### `buildSeriesSummaryRows` (`SeriesSummaryUtils.ts:34`)

Role: Builds one summary row per visible series by calculating min, max, and average values inside the selected time range.

Behavior summary:

- Iterates over `aSeriesList`.
- Converts each series into normalized points with `chartSeriesToPoints(...)`.
- Filters points to the inclusive `[aStartTime, aEndTime]` window.
- Extracts `y` values from the filtered points.
- Skips the series when no values remain in range.
- Calculates total, min, max, and average.
- Builds a `SelectedRangeSeriesSummary` with metadata from `aTagSet[aIndex]`.

## Notes

- The function assumes `aSeriesList` and `aTagSet` use the same ordering and length semantics.
- The file is pure. It computes summary output without mutating its inputs.
- The current test file covers the happy path for one in-range series but does not cover empty windows or index misalignment.

