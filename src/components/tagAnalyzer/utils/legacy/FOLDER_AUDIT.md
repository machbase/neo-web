# Folder Audit: `utils/legacy`

## Summary
- Date: 2026-04-22
- Direct files: `3`
- Direct subfolders: none
- Responsibility: This folder owns pre-2.0.0 adapters and legacy boundary types.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `utils/legacy/LegacySeriesAdapter.ts` (238 lines)
- Helper hotspot: `utils/legacy/LegacySeriesAdapter.ts` (14 named functions)

## Files

### `LegacySeriesAdapter.ts`
- Path: `utils/legacy/LegacySeriesAdapter.ts`
- Lines: 238
- Role: Converts legacy series names, configs, and chart payloads into the normalized modern series model.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Warning. This file has enough helpers that naming and responsibility boundaries should be watched closely.
- Functions:
  - `getSourceTagName` (11 lines, line 18) - Gets the source tag name from a legacy source-tag input. Needs edit: No. This function is small enough and focused enough for now.
  - `withNormalizedSourceTagName` (14 lines, line 36) - Returns a copy of the item with `sourceTagName` normalized. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeSourceTagNames` (5 lines, line 57) - Normalizes the source tag name on each legacy item in a list. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `normalizeLegacySeriesConfigs` (5 lines, line 69) - Converts legacy-compatible series configs into modern series configs. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `normalizeLegacyChartSeries` (7 lines, line 81) - Converts legacy chart series data into the chart-series data shape. Needs edit: No. This function is small enough and focused enough for now.
  - `toLegacyTagNameItem` (10 lines, line 95) - Returns a copy of the item with `tagName` restored for legacy storage. Needs edit: No. This function is small enough and focused enough for now.
  - `toLegacyTagNameList` (5 lines, line 112) - Converts each item in a list back to the legacy tag-name shape. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `toLegacySeriesConfigs` (12 lines, line 124) - Converts modern series configs into the legacy-compatible series config list. Needs edit: No. This function is small enough and focused enough for now.
  - `legacySeriesToChartPoints` (12 lines, line 143) - Converts a legacy series payload into chart point objects. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeLegacySeriesConfig` (31 lines, line 162) - Normalizes one legacy-compatible series config into the modern series config shape. Needs edit: No. This function is small enough and focused enough for now.
  - `fromLegacyBoolean` (3 lines, line 200) - Converts a legacy `Y`/`N` flag into a boolean. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `toLegacyBoolean` (3 lines, line 210) - Converts a boolean into a legacy `Y`/`N` flag. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `legacyChartSeriesHasArrays` (8 lines, line 220) - Checks whether a legacy series stores its data in x/y arrays. Needs edit: No. This function is small enough and focused enough for now.
  - `legacyChartSeriesToRows` (3 lines, line 235) - Converts a legacy chart series into chart rows. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; this is a very thin wrapper, so keep it only if the name makes call sites clearer.

### `LegacyTimeAdapter.ts`
- Path: `utils/legacy/LegacyTimeAdapter.ts`
- Lines: 149
- Role: Converts legacy time values and boundary pairs into the normalized time model used internally.
- Similar files: `utils/legacy/LegacySeriesAdapter.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `normalizeLegacyTimeBoundaryRanges` (18 lines, line 24) - Converts legacy boundary pairs into modern range pairs. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeLegacyTimeRangeBoundary` (9 lines, line 50) - Converts legacy start and end values into resolved time bounds. Needs edit: No. This function is small enough and focused enough for now.
  - `toLegacyTimeRangeInput` (14 lines, line 66) - Serializes a time-range source into legacy input fields. Needs edit: No. This function is small enough and focused enough for now.
  - `toLegacyTimeValue` (12 lines, line 87) - Converts a time boundary into a legacy scalar value. Needs edit: No. This function is small enough and focused enough for now.
  - `legacyMinMaxPairToRange` (13 lines, line 107) - Converts legacy min and max values into a numeric range. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeLegacyTimeBoundary` (22 lines, line 127) - Converts one legacy time value into the shared structured boundary model. Needs edit: No. This function is small enough and focused enough for now.

### `LegacyTypes.ts`
- Path: `utils/legacy/LegacyTypes.ts`
- Lines: 79
- Role: Defines the legacy board, panel, series, and time types used at the pre-2.0.0 boundary.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

