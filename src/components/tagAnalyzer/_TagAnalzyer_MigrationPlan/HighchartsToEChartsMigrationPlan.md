# Highcharts to ECharts Migration Plan

## Short answer

No. In this Tag Analyzer code, the migration is **not** only about converting `options`.

The easy part is the static chart configuration and the already-fetched series data.
The hard part is the **runtime behavior** currently built around Highcharts/Highstock APIs:

- navigator range sync
- imperative `setExtremes()` control
- drag selection + highlighted range
- tooltip formatting with custom time handling
- export/visible-series lookup
- performance behavior from `boost`
- direct DOM/CSS coupling to Highcharts

## Current Highcharts touch points

| Area | Files | Why it matters |
| --- | --- | --- |
| Main chart renderer | `panel/NewEChart.tsx`, `panel/HighChartConfigure.ts` | Builds the Highstock chart, navigator, tooltip, legend, boost, and render hook. |
| Runtime chart control | `panel/PanelBoardChart.tsx`, `editor/PanelEditorPreviewChart.tsx` | Calls `chartRef.current?.chart`, `xAxis[0].setExtremes(...)`, `navigator.xAxis.setExtremes(...)`, and `navigator.xAxis.getExtremes()`. |
| Drag-select / FFT flow | `panel/PanelBody.tsx` | Uses Highcharts `selection` events and `addPlotBand` / `removePlotBand`. |
| Overlap chart | `modal/OverlapChart.tsx`, `modal/OverlapChartUtil.ts`, `modal/OverlapModal.tsx` | Separate Highcharts renderer with its own tooltip/y-axis logic. |
| Export / visible-series lookup | `src/components/modal/SavedToLocal.tsx` | Reads `pChartRef.current.chart.options.series` to determine visible series. |
| Styling / DOM assumptions | `panel/Panel.scss`, `panel/NewEChart.tsx` | Targets `.highcharts-*` classes and manually edits the Highcharts DOM. |
| Partial ECharts groundwork | `EChartUtil.ts`, `EChartTypes.ts` | Good starting point for option mapping, but incomplete for runtime behavior. |

## What can be migrated easily

These pieces are mostly library-agnostic already, or only need shallow option translation.

### 1. Data fetching and panel model

These should migrate with little or no behavior change:

- `panel/PanelFetchUtil.ts`
- `panel/PanelModelUtil.ts`
- `panel/TagAnalyzerPanelModelTypes.ts`
- `panel/TagAnalyzerPanelTypes.ts`
- `panel/PanelRuntimeUtil.ts`

Reason:

- they mostly produce time ranges, datasets, panel metadata, and UI state
- the fetched dataset shape is already close to ECharts input: `[timestamp, value]`
- most panel/footer/header logic is not tied to Highcharts internals

### 2. Basic option mapping

These Highcharts concepts map fairly directly to ECharts:

| Highcharts | ECharts | Difficulty |
| --- | --- | --- |
| `chart.backgroundColor` | `backgroundColor` | Easy |
| `series.data` | `series[i].data` | Easy |
| `type: 'line'` / `'area'` | `series.type = 'line'` + `areaStyle` | Easy |
| `lineWidth` | `lineStyle.width` | Easy |
| `marker.enabled` / `marker.radius` | `showSymbol` / `symbolSize` | Easy |
| `legend.enabled` | `legend.show` | Easy |
| `xAxis.min/max`, `yAxis.min/max` | same concept | Easy |
| left/right y-axis | `yAxisIndex` + multiple `yAxis` entries | Easy |
| grid line colors | `splitLine.lineStyle` | Easy |
| series color | `color` or per-series style | Easy |

### 3. Existing ECharts conversion helpers

`EChartUtil.ts` and `EChartTypes.ts` are useful for:

- converting simple axis config
- converting basic line/area series config
- converting legend config
- converting simple tooltip look-and-feel
- converting navigator presence into a starter `dataZoom`

This means the repo already has a good **option-conversion seed**.

## What cannot be migrated by options alone

These are the parts that need real implementation work, not just a config rename.

### 1. Highstock navigator

Current behavior depends on Highstock's built-in navigator:

- separate navigator dataset
- independent navigator range
- `navigator.xAxis.setExtremes(...)`
- `navigator.xAxis.getExtremes()`

In ECharts this is not a 1:1 feature.
It will need a combination of:

- `dataZoom`
- explicit `startValue` / `endValue` updates
- probably a renderer adapter to keep panel range and navigator range in sync

Difficulty: **Hard**

### 2. Imperative chart control

Current code does not just render once. It actively controls the chart instance:

- `setExtremes(...)`
- reading current navigator range
- forcing overflow ranges after fetch
- syncing global time changes into the chart

Highcharts and ECharts expose different imperative APIs.

Highcharts:

- `chart.xAxis[0].setExtremes(min, max)`
- `chart.navigator.xAxis.setExtremes(min, max)`

ECharts equivalent direction:

- `dispatchAction({ type: 'dataZoom', ... })`
- `setOption(...)`
- reading `getOption().dataZoom`

Difficulty: **Hard**

### 3. Drag selection and highlighted selection band

`PanelBody.tsx` currently uses:

- Highcharts `selection` event
- `axis.addPlotBand(...)`
- `axis.removePlotBand(...)`

That behavior does not transfer automatically.
In ECharts this likely becomes one of:

- `brush`
- `markArea`
- custom pointer handling with `graphic` or ZRender events

This is especially important because the selection result drives:

- min/max/avg summary popup
- FFT enablement flow

Difficulty: **Hard**

### 4. Plot lines for UCL/LCL

Current y-axis config uses Highcharts `plotLines` for:

- `use_ucl`
- `use_lcl`
- `use_ucl2`
- `use_lcl2`

In ECharts this is usually a `markLine` concern, not axis config.
So the behavior is migratable, but **not by direct option copy**.

Difficulty: **Medium**

### 5. Tooltip formatter behavior

The tooltip is not just styled. It has custom behavior:

- manual timezone offset adjustment
- millisecond handling
- shared multi-series HTML formatting
- overlap-chart absolute-time reconstruction from offset timestamps

This will need a formatter rewrite for ECharts.

Difficulty: **Medium to Hard**

### 6. Performance behavior

The main chart enables:

- `highcharts/modules/boost`
- `boostThreshold`
- `seriesThreshold`

ECharts has different performance tools such as:

- `large`
- `largeThreshold`
- `progressive`
- sampling strategies

The migration needs profiling, not just option mapping.

Difficulty: **Medium to Hard**

### 7. Saved-to-local visibility handling

`SavedToLocal.tsx` currently reads visible series from:

- `pChartRef.current.chart.options.series`

That will break once the ref is an ECharts instance.
The visibility source will need to move to either:

- ECharts legend selected state
- a React-owned visible-series state

Difficulty: **Medium**

### 8. DOM/CSS coupling

Current code reaches into Highcharts DOM:

- `.highcharts-series-group`
- `clip-path` mutation
- `.highcharts-navigator-mask-inside` styles

This must be redesigned, not translated.

Difficulty: **Hard**

## Easy / hard classification by file

### Easier files

- `src/components/tagAnalyzer/panel/PanelFetchUtil.ts`
- `src/components/tagAnalyzer/panel/PanelModelUtil.ts`
- `src/components/tagAnalyzer/panel/PanelRuntimeUtil.ts`
- `src/components/tagAnalyzer/panel/TagAnalyzerPanelModelTypes.ts`
- `src/components/tagAnalyzer/panel/TagAnalyzerPanelTypes.ts`
- `src/components/tagAnalyzer/panel/PanelHeader.tsx`
- `src/components/tagAnalyzer/panel/PanelHeaderButtonGroup.tsx`
- `src/components/tagAnalyzer/panel/PanelFooter.tsx`
- `src/components/tagAnalyzer/panel/PanelFooterZoomGroup.tsx`
- `src/components/tagAnalyzer/EChartTypes.ts`

Why these are easier:

- they mostly manage data, state, or generic UI
- they do not depend on Highcharts DOM APIs
- they can be reused after the renderer contract changes

### Harder files

- `src/components/tagAnalyzer/panel/NewEChart.tsx`
- `src/components/tagAnalyzer/panel/HighChartConfigure.ts`
- `src/components/tagAnalyzer/panel/PanelBoardChart.tsx`
- `src/components/tagAnalyzer/panel/PanelBody.tsx`
- `src/components/tagAnalyzer/editor/PanelEditorPreviewChart.tsx`
- `src/components/tagAnalyzer/editor/PanelEditorPreviewBody.tsx`
- `src/components/tagAnalyzer/modal/OverlapChart.tsx`
- `src/components/tagAnalyzer/modal/OverlapChartUtil.ts`
- `src/components/tagAnalyzer/modal/OverlapModal.tsx`
- `src/components/modal/SavedToLocal.tsx`
- `src/components/tagAnalyzer/panel/Panel.scss`

Why these are harder:

- they contain Highcharts-specific runtime assumptions
- they depend on Highstock navigator behavior
- they use imperative chart-instance APIs
- they rely on selection overlays or chart DOM details

### Partially reusable file

- `src/components/tagAnalyzer/EChartUtil.ts`

Why only partially reusable:

- good for basic option mapping
- not enough for navigator sync
- not enough for selection handling
- not enough for UCL/LCL plot lines
- not enough for tooltip formatter parity
- not enough for export/visibility behavior

## Recommended migration order

### Phase 1. Create a renderer adapter boundary

Before swapping libraries, introduce a small chart adapter contract such as:

- `setPanelRange(start, end)`
- `setNavigatorRange(start, end)`
- `getNavigatorRange()`
- `showSelectionRange(start, end)`
- `clearSelectionRange()`
- `getVisibleSeries()`
- `getContainerRect()`

This reduces the amount of Highcharts logic leaked into:

- `PanelBoardChart.tsx`
- `PanelBody.tsx`
- `PanelEditorPreviewChart.tsx`

### Phase 2. Build ECharts option builder directly from panel state

Instead of converting full Highcharts options at runtime, prefer:

- panel state -> ECharts option builder

Reason:

- the current source of truth is already the panel model, not a saved Highcharts config
- direct builders are easier to reason about than Highcharts-to-ECharts translation chains

`EChartUtil.ts` can still be reused as a starter, but it should not be the final architecture.

### Phase 3. Migrate the main panel renderer first

Target files:

- `panel/NewEChart.tsx`
- `panel/HighChartConfigure.ts`
- `panel/PanelBoardChart.tsx`

Goal:

- get the main board chart working with ECharts
- keep fetch/state logic unchanged
- keep header/footer behavior unchanged

### Phase 4. Rebuild drag selection

Target files:

- `panel/PanelBody.tsx`

Goal:

- replace `selection` + `plotBand` behavior with ECharts `brush`, `markArea`, or custom range overlay
- preserve FFT workflow and min/max/avg popup behavior

### Phase 5. Migrate the editor preview

Target files:

- `editor/PanelEditorPreviewChart.tsx`
- `editor/PanelEditorPreviewBody.tsx`

Goal:

- reuse the same renderer adapter used by the live panel
- avoid maintaining a separate chart-control implementation

### Phase 6. Migrate overlap modal

Target files:

- `modal/OverlapChart.tsx`
- `modal/OverlapChartUtil.ts`
- `modal/OverlapModal.tsx`

Goal:

- move overlap rendering after the main panel renderer is stable
- reuse tooltip/time formatting helpers where possible

### Phase 7. Finish integration cleanup

Target files:

- `src/components/modal/SavedToLocal.tsx`
- `panel/Panel.scss`
- package dependencies

Cleanup items:

- remove Highcharts-specific CSS
- replace ref-based visible-series lookup
- remove `highcharts` and `highcharts-react-official` once no longer used

## Final recommendation

The safest mental model is:

- **easy:** data, state, and basic chart option translation
- **hard:** chart runtime behavior and interaction model

So the migration should be planned as a **renderer replacement with adapter work**, not as a simple option-conversion task.

If you only convert `options`, the main visual chart may appear quickly, but the following will still be incomplete:

- navigator sync
- drag selection
- overflow range correction
- global time sync
- overlap chart parity
- export/visibility parity
- performance parity
