# Time Highlight and Annotation Report
Scope: keep the work inside `src/components/tagAnalyzer` only.

## Current state

- The chart already uses ECharts.
- The main chart option is built in `chart/options/ChartOptionBuilder.ts`.
- The series and existing threshold `markLine` logic live in `panel/chartOptions/PanelChartSeriesUtils.ts`.
- There is already a temporary hover time indicator through `tooltip.axisPointer`.
- There is not a dedicated saved panel field for time annotations today.

## What option to use

- For one exact highlighted time: use `markLine` with `xAxis: <timestamp>`.
- For one highlighted time range: use `markArea` with `xAxis: <start>` and `xAxis: <end>`.
- For one labeled point on one series: use `markPoint` with `coord: [time, value]`.
- For a vertical annotation line with text across the full chart: the cleanest Tag Analyzer approach is a dedicated overlay series that owns `markLine` and `markArea`.

## Do we change an option?

- Yes, for rendering, this is mainly an ECharts option change.
- No, if the annotation must be editable and survive save/load, an option change alone is not enough.
- A saved feature also needs a Tag Analyzer panel model field and Tag Analyzer persistence mapping.

## Recommended Tag Analyzer-only design

- Add `annotations` to the Tag Analyzer panel model, not to shared app state outside Tag Analyzer.
- Suggested shape:
- `type PanelTimeAnnotation = { id: string; kind: 'timeLine' | 'timeRange' | 'point'; time: number; endTime?: number; seriesName?: string; label: string; color: string; }`
- Render from `buildChartSeriesOption(...)` so normal panels and preview panels stay consistent.
- Keep navigator behavior simple: do not render annotation labels in the navigator lane.

## Files to change if it is temporary only

- `chart/options/OptionBuildHelpers/ChartMainSeriesOptions.ts`
- Optional: `chart/options/ChartOptionTypes.ts` for explicit annotation types
- Optional: `panel/PanelChart.tsx` only if the user can add/remove annotations interactively

## Files to change if it must save/load

- `utils/panelModelTypes.ts`
- `utils/legacy/LegacyStorageAdapter.ts`
- `utils/persistence/TazFilePersistence.ts` if the `.taz` helper is used for local save/load shaping
- Optional editor files if users must configure annotations from the panel editor

## Recommendation

- If you only need a visual highlight at a chosen time, change Tag Analyzer chart options only.
- If you need persistent annotations, add a Tag Analyzer-only `annotations` field and map it through Tag Analyzer save/load code.
- The safest implementation stays fully inside `src/components/tagAnalyzer` and does not require shared chart changes outside this feature.
