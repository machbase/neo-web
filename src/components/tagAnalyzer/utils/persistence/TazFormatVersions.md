# TAZ Format Versions

This directory supports 1 persisted `.taz` format.

## `2.0.0`

- Current and only supported saved `.taz` version
- Root payload fields:
  - `id`
  - `type`
  - `version`
  - `boardTimeRange`
  - `panels`
- Root `name`, `path`, `code`, `savedCode`, `sheet`, `shell`, `dashboard`, `refreshKey`, and `mode` are workspace-only and are not written by current saves
- Panel raw mode is stored in `toolbar.isRaw`
- `data.useRawData` is not written
- Panel time is stored only in `time.rangeConfig`
- The parser rejects older saved `.taz` versions
- TagAnalyzer still bootstraps an empty unsaved board tab into the current shape so a brand-new local tab can open before its first save

## Load Flow

- Version detection: [TazVersionResolver.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/versionParsing/TazVersionResolver.ts)
- Boundary parser: [TazBoardVersionParser.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/versionParsing/TazBoardVersionParser.ts)
- Panel parser: [TazPanelVersionParser.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/versionParsing/TazPanelVersionParser.ts)
- Save mapping: [TazPanelSaveMapper.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/save/TazPanelSaveMapper.ts)
- Board save payloads: [TazBoardSaveMapper.ts](/C:/_github_repos/neo-web/src/components/tagAnalyzer/utils/persistence/save/TazBoardSaveMapper.ts)

TagAnalyzer UI code uses the internal runtime `PanelInfo` after parsing, not the raw file shape.
