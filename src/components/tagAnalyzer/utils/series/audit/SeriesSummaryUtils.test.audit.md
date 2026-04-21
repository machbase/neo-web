# SeriesSummaryUtils.test.ts Audit

## File Role

`SeriesSummaryUtils.test.ts` verifies that summary rows are built correctly for a simple in-range data window.

## Reusable Function Audit

This file contains no reusable named functions. It uses Jest callback functions to verify behavior.

## Test Role Audit

### `buildSeriesSummaryRows` range-summary test (`SeriesSummaryUtils.test.ts:5`)

Role: Verifies that the function filters values by time window and returns the expected min, max, and average strings for the remaining points.

## Coverage Note

- This test covers the happy path for one series.
- It does not cover empty selections, empty input arrays, or misaligned `aSeriesList` and `aTagSet` inputs.

