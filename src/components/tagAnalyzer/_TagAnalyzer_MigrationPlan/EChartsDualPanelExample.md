# ECharts Dual-Panel Example

This snippet shows the ECharts pattern for two stacked time-series panels that stay aligned on one timeline.

The example is truncated inside the first `series.data` array, so treat it as a layout and interaction reference only. It confirms the shared x-axis timeline, linked hover, shared zoom, and separate grid/y-axis setup, but it does not safely confirm the full series list, later styling, or final axis binding beyond the visible fragment.

## Source snippet

```js
timeData = timeData.map(function (str) {
  return str.replace('2009/', '');
});
option = {
  title: {
    text: 'Rainfall vs Evaporation',
    left: 'center'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      animation: false
    }
  },
  legend: {
    data: ['Evaporation', 'Rainfall'],
    left: 10
  },
  toolbox: {
    feature: {
      dataZoom: {
        yAxisIndex: 'none'
      },
      restore: {},
      saveAsImage: {}
    }
  },
  axisPointer: {
    link: [
      {
        xAxisIndex: 'all'
      }
    ]
  },
  dataZoom: [
    {
      show: true,
      realtime: true,
      start: 30,
      end: 70,
      xAxisIndex: [0, 1]
    },
    {
      type: 'inside',
      realtime: true,
      start: 30,
      end: 70,
      xAxisIndex: [0, 1]
    }
  ],
  grid: [
    {
      left: 60,
      right: 50,
      height: '35%'
    },
    {
      left: 60,
      right: 50,
      top: '55%',
      height: '35%'
    }
  ],
  xAxis: [
    {
      type: 'category',
      boundaryGap: false,
      axisLine: { onZero: true },
      data: timeData
    },
    {
      gridIndex: 1,
      type: 'category',
      boundaryGap: false,
      axisLine: { onZero: true },
      data: timeData,
      position: 'top'
    }
  ],
  yAxis: [
    {
      name: 'Evaporation(m3/s)',
      type: 'value',
      max: 500
    },
    {
      gridIndex: 1,
      name: 'Rainfall(mm)',
      type: 'value',
      inverse: true
    }
  ],
  series: [
    {
      name: 'Evaporation',
      type: 'line',
      symbolSize: 8,
      data: [
```

## Pattern summary

- Shared timeline
  `timeData` is cleaned once and reused by both category x-axes, so both panels stay on the same labels and visible time window.

- Linked hover
  `tooltip.trigger: 'axis'` and `axisPointer.link: [{ xAxisIndex: 'all' }]` keep tooltip and crosshair movement aligned across both panels.

- Shared zoom
  The visible slider and the `inside` zoom both target `xAxisIndex: [0, 1]`, so drag, wheel, and touch zoom update the same range in both grids.

- Separate panels, separate scales
  Two `grid` entries create the stacked layout, and two `yAxis` entries let each metric keep its own vertical scale instead of sharing one axis.

- Lower-panel differences
  The second x-axis is attached to `gridIndex: 1` and moved to `position: 'top'`; the second y-axis also targets `gridIndex: 1` and uses `inverse: true`, so the lower panel is intentionally configured differently from the upper one.

- Partial series visibility
  The visible series fragment confirms a line-series setup for `Evaporation` with `type: 'line'` and `symbolSize: 8`, but the cut-off `data` array means we cannot safely infer the complete series data, whether `Rainfall` is fully defined later, or any additional styling and axis assignments after the truncation point.

## TagAnalyzer tie-back

This is the same general pattern we assemble in `panel/PanelEChartUtil.ts`: shared x-domain and interaction wiring, with per-panel grid and axis assignment layered on top.

## Practical takeaway

Use this as the reference shape for stacked, synchronized ECharts panels in TagAnalyzer: one shared timeline, one shared hover/zoom model, separate grids and y-axes, and explicit per-panel overrides where the lower view needs different axis behavior.
