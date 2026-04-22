# TAZ Format Versions

This directory supports 3 `.taz` panel formats.

## `legacy`

- No `version` field, invalid `version`, or any version lower than `2.0.0`
- Panel data is stored in the old flat shape
- Examples:
  - `index_key`
  - `chart_title`
  - `tag_set`
  - `range_bgn`
  - `range_end`
  - `raw_keeper`
  - `time_keeper`
  - `use_ucl`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`
- Missing `annotations` and `highlights` become `[]`

## `2.0.0`

- First nested panel format
- Panel data is stored as nested panel objects
- Examples:
  - `meta.index_key`
  - `meta.chart_title`
  - `data.tag_set`
  - `time.range_bgn`
  - `time.range_end`
  - `time.time_keeper`
  - `axes.use_ucl`
  - `highlights`
  - `annotations`
- Still uses older field names
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.1`

- Current format
- Same logical data as `2.0.0`, but field names are more explicit
- Examples:
  - `meta.panelKey`
  - `meta.chartTitle`
  - `data.seriesList`
  - `data.useRawData`
  - `data.rowLimit`
  - `time.rangeStart`
  - `time.rangeEnd`
  - `time.savedTimeRange`
  - `axes.usePrimaryUpperControlLimit`
  - `axes.primaryUpperControlLimit`
  - `display.showLegend`
  - `useNormalizedValues`
- This is the format written when TagAnalyzer saves a `.taz`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## Load Flow

- Version detection: [TazVersion.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/TazVersion.ts)
- Boundary parser: [TazBoardParser.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/TazBoardParser.ts)
- Save mapping: [SavePanelInfo.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/SavePanelInfo.ts)

TagAnalyzer UI code uses the internal runtime `PanelInfo` after parsing, not the raw file shape.
