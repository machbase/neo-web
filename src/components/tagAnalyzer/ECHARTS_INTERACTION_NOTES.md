# ECharts Interaction Notes

- If the chart uses `renderer: 'canvas'`, labels and shapes are not DOM elements.
- That means you cannot attach React `onClick` directly to a chart label.
- Use ECharts chart events like `click` and `contextmenu` to detect what was hit.
- The event payload tells you what was clicked, such as `componentType`, `seriesId`, `seriesIndex`, `dataIndex`, and `name`.
- `markArea` is good for drawing highlight regions, but it is not ideal for precise label-only click detection.
- If you only need "click the highlight area to edit", `markArea` is enough.
- If you need "click the label only", use a separate `custom` series or `graphic` text element layer.
- To rename a chart item, open a normal HTML `<input>` overlay in React, not an input inside the canvas.
- Position that input with absolute coordinates from the chart click event.
- Save on `Enter` or `blur`, then update the source model and persist it.
- For nested right-click behavior, child and parent handlers both exist unless the child stops propagation.
- If the child `contextmenu` handler calls `stopPropagation()`, it overrides the parent panel menu.
- If the child does not stop propagation, the parent panel right-click handler can still run.
