# Folder Audit: `modal`

## Summary
- Date: 2026-04-22
- Direct files: `3`
- Direct subfolders: none
- Responsibility: This folder owns feature modals plus overlap-comparison helpers.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `modal/OverlapModal.tsx` (310 lines)
- Helper hotspot: none

## Files

### `CreateChartModal.tsx`
- Path: `modal/CreateChartModal.tsx`
- Lines: 294
- Role: Renders the create-chart modal and turns selected tags into a new panel seed.
- Similar files: `modal/OverlapModal.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `getMinMaxBounds` (14 lines, line 32) - Extracts the min and max nanosecond bounds from the min-max response. Needs edit: No. This function is small enough and focused enough for now.
  - `CreateChartModal` (238 lines, line 54) - Collects table, tag, and chart-type choices for creating a new panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `handleSelectTag` (11 lines, line 82) - Adds one selected tag to the pending chart seed. Needs edit: No. This function is small enough and focused enough for now.
  - `setPanels` (40 lines, line 99) - Creates the chart seed and appends it to the current board. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `OverlapComparisonUtils.ts`
- Path: `modal/OverlapComparisonUtils.ts`
- Lines: 168
- Role: Aligns overlap panel datasets onto a shared time window for overlap comparisons.
- Combine note: Review whether the shared concern is large enough to deserve two files; merge only if the combined responsibility becomes clearer.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `shiftOverlapPanels` (15 lines, line 29) - Applies a time-shift change to one overlap panel without mutating the rest of the selection. Needs edit: No. This function is small enough and focused enough for now.
  - `buildOverlapLoadState` (21 lines, line 51) - Splits overlap fetch results into the chart-series list and aligned start-time list. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveOverlapTimeRange` (9 lines, line 80) - Builds the overlap fetch window from the panel start time and anchor duration. Needs edit: No. This function is small enough and focused enough for now.
  - `alignOverlapTime` (9 lines, line 97) - Aligns overlap fetch bounds to the calculated interval when sampling is interval-based. Needs edit: No. This function is small enough and focused enough for now.
  - `mapOverlapRows` (6 lines, line 114) - Normalizes overlap rows so every compared series starts at zero on the shared chart axis. Needs edit: No. This function is small enough and focused enough for now.
  - `getNextOverlapPanels` (40 lines, line 128) - Returns the next overlap-panel selection list after applying the requested change. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `OverlapModal.tsx`
- Path: `modal/OverlapModal.tsx`
- Lines: 310
- Role: Renders the overlap comparison modal and coordinates overlap panel loading and time shifting.
- Similar files: `chart/options/OverlapChartOption.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `OverlapModal` (260 lines, line 49) - Renders the overlap comparison modal for the currently selected panels. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `fetchOverlapPanelData` (83 lines, line 66) - Fetches one overlap panel through the shared series-fetch path and normalizes it for the overlap chart. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `loadOverlapData` (12 lines, line 159) - Loads every currently selected overlap panel and rebuilds the chart state in the original panel order. Needs edit: No. This function is small enough and focused enough for now.
  - `shiftPanelTime` (8 lines, line 182) - Shifts one overlap panel along the shared comparison axis. Needs edit: No. This function is small enough and focused enough for now.
  - `renderOverlapTimeShiftControl` (16 lines, line 198) - Renders one set of time-shift controls for a loaded overlap panel. Needs edit: No. This function is small enough and focused enough for now.

