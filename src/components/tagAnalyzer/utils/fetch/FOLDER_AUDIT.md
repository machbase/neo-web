# Folder Audit: `utils/fetch`

- Date: 2026-04-22
- Responsibility: fetch-only building blocks for tag-analyzer backend access.
- This folder should own query builders, backend repositories, fetch-only normalizers, and fetch-layer contracts.
- It should not own panel/chart runtime orchestration, tag-selection UI data flow, or time-range decision logic.

## Current Owners

- Query builders: `CalculationFetchQueryBuilder.ts`, `RawFetchQueryBuilder.ts`, `TimeBoundaryFetchQueryBuilder.ts`
- Backend repositories: `TagAnalyzerDataRepository.ts`, `TimeBoundaryFetchRepository.ts`
- Fetch-only helpers: `ChartSeriesRowsLoader.ts`, `ChartSeriesMapper.ts`, `FetchRequestErrorPresenter.ts`, `FetchSampleCountResolver.ts`, `FetchTableNameResolver.ts`, `FetchTimeBoundsNormalizer.ts`
- Fetch contracts: `FetchContracts.ts`, `TimeBoundaryFetchTypes.ts`

## Responsibility Moves Already Done

- Panel/chart load orchestration moved to `chart/PanelChartStateLoader.ts`
- Panel/chart load request/result types moved to `chart/PanelChartLoadContracts.ts`
- Tag-selection search repository moved to `tagSelection/TagSelectionSearchRepository.ts`
- Time-boundary range orchestration moved to `utils/time/TimeBoundaryRangeResolver.ts`

## Watch Next

- `TagAnalyzerDataRepository.ts` still owns several backend endpoints and may want a future split by endpoint family.
- `ChartSeriesRowsLoader.ts` still branches between raw and calculated fetch paths, but it is still fetch-layer work.
