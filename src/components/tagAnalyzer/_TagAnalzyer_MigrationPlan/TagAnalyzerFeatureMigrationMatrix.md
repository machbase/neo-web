# TagAnalyzer Feature Migration Matrix

This document copies the feature hierarchy from `TagAnalyzerUIHierarchy.md` and adds migration notes for each feature.

Terminology used here:

- `Current Highcharts implementation` means the pre-migration TagAnalyzer runtime built around Highcharts and Highstock.
- `ECharts migration target` means the intended ECharts design for the same feature. In the active runtime, many of these target states are already implemented.

Current scope: `src/components/tagAnalyzer`

## State A: Board View

### Page Header

#### Board Toolbar

##### Time range button

Current Highcharts implementation:

- `TagAnalyzerBoardToolbar.tsx` opens the shared board time-range modal.
- The chosen board window flows into `PanelBoardChart.tsx`, which resolves panel and navigator ranges and applies them through Highcharts `setExtremes(...)`.

ECharts migration target:

- Keep the toolbar UI and board-level state flow unchanged.
- Keep the range math in `PanelBoardChart.tsx`, but apply the result through `PanelChartHandle.setPanelRange(...)` and React-owned navigator state, implemented by `panel/NewEChart.tsx` with ECharts `dataZoom`.

##### Refresh data

Current Highcharts implementation:

- The toolbar increments a board refresh signal.
- Each `PanelBoardChart.tsx` refetches main-series data and pushes the refreshed dataset into the Highcharts chart instance.

ECharts migration target:

- Keep the refresh signal and fetch flow unchanged.
- Rebuild the ECharts option from refreshed React state instead of mutating Highcharts series state.

##### Refresh time

Current Highcharts implementation:

- The toolbar asks each panel to recompute its default visible range and navigator window.
- `PanelBoardChart.tsx` then drives Highcharts `xAxis[0].setExtremes(...)` and navigator extremes.

ECharts migration target:

- Keep the same reset semantics.
- Reapply the resolved ranges through the chart handle and `dataZoom`, with navigator state owned in React instead of inside Highstock.

##### Save

Current Highcharts implementation:

- Pure board-level persistence action.
- The saved shape stores panel config and time state, not the live Highcharts instance.

ECharts migration target:

- No chart-library-specific rewrite is needed.
- Continue persisting normalized panel state only; the renderer should continue to be recreated from saved panel config.

##### Save as

Current Highcharts implementation:

- Same as `Save`, but writes a new board entry instead of replacing the current one.

ECharts migration target:

- No renderer-specific change.
- Continue saving panel model state, not chart-library options.

##### Overlap chart button

Current Highcharts implementation:

- Opens `modal/OverlapModal.tsx`.
- The modal fetched overlap series data and rendered a dedicated Highcharts comparison chart through `modal/OverlapChart.tsx` and `modal/OverlapChartUtil.ts`.

ECharts migration target:

- Keep the button and board-selection workflow unchanged.
- Replace the overlap renderer with `ReactECharts` and a shared ECharts option builder while keeping fetch and offset logic in `OverlapModal.tsx`.

### Page Body

#### TagAnalyzerBoard

##### Repeating `PanelBoardChart` (one per panel)

Current Highcharts implementation:

- `TagAnalyzerBoard.tsx` mapped each panel into `panel/PanelBoardChart.tsx`.
- `PanelBoardChart.tsx` owned the panel runtime and called Highcharts/Highstock APIs indirectly through the chart ref.

ECharts migration target:

- Keep `TagAnalyzerBoard.tsx` as a thin mapper.
- Keep `PanelBoardChart.tsx` as the controller, but make it talk to a small ECharts-oriented chart handle instead of a raw Highcharts instance.

#### Panel Header

##### Title / overlap toggle

Current Highcharts implementation:

- `panel/PanelHeader.tsx` rendered the title and overlap toggle.
- Overlap selection state came from board React state, not from Highcharts, but the selected panel window depended on the chart range currently managed via Highcharts extremes.

ECharts migration target:

- Leave the header UI intact.
- Continue using React board state for overlap ownership while taking the current panel range from controller state updated by ECharts events.

##### Anchor flag on the first selected overlap panel

Current Highcharts implementation:

- Pure React/UI behavior owned by the board layer.
- Highcharts was only relevant because the selected panel range came from the Highcharts-controlled window.

ECharts migration target:

- No UI change.
- Continue to derive the anchor from board state and current panel range tracked in React.

##### Current visible time range

Current Highcharts implementation:

- Display text was derived from the visible panel window owned in `PanelBoardChart.tsx`.
- That window was synchronized with Highcharts `setExtremes(...)` and navigator events.

ECharts migration target:

- Keep the display formatting unchanged.
- Drive the text from React panel-range state that is updated by ECharts `datazoom` events.

##### Interval text

Current Highcharts implementation:

- Displayed the resolved fetch interval / range option returned by the data-loading layer.
- Not tied directly to Highcharts rendering.

ECharts migration target:

- No behavior change.
- Continue deriving it from fetch/runtime state.

#### Action Buttons

##### Raw mode toggle

Current Highcharts implementation:

- `PanelBoardChart.tsx` toggled `isRaw`, refetched chart and navigator data, and refreshed the Highcharts-rendered view.
- Time-keeper state was persisted based on the current Highcharts-controlled window.

ECharts migration target:

- Keep the toggle and refetch behavior unchanged.
- Refresh the ECharts option from React state and persist time-keeper state from controller-owned ranges instead of reading Highstock navigator state.

##### Drag-select toggle

Current Highcharts implementation:

- Enabled drag-selection mode in `panel/PanelBody.tsx`.
- `panel/NewEChart.tsx` forwarded a Highcharts `selection` event, and `PanelBody.tsx` highlighted the chosen range using `addPlotBand(...)` / `removePlotBand(...)`.

ECharts migration target:

- Keep the toggle semantics.
- Replace Highcharts selection with ECharts `brush` or an equivalent range-selection layer, and keep the selected-range popup driven by React state.

##### FFT button

Current Highcharts implementation:

- Enabled after a successful Highcharts selection.
- `panel/PanelFFTModal.tsx` used the selected start/end range and series stats produced by `PanelBody.tsx`.

ECharts migration target:

- Keep the FFT modal and its inputs unchanged.
- Feed it from the ECharts brush-selection result rather than Highcharts selection events.

##### Set global time

Current Highcharts implementation:

- `PanelBoardChart.tsx` read the current panel/navigator window, then pushed it to board-level global-time state.
- The source of truth was synchronized with Highcharts main-axis and navigator extremes.

ECharts migration target:

- Keep the same board-level action.
- Use React-owned panel and navigator ranges that are already synchronized from ECharts `dataZoom`.

##### Refresh data

Current Highcharts implementation:

- Re-ran panel data fetch for the current visible range and refreshed the Highcharts series.

ECharts migration target:

- Keep the same button and fetch behavior.
- Rebuild the ECharts series/option from the refreshed panel dataset.

##### Refresh time

Current Highcharts implementation:

- Recomputed the default range for the panel and navigator and reapplied it through Highcharts axis APIs.

ECharts migration target:

- Keep the same reset behavior.
- Drive it through the chart handle and React navigator state.

##### Edit

Current Highcharts implementation:

- Switched the feature into editor mode with the current panel model.
- The live chart renderer was not persisted; the editor rebuilt a separate Highcharts preview from panel config.

ECharts migration target:

- Keep the same editor-open workflow.
- Reuse the same ECharts renderer contract in both board and preview controllers so the preview is not a separate chart-library path.

##### Save to local

Current Highcharts implementation:

- The saved-to-local workflow depended on visible-series lookup from the Highcharts instance.
- Outside TagAnalyzer, that integration read Highcharts series visibility to decide what to export.

ECharts migration target:

- Move visible-series ownership to React legend state or a chart handle such as `getVisibleSeries()`.
- Keep the modal/export workflow, but stop depending on Highcharts internals.

##### Delete

Current Highcharts implementation:

- Pure panel lifecycle action.
- Removing a panel did not depend on Highcharts beyond discarding the mounted chart instance.

ECharts migration target:

- No chart-library-specific change.
- Continue deleting the panel model and unmounting the chart component.

#### Panel Body

##### Left range-shift button

Current Highcharts implementation:

- `PanelRuntimeUtil.ts` calculated the shifted panel window.
- `PanelBoardChart.tsx` applied it through Highcharts `setExtremes(...)`.

ECharts migration target:

- Keep the same range math.
- Apply the shifted range through `PanelChartHandle.setPanelRange(...)` and ECharts `dataZoom`.

##### Main chart area

Current Highcharts implementation:

- `panel/NewEChart.tsx` and `panel/HighChartConfigure.ts` assembled the main Highstock chart.
- This included tooltip formatting, legend config, y-axis config, boost settings, navigator wiring, and selection callbacks.

ECharts migration target:

- Move option construction into `panel/PanelEChartUtil.ts`.
- Render the chart through `ReactECharts` and build the option directly from panel state rather than converting a Highcharts option tree.

##### Main chart

Current Highcharts implementation:

- Rendered the visible panel series on the main Highcharts x-axis.
- Used Highcharts line/area configuration, marker controls, tooltip formatter, and y-axis `plotLines` for thresholds.

ECharts migration target:

- Use ECharts `series` definitions for the main chart.
- Map thresholds to `markLine`, marker behavior to `showSymbol` / `symbolSize`, line width to `lineStyle.width`, and fill behavior to `areaStyle`.

##### Navigator / overview chart

Current Highcharts implementation:

- Relied on the built-in Highstock navigator with its own x-axis state and separate overview dataset.
- `PanelBoardChart.tsx` read and wrote navigator extremes through Highstock APIs.

ECharts migration target:

- Recreate the overview range using a secondary grid plus `dataZoom` and a separately fetched navigator dataset.
- Keep navigator bounds in React state instead of depending on Highstock-owned axis state.

##### Right range-shift button

Current Highcharts implementation:

- Same flow as the left shift button, but moving the visible range forward in time.

ECharts migration target:

- Keep the same controller behavior and apply the next range through the ECharts chart handle.

#### Drag-selection popover

##### Close button

Current Highcharts implementation:

- `PanelBody.tsx` closed the popover and cleared the Highcharts selection highlight / plot band.

ECharts migration target:

- Keep the same close action.
- Clear the ECharts brush area or mark-area overlay instead of removing a Highcharts plot band.

##### Selected start/end timestamps

Current Highcharts implementation:

- Filled from the Highcharts `selection` event payload.

ECharts migration target:

- Fill the same fields from the ECharts brush-selection range.

##### Duration

Current Highcharts implementation:

- Calculated in `TagAnalyzerUtil.ts` from the selected Highcharts range.

ECharts migration target:

- No behavior change.
- Use the selected ECharts brush range as the input.

##### Stats table (`name`, `min`, `max`, `avg`)

Current Highcharts implementation:

- `PanelBody.tsx` computed summary stats for the selected interval from the chart dataset.
- The UI itself was plain React and not Highcharts-specific.

ECharts migration target:

- Keep the same popover UI and stats logic.
- Continue computing stats from the dataset arrays, with no dependency on Highcharts series objects.

#### FFT modal

Current Highcharts implementation:

- `panel/PanelFFTModal.tsx` used the currently selected window and summary values from `PanelBody.tsx`.
- Highcharts only provided the selected range.

ECharts migration target:

- Keep the FFT modal unchanged.
- Feed it from ECharts selection state.

#### Panel Footer

##### Navigator start time + shift left

Current Highcharts implementation:

- `panel/PanelFooter.tsx` showed the current navigator start label.
- Shift-left actions recomputed the navigator window and applied it through Highstock navigator extremes.

ECharts migration target:

- Keep the footer UI.
- Continue updating the navigator window in the controller, but apply it through React-owned range state and ECharts `dataZoom`.

##### Zoom / focus controls

Current Highcharts implementation:

- `panel/PanelFooterZoomGroup.tsx` triggered zoom-in, zoom-out, and focus helpers from `PanelRuntimeUtil.ts`.
- `PanelBoardChart.tsx` then reapplied panel and navigator windows through Highcharts axis APIs.

ECharts migration target:

- Keep the same buttons and range math.
- Apply results through the ECharts chart handle and React navigator state.

##### `Zoom in x4`

Current Highcharts implementation:

- Pure range-math feature followed by Highcharts `setExtremes(...)`.

ECharts migration target:

- Same range-math feature followed by `dataZoom`.

##### `Zoom in x2`

Current Highcharts implementation:

- Same as above with a smaller zoom factor.

ECharts migration target:

- Same behavior through ECharts.

##### `Focus`

Current Highcharts implementation:

- Focused the panel window back onto the currently relevant navigator slice through Highcharts range updates.

ECharts migration target:

- Keep the same focus logic in `PanelRuntimeUtil.ts`.
- Apply the result through the chart handle and navigator state.

##### `Zoom out x2`

Current Highcharts implementation:

- Expanded the visible range and then updated Highcharts extremes.

ECharts migration target:

- Expand the visible range and dispatch the new ECharts zoom window.

##### `Zoom out x4`

Current Highcharts implementation:

- Same as above with a larger factor.

ECharts migration target:

- Same behavior through ECharts.

##### Navigator end time + shift right

Current Highcharts implementation:

- Same overall flow as the left navigator controls, but shifting the navigator window forward.

ECharts migration target:

- Keep the same UI and range math.
- Apply the new navigator window through ECharts state.

#### Add Panel Block

##### Full-width `New Chart` button

Current Highcharts implementation:

- Pure UI entry point that opened `modal/ModalCreateChart.tsx`.
- No Highcharts-specific logic beyond the fact that the created panel config would later be rendered by Highcharts.

ECharts migration target:

- No UI rewrite.
- Keep creating the same panel model, now consumed by the ECharts option builder.

### Modal: New Chart

##### Table dropdown

Current Highcharts implementation:

- Selected the source table for the future panel tags.
- Not Highcharts-specific.

ECharts migration target:

- No change.

##### Chart type picker (`Zone`, `Dot`, `Line`)

Current Highcharts implementation:

- Selected display defaults that `HighChartConfigure.ts` later mapped to Highcharts series settings.

ECharts migration target:

- Keep the same display choices.
- Map them in `PanelEChartUtil.ts` to ECharts line/area/symbol settings instead of Highcharts series config.

##### Tag search input

Current Highcharts implementation:

- Filtered the available tags in the modal.
- Not tied to Highcharts.

ECharts migration target:

- No change.

##### Available tags list

Current Highcharts implementation:

- UI-only list of candidate tags for the new panel.

ECharts migration target:

- No change.

##### Pagination

Current Highcharts implementation:

- UI-only list pagination.

ECharts migration target:

- No change.

##### Selected tags list

Current Highcharts implementation:

- Built the future panel `tag_set`.
- `HighChartConfigure.ts` later used these tags to create Highcharts series.

ECharts migration target:

- Keep building the same `tag_set`.
- Feed it into the ECharts series builder instead of the Highcharts series builder.

##### Tag label

Current Highcharts implementation:

- Label shown in the modal only.

ECharts migration target:

- No change.

##### Calculation mode dropdown

Current Highcharts implementation:

- Stored per-tag calculation behavior that later affected fetch requests and series naming.

ECharts migration target:

- No change to the UI or fetch model.

##### Footer actions (`Apply`, `Cancel`)

Current Highcharts implementation:

- Modal lifecycle only.

ECharts migration target:

- No change.

### Modal: Overlap Chart

##### Refresh button

Current Highcharts implementation:

- `OverlapModal.tsx` refetched overlap data and rebuilt the Highcharts overlap series.

ECharts migration target:

- Keep the same fetch trigger.
- Rebuild the overlap ECharts option from the refreshed offset-series data.

##### Shared overlap chart

Current Highcharts implementation:

- `OverlapChart.tsx` and `OverlapChartUtil.ts` created a dedicated Highcharts config.
- Each series was normalized to a relative overlap axis, and the tooltip reconstructed real timestamps from the series start-time list.

ECharts migration target:

- Build the overlap chart through `PanelEChartUtil.ts` and render it with `ReactECharts`.
- Preserve the same relative-time comparison model, but rewrite the tooltip and axis formatting in ECharts formatter functions.

##### Per-series offset rows

Current Highcharts implementation:

- `OverlapButtonList` and `OverlapModal.tsx` owned the per-series offset UI.
- Shifting a series updated the panel start time and forced a refetch/re-render of the Highcharts overlap chart.

ECharts migration target:

- Keep the UI and state ownership unchanged.
- Re-render the overlap graph through ECharts after each offset update.

##### Color swatch

Current Highcharts implementation:

- Pure UI indicator that matched the rendered series color.

ECharts migration target:

- No change, but keep it aligned with the ECharts series color assignment.

##### Series label

Current Highcharts implementation:

- Derived from the selected panel tag metadata.

ECharts migration target:

- No change.

##### Current compared time window

Current Highcharts implementation:

- Displayed from the shifted panel start plus anchor duration.
- Not specific to Highcharts rendering.

ECharts migration target:

- No change.

##### Shift controls (`Shift left`, `Amount input`, `Unit selector`, `Shift right`)

Current Highcharts implementation:

- Owned by `OverlapModal.tsx` and `OverlapButtonList`.
- Updated panel-relative overlap offsets and reloaded the chart.

ECharts migration target:

- Keep the same shift workflow.
- Ensure refresh/reload uses the latest shifted panel state before rebuilding the ECharts chart.

### External shared modal opened from this view

##### Board time-range modal

Current Highcharts implementation:

- External dependency outside the folder.
- It updated board time bounds, which then propagated into Highcharts range resets inside each panel.

ECharts migration target:

- Keep the external modal unchanged.
- Let panel controllers translate its chosen range into ECharts `dataZoom` state.

## State B: Panel Editor View

### Editor Header

##### Back

Current Highcharts implementation:

- Editor shell action only.
- No direct Highcharts dependency.

ECharts migration target:

- No change.

##### Discard

Current Highcharts implementation:

- Editor draft-state lifecycle only.

ECharts migration target:

- No change.

##### Apply

Current Highcharts implementation:

- Copied draft config back into the runtime panel model.
- The live board later recreated a Highcharts panel from the updated config.

ECharts migration target:

- Same editor flow.
- The live board recreates the panel from the updated config through the ECharts renderer.

##### Save

Current Highcharts implementation:

- Persisted the edited panel config.

ECharts migration target:

- No change to the save flow.

### Live Preview Pane

#### Preview Panel Card

##### Preview Header

###### Title

Current Highcharts implementation:

- Display-only preview metadata.

ECharts migration target:

- No change.

###### Current visible time range

Current Highcharts implementation:

- Derived from the preview controller state synchronized with Highcharts range changes.

ECharts migration target:

- Keep the same display and derive it from preview React state synchronized with ECharts `dataZoom`.

###### Interval text

Current Highcharts implementation:

- Derived from preview fetch/runtime state, not directly from Highcharts.

ECharts migration target:

- No change.

###### Action buttons

###### Raw mode toggle

Current Highcharts implementation:

- `editor/PanelEditorPreviewChart.tsx` toggled raw mode, refetched panel data, and refreshed the Highcharts preview and overview datasets.

ECharts migration target:

- Keep the same preview controller behavior.
- Rebuild the ECharts preview option from refreshed state.

###### Refresh data

Current Highcharts implementation:

- Refetched preview main-series data and reapplied it to the Highcharts preview chart.

ECharts migration target:

- Keep the same preview data-refresh action and rerender the ECharts preview.

###### Refresh time

Current Highcharts implementation:

- Recomputed preview ranges from the editor settings and reapplied them through Highcharts extremes.

ECharts migration target:

- Keep the same reset semantics with ECharts range updates.

##### Preview Body

###### Left range-shift button

Current Highcharts implementation:

- Same range-shift logic as the live board panel, but inside the preview controller.

ECharts migration target:

- Keep the shared range math and apply it through the preview chart handle.

###### Preview chart + navigator

Current Highcharts implementation:

- `PanelEditorPreviewBody.tsx` and `PanelEditorPreviewChart.tsx` rendered a separate Highcharts preview flow.
- It mirrored the board chart but had lighter behavior than the live board controller.

ECharts migration target:

- Use the same chart display contract as the live board where possible.
- Keep the preview-specific header/actions, but reuse the ECharts chart body and navigator rendering path.

###### Right range-shift button

Current Highcharts implementation:

- Same as the left shift button, but moving forward in time.

ECharts migration target:

- Same behavior through the ECharts preview renderer.

##### Preview Footer

###### Navigator start/end time

Current Highcharts implementation:

- Preview footer labels were fed from preview navigator state synchronized with Highcharts navigator behavior.

ECharts migration target:

- Keep the footer labels and feed them from React-owned preview navigator state.

###### Zoom / focus controls

Current Highcharts implementation:

- Reused the same range helpers as the live panel and applied the results through Highcharts preview range APIs.

ECharts migration target:

- Reuse the same helpers and apply results through the preview chart handle and ECharts `dataZoom`.

### Divider

Current Highcharts implementation:

- Layout-only UI element.

ECharts migration target:

- No change.

### Settings Pane

#### Tab strip (`General`, `Data`, `Axes`, `Display`, `Time`)

Current Highcharts implementation:

- Editor navigation only.
- No chart-library coupling.

ECharts migration target:

- No change.

#### Active tab content

##### General

###### Chart title

Current Highcharts implementation:

- Updated panel metadata consumed by the preview header and chart title text.

ECharts migration target:

- No change.

###### Use zoom when dragging

Current Highcharts implementation:

- Controlled whether drag gestures should behave like zoom/selection in the Highcharts preview/live chart flow.

ECharts migration target:

- Map this to ECharts interaction mode selection, typically switching between `dataZoom`-driven drag behavior and `brush`-driven range selection.

###### Keep navigator position

Current Highcharts implementation:

- Controller/editor setting that preserved the current preview navigator window across draft changes.
- Not inherently Highcharts-specific, though it was applied against Highcharts navigator state.

ECharts migration target:

- Keep the same setting.
- Preserve React-owned preview navigator state across edits.

##### Data

###### Repeating tag cards

Current Highcharts implementation:

- Edited the future `tag_set` for the panel.
- Highcharts later rendered one series per configured tag.

ECharts migration target:

- Keep the same editor model.
- Render one ECharts series per configured tag.

###### Calculation mode

Current Highcharts implementation:

- Affected the fetch query and the rendered label/series identity.

ECharts migration target:

- No change.

###### Tag name

Current Highcharts implementation:

- Metadata shown in the editor and used in fetch requests.

ECharts migration target:

- No change.

###### Alias

Current Highcharts implementation:

- Affected the rendered legend/series label.

ECharts migration target:

- No change.

###### Color picker

Current Highcharts implementation:

- Set the Highcharts series color.

ECharts migration target:

- Set the ECharts series `color`, `lineStyle.color`, and `itemStyle.color`.

###### Remove tag

Current Highcharts implementation:

- Removed the tag from the panel config and rebuilt the Highcharts preview.

ECharts migration target:

- Keep the same editor action and rebuild the ECharts preview.

###### Add tag button

Current Highcharts implementation:

- Opened the add-tag modal.

ECharts migration target:

- No change.

###### Modal: Add Tag

Current Highcharts implementation:

- Editor UI only.

ECharts migration target:

- No change.

###### Table dropdown

Current Highcharts implementation:

- Filtered/search-scoped the add-tag list.

ECharts migration target:

- No change.

###### Tag search input

Current Highcharts implementation:

- UI-only search field.

ECharts migration target:

- No change.

###### Available tags list

Current Highcharts implementation:

- UI-only list of addable tags.

ECharts migration target:

- No change.

###### Pagination

Current Highcharts implementation:

- UI-only list pagination.

ECharts migration target:

- No change.

###### Selected tags list

Current Highcharts implementation:

- Draft editor state only.

ECharts migration target:

- No change.

###### Footer actions (`OK`, `Cancel`)

Current Highcharts implementation:

- Modal lifecycle only.

ECharts migration target:

- No change.

##### Axes

###### X-Axis section

Current Highcharts implementation:

- `HighChartConfigure.ts` mapped panel axis settings into Highcharts x-axis config and fetch interval decisions.

ECharts migration target:

- `PanelEChartUtil.ts` maps the same panel axis settings into ECharts x-axis and data-zoom config while preserving fetch-side interval decisions.

###### Show X tick line

Current Highcharts implementation:

- Controlled Highcharts x-axis grid line visibility/styling.

ECharts migration target:

- Map to ECharts `xAxis.splitLine.show` and related axis styling.

###### Pixels per tick: Raw

Current Highcharts implementation:

- Influenced raw sampling density and visible tick density.

ECharts migration target:

- Keep the same fetch/runtime math and let the ECharts axis consume the resulting dataset density.

###### Pixels per tick: Calculation

Current Highcharts implementation:

- Same as above for non-raw/calculated series.

ECharts migration target:

- Same controller/fetch behavior with ECharts rendering.

###### Sampling toggle + value

Current Highcharts implementation:

- Controlled whether navigator/main data should use sampled fetch results and Highcharts boost-friendly dataset sizes.

ECharts migration target:

- Keep the same fetch-side sampling behavior.
- Optionally complement it with ECharts `sampling`, `large`, and `progressive` settings.

###### Y-Axis section

Current Highcharts implementation:

- `HighChartConfigure.ts` built the primary Highcharts y-axis config including min/max, tick lines, and threshold `plotLines`.

ECharts migration target:

- `PanelEChartUtil.ts` builds the primary ECharts y-axis and threshold `markLine` configuration from the same axis settings.

###### Zero-base toggle

Current Highcharts implementation:

- Forced the left y-axis minimum toward zero when enabled.

ECharts migration target:

- Keep the same behavior with ECharts `min` / `scale` handling.

###### Show Y tick line

Current Highcharts implementation:

- Controlled Highcharts y-axis grid lines.

ECharts migration target:

- Map to ECharts `splitLine.show`.

###### Custom scale

Current Highcharts implementation:

- Mapped to explicit Highcharts y-axis `min` / `max`.

ECharts migration target:

- Map to explicit ECharts y-axis `min` / `max`.

###### Raw custom scale

Current Highcharts implementation:

- Used alternate y-axis min/max values for raw mode.

ECharts migration target:

- Keep the same alternate axis-range behavior.

###### UCL / LCL controls

Current Highcharts implementation:

- Rendered threshold lines with Highcharts y-axis `plotLines`.

ECharts migration target:

- Render threshold lines with ECharts `markLine`.

###### Additional Y-Axis section

Current Highcharts implementation:

- Configured a second Highcharts y-axis and series assignment to that axis.

ECharts migration target:

- Configure a second ECharts y-axis and map assigned series with `yAxisIndex`.

###### Enable Y2

Current Highcharts implementation:

- Turned on the second Highcharts axis.

ECharts migration target:

- Turn on the second ECharts y-axis.

###### Zero-base / tick-line controls

Current Highcharts implementation:

- Same as the primary axis controls, but for Y2.

ECharts migration target:

- Same mapping for the second ECharts y-axis.

###### Custom scale

Current Highcharts implementation:

- Explicit min/max for Y2 in calculated mode.

ECharts migration target:

- Explicit min/max for ECharts Y2.

###### Raw custom scale

Current Highcharts implementation:

- Explicit min/max for Y2 in raw mode.

ECharts migration target:

- Same behavior in ECharts.

###### UCL / LCL controls

Current Highcharts implementation:

- Highcharts `plotLines` on the second y-axis.

ECharts migration target:

- ECharts `markLine` on series assigned to Y2.

###### Tag assignment list for Y2

Current Highcharts implementation:

- Determined which Highcharts series received `yAxis: 1`.

ECharts migration target:

- Determine which ECharts series receive `yAxisIndex: 1`.

##### Display

###### Chart type thumbnails (`Zone`, `Dot`, `Line`)

Current Highcharts implementation:

- Chose how `HighChartConfigure.ts` built each series style, such as area fill and marker emphasis.

ECharts migration target:

- Keep the same three display intents and map them to ECharts line/area/symbol settings in `PanelEChartUtil.ts`.

###### Show points

Current Highcharts implementation:

- Highcharts `marker.enabled`.

ECharts migration target:

- ECharts `showSymbol`.

###### Show legend

Current Highcharts implementation:

- Highcharts `legend.enabled`.

ECharts migration target:

- ECharts `legend.show`.

###### Point radius

Current Highcharts implementation:

- Highcharts `marker.radius`.

ECharts migration target:

- ECharts `symbolSize`.

###### Fill opacity

Current Highcharts implementation:

- Highcharts area-fill opacity for filled/zone style series.

ECharts migration target:

- ECharts `areaStyle.opacity`.

###### Line thickness

Current Highcharts implementation:

- Highcharts `lineWidth`.

ECharts migration target:

- ECharts `lineStyle.width`.

##### Time

###### From date/time picker

Current Highcharts implementation:

- Updated panel time configuration consumed by preview/live controllers.
- The resolved range was then applied through Highcharts extremes.

ECharts migration target:

- Keep the same editor input and range resolution logic.
- Apply the resolved range through the ECharts chart handle.

###### To date/time picker

Current Highcharts implementation:

- Same as above for the panel end time.

ECharts migration target:

- Same behavior through ECharts range updates.

###### Quick ranges

Current Highcharts implementation:

- Converted a relative choice into a concrete panel time range and reloaded the Highcharts preview/live panel.

ECharts migration target:

- No change in time-range resolution; only the chart application layer changes.

###### Clear custom time

Current Highcharts implementation:

- Reverted the panel to default time behavior and reset the Highcharts preview/live ranges.

ECharts migration target:

- Keep the same reset behavior with ECharts.

## UI Notes

### Selecting a panel for overlap highlights its border, and the first selected panel becomes the overlap anchor

Current Highcharts implementation:

- Border/anchor rendering was pure React/UI logic.
- The selected comparison range depended on the panel window controlled through Highcharts.

ECharts migration target:

- Keep the same board-selection UI.
- Use React-controlled panel ranges synchronized from ECharts events.

### Overlap selection is only available for single-tag panels

Current Highcharts implementation:

- Guard lived in the board/panel controller layer, not in Highcharts.

ECharts migration target:

- No change.

### Opening the editor replaces the normal board view with a full-screen editing workspace

Current Highcharts implementation:

- Feature-level view switch in `TagAnalyzer.tsx`.
- The preview then mounted its own Highcharts-driven chart path.

ECharts migration target:

- Keep the same feature-level view switch.
- Mount the preview through the shared ECharts chart path instead of a separate Highcharts implementation.
