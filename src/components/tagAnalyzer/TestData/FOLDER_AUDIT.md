# Folder Audit: `TestData`

## Summary
- Date: 2026-04-22
- Direct files: `4`
- Direct subfolders: none
- Responsibility: This folder owns the auditable production files for this area.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `TestData/PanelTestData.ts` (532 lines)
- Helper hotspot: `TestData/PanelTestData.ts` (19 named functions)

## Files

### `PanelChartTestData.ts`
- Path: `TestData/PanelChartTestData.ts`
- Lines: 103
- Role: Provides chart-specific panel test fixtures.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `createMockChartInstance` (14 lines, line 51) - Builds a mocked ECharts instance with a default visible zoom window. Needs edit: No. This function is small enough and focused enough for now.
  - `createPanelChartPropsFixture` (31 lines, line 72) - Builds the smallest PanelChart props needed for interaction tests. Needs edit: No. This function is small enough and focused enough for now.

### `PanelEChartTestData.ts`
- Path: `TestData/PanelEChartTestData.ts`
- Lines: 34
- Role: Provides ECharts-oriented panel test fixtures.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `createPanelChartLayoutOptionFixture` (18 lines, line 15) - Builds a compact chart option for layout-focused chart option tests. Needs edit: No. This function is small enough and focused enough for now.

### `PanelTestData.ts`
- Path: `TestData/PanelTestData.ts`
- Lines: 532
- Role: Provides general panel test fixtures.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `stripUndefinedFields` (7 lines, line 35) - Removes undefined override fields from a fixture override object. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerTimeRangeFixture` (9 lines, line 105) - Builds a time-range fixture for panel and navigator tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerSeriesColumnsFixture` (10 lines, line 121) - Builds the source-column mapping used by chart-series fixtures. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerSeriesConfigFixture` (21 lines, line 138) - Builds a series-config fixture for panel, fetch, and adapter tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerFetchSeriesConfigFixture` (15 lines, line 166) - Builds the fetch-focused series config used by TagAnalyzerFetchUtils tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerChartSeriesItemFixture` (16 lines, line 188) - Builds a chart-series item fixture for chart rendering tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerChartSeriesListFixture` (3 lines, line 210) - Builds the default chart-series list used by panel tests. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `createTagAnalyzerChartDataFixture` (8 lines, line 220) - Builds navigator chart data for chart and layout tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerPanelAxesFixture` (29 lines, line 235) - Builds the default panel-axis config used by panel tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerPanelDisplayFixture` (14 lines, line 271) - Builds the default panel-display config used by chart tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerTimeRangePairFixture` (9 lines, line 292) - Builds the default time-range pair used by panel-time tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerPanelDataFixture` (11 lines, line 308) - Builds the default panel-data config used by fetch and runtime tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerPanelTimeFixture` (27 lines, line 326) - Builds the default panel-time config used by runtime and editor tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createEmptyTagAnalyzerPanelTimeFixture` (9 lines, line 360) - Builds a panel-time fixture with blank range bounds for reset/initialization tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerPanelInfoFixture` (54 lines, line 376) - Builds a nested panel-info fixture for editor and model tests. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `createTagAnalyzerBoardSourceInfoFixture` (16 lines, line 437) - Builds the board-source shape passed into the top-level TagAnalyzer workspace. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagAnalyzerEditRequestFixture` (14 lines, line 460) - Builds the top-level edit request shape used to open PanelEditor from TagAnalyzer. Needs edit: No. This function is small enough and focused enough for now.
  - `createPanelFooterPropsFixture` (20 lines, line 481) - Builds the footer props needed by focused footer interaction tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createOverlapPanelInfoFixture` (24 lines, line 508) - Builds the minimal overlap-panel info used by overlap helper tests. Needs edit: No. This function is small enough and focused enough for now.

### `TagSelectionTestData.ts`
- Path: `TestData/TagSelectionTestData.ts`
- Lines: 98
- Role: Provides tag-selection test fixtures.
- Similar files: `tagSelection/TagSelectionPanel.tsx`
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `createTagSelectionSourceColumnsFixture` (8 lines, line 18) - Builds the default source-column mapping used by tag-selection tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagSearchItemFixture` (7 lines, line 34) - Builds a single search-result item for the tag picker. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagSearchItemsFixture` (4 lines, line 47) - Builds the default search-result list used by tag-picker tests. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; good abstraction because it gives a reusable named guard or conversion.
  - `createTagSelectionDraftFixture` (19 lines, line 58) - Builds a selected-series draft fixture for modal selection tests. Needs edit: No. This function is small enough and focused enough for now.
  - `createTagSelectionDraftListFixture` (3 lines, line 83) - Builds the default selected-draft list used by selection-helper tests. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `createTagSelectionStateOptionsFixture` (6 lines, line 92) - Builds the shared useTagSelectionState options used by hook tests. Needs edit: No. This function is small enough and focused enough for now.

