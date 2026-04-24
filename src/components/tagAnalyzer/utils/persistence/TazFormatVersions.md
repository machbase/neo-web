# TAZ Format Versions

This directory supports 8 `.taz` panel formats.

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

- Explicit field-name format
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
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.2`

- Same logical data as `2.0.1`, but `axes` is split into explicit grouped sections
- Examples:
  - `axes.xAxis.showTickLine`
  - `axes.xAxis.rawDataPixelsPerTick`
  - `axes.sampling.enabled`
  - `axes.primaryYAxis.valueRange`
  - `axes.primaryYAxis.upperControlLimit`
  - `axes.secondaryYAxis.enabled`
  - `axes.secondaryYAxis.lowerControlLimit`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.3`

- Same logical data as `2.0.2`, but grouped y-axis fields are named by chart side
- Examples:
  - `axes.xAxis.showTickLine`
  - `axes.sampling.enabled`
  - `axes.leftYAxis.valueRange`
  - `axes.leftYAxis.upperControlLimit`
  - `axes.rightYAxis.enabled`
  - `axes.rightYAxis.lowerControlLimit`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.4`

- Same logical data as `2.0.3`, but series source columns are named more explicitly
- Examples:
  - `data.seriesList[].sourceColumns.nameColumn`
  - `data.seriesList[].sourceColumns.timeColumn`
  - `data.seriesList[].sourceColumns.valueColumn`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.5`

- Same logical data as `2.0.4`, but panel time no longer stores viewport snapshot fields
- Board-level saved time range is now `boardTimeRange`
- Root `range_bgn` and `range_end` are legacy input fields and are not written by current saves
- Shared tab metadata such as `sheet`, `shell`, `dashboard`, `refreshKey`, and `mode` is not written by current `.taz` saves
- Removed from `time`:
  - `rangeStart`
  - `rangeEnd`
  - `useSavedTimeRange`
  - `savedTimeRange`
  - `defaultValueRange`
- The saved time range source is `time.rangeConfig`
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.6`

- Current format written when TagAnalyzer saves a `.taz`
- Same panel payload as `2.0.5`
- Root `boardTimeRange` now stores the structured `rangeConfig` boundary shape
- Root `path`, `code`, and `savedCode` are no longer written into the saved `.taz` file
- Shared tab metadata such as `sheet`, `shell`, `dashboard`, `refreshKey`, and `mode` is still not written by current `.taz` saves
- Older root `range_bgn`, `range_end`, and scalar `boardTimeRange.start` / `boardTimeRange.end` still load for backward compatibility
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## `2.0.7`

- Current format written when TagAnalyzer saves a `.taz`
- Same panel payload as `2.0.6`
- Root `name` is no longer written because the file-system/tab name already provides it
- Root `boardTimeRange` still stores the structured `rangeConfig` boundary shape
- Older `2.0.6` files with root `name` still load
- On load, TagAnalyzer converts it immediately into internal runtime `PanelInfo`

## Load Flow

- Version detection: [TazVersionResolver.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/versionParsing/TazVersionResolver.ts)
- Boundary parser: [TazBoardVersionParser.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/versionParsing/TazBoardVersionParser.ts)
- Save mapping: [TazPanelSaveMapper.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/save/TazPanelSaveMapper.ts)
- Board save payloads: [TazBoardSaveMapper.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/save/TazBoardSaveMapper.ts)
- Legacy flat-panel adapter: [LegacyFlatPanelMapper.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/legacy/LegacyFlatPanelMapper.ts)

TagAnalyzer UI code uses the internal runtime `PanelInfo` after parsing, not the raw file shape.
