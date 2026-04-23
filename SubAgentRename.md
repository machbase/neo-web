# SubAgentRename

Scope: `src/components/tagAnalyzer` code files (`.ts` / `.tsx`).

Note: `.codex/agents/use_this_agent.toml` exists, but the subagent API rejected `use_this_agent` as an unknown agent type, so this review used a standard worker subagent.

| file | current name | suggested name | type | reason |
|---|---|---|---|---|
| `src/components/tagAnalyzer/common/tagSelection/TagSelectionSearchRepository.ts` | `fetchTableName` | `fetchTableColumnMetadata` | function | The function fetches column metadata rows for a table, so `fetchTableName` hides the actual payload. |
| `src/components/tagAnalyzer/utils/time/PanelTimeRangeResolver.ts` | `setTimeRange` | `selectTimeRange` | function | The function returns a selected range and has no setter side effect. |
| `src/components/tagAnalyzer/chart/options/ChartYAxisRangeResolver.ts` | `getYAxisValues` | `getYAxisValueBounds` | function | The function returns per-axis min/max bounds, not the underlying Y values. |
| `src/components/tagAnalyzer/utils/fetch/PanelChartStateLoader.ts` | `loadNavigatorChartState` | `loadNavigatorChartData` | function | The loader returns only `ChartData`, while `loadPanelChartState` returns full panel state. |
| `src/components/tagAnalyzer/utils/time/PanelRangeControlLogic.ts` | `getZoomOutRange` | `getZoomOutRangeUpdate` | function | The function returns a `PanelRangeUpdate` containing panel and navigator ranges, not a single range. |
| `src/components/tagAnalyzer/utils/fetch/CalculationFetchQueryBuilder.ts` | `buildCalculationMainQuery` | `buildCalculatedSeriesQuery` | function | The builder creates calculated-series SQL, while `Main` does not describe the query role. |
| `src/components/tagAnalyzer/modal/CreateChartModal.tsx` | `setPanels` | `createAndAppendChart` | function | The function validates selection, fetches bounds, builds a chart, and appends it rather than directly setting panels. |
| `src/components/tagAnalyzer/editor/AddTagsModal.tsx` | `setPanels` | `applySelectedTags` | function | The function commits selected tag drafts into the current panel tag set, not panel state generally. |
| `src/components/tagAnalyzer/editor/OverlapTimeShiftControls.tsx` | `setUtcTime` | `toUtcChartTimestamp` | function | The function returns a converted timestamp and does not set state. |
| `src/components/tagAnalyzer/modal/OverlapComparisonUtils.ts` | `mapOverlapRows` | `rebaseOverlapRowsToSeriesStart` | function | The function subtracts the series start time from row timestamps, which is more specific than generic mapping. |
| `src/components/tagAnalyzer/utils/fetch/ChartSeriesMapper.ts` | `mapRowsToChartData` | `mapFetchRowsToChartRows` | function | The function converts fetch rows into chart row tuples, not a complete chart data object. |
| `src/components/tagAnalyzer/utils/time/TimeBoundaryParsing.ts` | `normalizeTimeRangeConfig` | `resolveTimeRangeConfigBounds` | function | The function resolves structured boundaries into numeric min/max bounds while preserving the config. |
| `src/components/tagAnalyzer/utils/persistence/TazBoardInfoParser.ts` | `parseReceivedBoardInfo` | `parsePersistedTazBoardInfo` | function | The input is persisted `.taz` board data, so `received` is unnecessarily vague. |
| `src/components/tagAnalyzer/TagAnalyzer.tsx` | `hasPersistedTimeRangeChanged` | `hasPersistedPanelStateChanged` | function | The check includes raw-mode changes as well as persisted time ranges. |
| `src/components/tagAnalyzer/utils/series/TagSelectionChartSetup.ts` | `buildCreateChartSeed` | `buildChartCreationSeed` | function | The suggested name keeps the creation context while avoiding the awkward verb phrase. |
| `src/components/tagAnalyzer/editor/PanelEditorConfigConverter.ts` | `mergeAxesDraftIntoPanelAxes` | `convertAxesDraftToPanelAxes` | function | The helper creates a new `PanelAxes` object from the draft and does not merge into an existing axes object. |
| `src/components/tagAnalyzer/modal/FFTModal.tsx` | `getTqlChartData` | `loadTqlChartData` | function | The function performs an async request and updates component state, so `load` better signals the side effect. |
| `src/components/tagAnalyzer/chart/useEChartsPanelInstance.ts` | `useEChartsPanelInstance.ts` | `PanelChartInstanceHooks.ts` | file | The file exports instance, handle-bridge, and ready-sync hooks, so the current file name describes only one export. |
