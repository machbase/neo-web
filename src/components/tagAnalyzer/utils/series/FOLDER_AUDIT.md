# Folder Audit: `utils/series`

## Summary
- Date: 2026-04-22
- Direct files: `5`
- Direct subfolders: `utils/series/audit`
- Responsibility: This folder owns series naming, point conversion, summary calculation, and chart-seed helpers.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `utils/series/SeriesLabelFormatter.ts` (80 lines)
- Helper hotspot: none

## Files

### `SeriesLabelFormatter.ts`
- Path: `utils/series/SeriesLabelFormatter.ts`
- Lines: 80
- Role: Builds the display labels used for series chips, editor labels, and chart legends.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `formatSeriesLabel` (21 lines, line 19) - Formats a series label for the requested display target. Needs edit: No. This function is small enough and focused enough for now.
  - `getSeriesShortName` (3 lines, line 48) - Gets the short label for a series. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `getSeriesEditorName` (3 lines, line 59) - Gets the editor label for a series. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `getSeriesName` (9 lines, line 71) - Gets the chart label for a series. Needs edit: No. This function is small enough and focused enough for now.

### `SeriesPointConverters.ts`
- Path: `utils/series/SeriesPointConverters.ts`
- Lines: 60
- Role: Converts supported chart series shapes into normalized point lists.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `seriesDataToPoints` - Converts concrete series data into chart points. Needs edit: No. This function is small enough and focused enough for now.
  - `chartSeriesToPoints` (5 lines, line 55) - Converts a chart series item into chart points. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; this is a very thin wrapper, so keep it only if the name makes call sites clearer.

### `SeriesSummaryUtils.ts`
- Path: `utils/series/SeriesSummaryUtils.ts`
- Lines: 68
- Role: Builds summary rows from chart series data.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `buildSeriesSummaryRows` (34 lines, line 34) - Builds summary rows for the visible series data. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.

### `seriesTypes.ts`
- Path: `utils/series/seriesTypes.ts`
- Lines: 65
- Role: Defines the core series, chart-row, chart-data, and summary types used across Tag Analyzer.
- Similar files: `chart/options/ChartSeriesUtils.ts`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

### `TagSelectionChartSetup.ts`
- Path: `utils/series/TagSelectionChartSetup.ts`
- Lines: 79
- Role: Builds the initial chart seed and default ranges from selected tags.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `buildDefaultRange` (16 lines, line 17) - Builds a default range for a new chart. Needs edit: No. This function is small enough and focused enough for now.
  - `buildCreateChartSeed` (18 lines, line 44) - Builds the seed object for creating a chart. Needs edit: No. This function is small enough and focused enough for now.
  - `mergeSelectedTagsIntoTagSet` (8 lines, line 71) - Merges selected tag drafts into an existing tag set. Needs edit: No. This function is small enough and focused enough for now.

