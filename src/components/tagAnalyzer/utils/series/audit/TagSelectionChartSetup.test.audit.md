# TagSelectionChartSetup.test.ts Audit

## File Role

`TagSelectionChartSetup.test.ts` verifies the chart-setup helpers that prepare range and tag-set seed data.

## Reusable Function Audit

This file contains no reusable named functions. It uses Jest callback functions to verify behavior.

## Test Role Audit

### `buildDefaultRange` normal-range test (`TagSelectionChartSetup.test.ts:12`)

Role: Verifies that an already-valid min/max pair is returned unchanged.

### `buildDefaultRange` zero-width test (`TagSelectionChartSetup.test.ts:16`)

Role: Verifies that a zero-width range is padded so a new chart still has a visible window.

### `buildCreateChartSeed` seed-build test (`TagSelectionChartSetup.test.ts:20`)

Role: Verifies that the helper builds a chart seed with the requested chart type, a normalized tag set, and the computed default range.

### `mergeSelectedTagsIntoTagSet` merge test (`TagSelectionChartSetup.test.ts:35`)

Role: Verifies that existing series configs are preserved and newly selected drafts are appended as normalized series config entries.

