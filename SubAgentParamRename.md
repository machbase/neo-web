# SubAgentParamRename

Scope: `src/components/tagAnalyzer` code files (`.ts` / `.tsx`).

Note: `.codex/agents/use_this_agent.toml` exists, but the subagent API rejected `use_this_agent` as an unknown agent type, so this review used a standard worker subagent.

| file | function | current parameter | suggested parameter | reason |
|---|---|---|---|---|
| `src/components/tagAnalyzer/chart/ChartInteractionUtils.ts` | `extractDataZoomRange` | `aParams` | `aZoomPayload` | Clarifies this is the ECharts data-zoom payload. |
| `src/components/tagAnalyzer/chart/ChartInteractionUtils.ts` | `extractBrushRange` | `aParams` | `aBrushPayload` | Distinguishes brush event data from generic params. |
| `src/components/tagAnalyzer/chart/PanelNavigateStateUtils.ts` | `buildNavigateStatePatchFromPanelLoad` | `aResult` | `aLoadState` | Matches the `PanelChartLoadState` meaning used by callers. |
| `src/components/tagAnalyzer/chart/useChartRuntimeController.ts` | `applyPanelAndNavigatorRanges` | `aRaw` | `aIsRaw` | Makes the boolean intent explicit. |
| `src/components/tagAnalyzer/chart/usePanelChartDataRefresh.ts` | `refreshPanelData` | `aTimeRange` | `aRequestedPanelRange` | Clarifies this optional range is the visible panel range being requested. |
| `src/components/tagAnalyzer/chart/options/ChartThresholdSeriesOptions.ts` | `buildThresholdLine` | `aUseFlag` | `aIsThresholdEnabled` | Replaces a vague boolean flag with its actual condition. |
| `src/components/tagAnalyzer/chart/options/OptionBuildHelpers/ChartTooltipOption.ts` | `formatter` | `aParams` | `aTooltipParams` | Clarifies these are tooltip callback params from ECharts. |
| `src/components/tagAnalyzer/common/tagSelection/TagSelectionSearchRepository.ts` | `buildTableColumns` | `aRows` | `aColumnRows` | Clarifies the rows contain source column metadata. |
| `src/components/tagAnalyzer/common/tagSelection/TagSelectionSearchRepository.ts` | `normalizeTagSearchItems` | `aRows` | `aPaginationRows` | Distinguishes tag result rows from other repository rows. |
| `src/components/tagAnalyzer/editor/AddTagsModal.tsx` | `isSameSelectedTag` | `bItem` | `aOtherItem` | Removes the inconsistent `b` prefix and clarifies it is the comparison item. |
| `src/components/tagAnalyzer/editor/sections/EditorAxesTab.tsx` | `setY2TagList` | `aValue` | `aSeriesKey` | The value is used as a series key, not a generic value. |
| `src/components/tagAnalyzer/editor/sections/EditorDataTab.tsx` | `updateSourceTagName` | `aValue` | `aSourceTagName` | Matches the field being updated. |
| `src/components/tagAnalyzer/editor/sections/EditorDisplayTab.tsx` | `changeChartType` | `aValue` | `aChartType` | Clarifies the dropdown value is a chart type. |
| `src/components/tagAnalyzer/modal/OverlapComparisonUtils.ts` | `shiftOverlapPanels` | `aRange` | `aShiftAmountMs` | The parameter is an offset amount, not a time range. |
| `src/components/tagAnalyzer/modal/OverlapModal.tsx` | `shiftPanelTime` | `aType` | `aDirection` | The parameter controls shift direction, not a general type. |
| `src/components/tagAnalyzer/utils/fetch/FetchTimeBoundsNormalizer.ts` | `toUnixNanoseconds` | `aTime` | `aUnixMilliseconds` | Makes the source unit explicit before conversion. |
| `src/components/tagAnalyzer/utils/fetch/PanelChartOverflowPolicy.ts` | `analyzePanelDataLimit` | `aRows` | `aFetchedRows` | Clarifies these rows are backend fetch results. |
| `src/components/tagAnalyzer/utils/time/IntervalUtils.ts` | `calculateInterval` | `aWidth` | `aChartWidth` | Makes the pixel-width source explicit. |
| `src/components/tagAnalyzer/utils/time/IntervalUtils.ts` | `resolveInterval` | `aCalc` | `aSecondsPerTick` | Replaces a vague calculation name with the computed meaning. |
| `src/components/tagAnalyzer/utils/time/PanelRangeControlLogic.ts` | `shiftTimeRange` | `aOffset` | `aOffsetMs` | Makes the time unit explicit. |
