# Folder Audit: `chart`

- Date: 2026-04-22
- Responsibility: chart rendering, chart runtime state, and chart-owned load orchestration.
- This folder should own what the chart needs to render, refresh, zoom, and clamp visible ranges.
- It should not own low-level query building or backend repository calls as first-class concerns.

## Current Owners

- Rendering: `ChartBody.tsx`, `ChartFooter.tsx`, `ChartTimeSummary.tsx`, `TimeSeriesChart.tsx`
- Runtime orchestration: `useChartRuntimeController.ts`
- Chart load orchestration: `PanelChartStateLoader.ts`
- Chart load contracts: `PanelChartLoadContracts.ts`

## Boundary Notes

- `PanelChartStateLoader.ts` is here because it coordinates panel time, interval, sampling, overflow, and chart datasets for the chart layer.
- It is allowed to depend on `utils/fetch`, but `utils/fetch` should not own this orchestration file.

## Watch Next

- `useChartRuntimeController.ts` is still large and owns multiple chart-state transitions.
- `TimeSeriesChart.tsx` is still the biggest mixed-responsibility file in this folder.
