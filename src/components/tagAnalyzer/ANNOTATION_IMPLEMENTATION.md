# Annotation Implementation

- Main UI state lives in `BoardPanel.tsx`.
- `panelState.isAnnotationActive` marks that the annotation popup is the active toolbar mode.
- `createAnnotationPopoverState` stores the create form values:
  `seriesIndex`, `yearText`, `monthText`, `dayText`, `labelText`, `position`.
- `annotationPopoverState` stores edit-popup state for an existing saved annotation:
  `seriesIndex`, `annotationIndex`, `labelText`, `timeRange`, `position`.
- Saved data lives on `pPanelInfo.data.tag_set[seriesIndex].annotations`.
- Each saved annotation is `{ text, timeRange }`.
- Creation uses `applyCreateSeriesAnnotation()`.
- That converts the entered date with `createUtcAnnotationTimestamp(...)`.
- The saved point is a single timestamp, so `startTime === endTime`.
- Editing uses `applySeriesAnnotation()` and delete uses `deleteSeriesAnnotation()`.
- All create/edit/delete paths persist through `pChartBoardActions.onSavePanel(...)`.

- Chart option assembly starts in `chart/options/ChartOptionBuilder.ts`.
- `buildChartOption(...)` calls:
  `buildSeriesAnnotationGuideLineSeries(...)` and `buildSeriesAnnotationLabelSeries(...)`.
- Those builders live in `chart/options/OptionBuildHelpers/PanelSeriesAnnotationOptionBuilder.ts`.
- The guide series is an ECharts `line` series.
- It uses id prefix `annotation-guide-series-`, `silent: true`, `legendHoverLink: false`, `clip: false`, and hidden tooltip.
- The label series is an ECharts `scatter` series.
- It uses id prefix `annotation-label-series-`, `symbol: 'roundRect'`, `clip: false`, hidden tooltip, and series-level label/itemStyle.
- The helper series intentionally have no `name`, so they do not appear in the legend.
- Row stacking happens in `assignAnnotationLabelRows(...)`.
- It spreads nearby labels vertically by y-axis range and estimated time width.
- Anchor resolution happens in `buildRenderableAnnotationAnchors(...)`.
- That finds the nearest rendered chart row with `findNearestChartRow(...)`.

- Click handling lives in `chart/usePanelChartEvents.ts`.
- Creation is not done from chart clicks anymore.
- Clicking an annotation label reads `seriesIndex` and `annotationIndex` from the scatter point payload.
- That opens the edit popup through `onOpenSeriesAnnotationEditor(...)`.
