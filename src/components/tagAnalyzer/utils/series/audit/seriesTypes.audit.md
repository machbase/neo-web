# seriesTypes.ts Audit

## File Role

`seriesTypes.ts` defines the shared data contracts used by the other files in the `series` folder.

## Function Audit

This file contains no executable functions.

## Type Role Audit

### `PanelSeriesSourceColumns` (`seriesTypes.ts:1`)

Role: Describes the column names that map a series to name, time, and value fields.

### `PanelSeriesConfig` (`seriesTypes.ts:8`)

Role: Describes the normalized configuration for one selected series in the tag analyzer.

### `ChartRow` (`seriesTypes.ts:22`)

Role: Represents the tuple form of a chart point as `[timestamp, value]`.

### `ChartSeriesPoint` (`seriesTypes.ts:24`)

Role: Represents the object form of a chart point as `{ x, y }`.

### `ChartSeriesItem` (`seriesTypes.ts:29`)

Role: Describes one chart-ready series, including its data points, axis assignment, marker settings, and color.

### `ChartData` (`seriesTypes.ts:44`)

Role: Represents a dataset wrapper that contains multiple chart series.

### `SelectedRangeSeriesSummary` (`seriesTypes.ts:48`)

Role: Defines the selected-range summary row shape returned by `buildSeriesSummaryRows(...)`.

