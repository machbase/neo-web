# Folder Audit: `utils/time`

## Summary
- Date: 2026-04-22
- Direct files: `6`
- Direct subfolders: none
- Responsibility: This folder owns time parsing, interval math, range control logic, and panel time-range resolution.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `utils/time/PanelTimeRangeResolver.ts` (827 lines)
- Helper hotspot: `utils/time/PanelTimeRangeResolver.ts` (31 named functions)

## Files

### `IntervalUtils.ts`
- Path: `utils/time/IntervalUtils.ts`
- Lines: 330
- Role: Normalizes time units, converts intervals, and formats duration labels used by panel time logic.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `normalizeTimeUnit` (22 lines, line 169) - Normalizes a user-facing time unit string into the internal enum value. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `convertIntervalUnit` (3 lines, line 198) - Converts a time unit string into the normalized interval unit name. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; this is a very thin wrapper, so keep it only if the name makes call sites clearer.
  - `getTimeUnitMilliseconds` (21 lines, line 209) - Converts a time unit value into milliseconds. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `getIntervalMs` (13 lines, line 238) - Converts a string unit and value into milliseconds when the unit is supported. Needs edit: No. This function is small enough and focused enough for now.
  - `calculateInterval` (20 lines, line 264) - Calculates the interval type and value for a chart time span. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveInterval` (11 lines, line 291) - Selects the interval specification that best matches the requested scale. Needs edit: No. This function is small enough and focused enough for now.
  - `formatDurationLabel` (9 lines, line 310) - Formats a time span into a compact duration label. Needs edit: No. This function is small enough and focused enough for now.
  - `formatDurationPart` (3 lines, line 327) - Formats a single duration component with its suffix. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.

### `PanelRangeControlLogic.ts`
- Path: `utils/time/PanelRangeControlLogic.ts`
- Lines: 316
- Role: Calculates zoom, pan, focus, and navigator range changes for panel time controls.
- Similar files: `editor/sections/EditorTimeTab.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `getNavigatorRangeFromEvent` (6 lines, line 23) - Converts a navigator drag event into a concrete time range. Needs edit: No. This function is small enough and focused enough for now.
  - `getZoomInPanelRange` (7 lines, line 37) - Shrinks a panel range around its center by the requested zoom amount. Needs edit: No. This function is small enough and focused enough for now.
  - `getZoomOutRange` (26 lines, line 53) - Expands a panel range and updates the navigator when the new range escapes it. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `getFocusedPanelRange` (25 lines, line 87) - Creates a focused panel range and matching navigator range around the current center. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `createPanelRangeControlHandlers` (41 lines, line 121) - Builds the panel and navigator range control handlers. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `getMovedPanelRange` (26 lines, line 171) - Shifts the panel range and adjusts the navigator when the panel would leave it. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `getMovedNavigatorRange` (12 lines, line 206) - Shifts both the panel and navigator ranges by the same offset. Needs edit: No. This function is small enough and focused enough for now.
  - `getClampedNavigatorFocusRange` (24 lines, line 227) - Centers a navigator focus range while keeping it inside the navigator bounds. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `getRangeWidth` (3 lines, line 258) - Calculates the width of a time range. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `shiftTimeRange` (6 lines, line 269) - Shifts a time range by a fixed offset. Needs edit: No. This function is small enough and focused enough for now.
  - `getDirectionOffset` (4 lines, line 283) - Converts a range width and direction into a signed offset. Needs edit: No. This function is small enough and focused enough for now. Warning: 4 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isRangeOutsideBounds` (3 lines, line 295) - Checks whether a range extends outside another range. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `applyRangeUpdate` (10 lines, line 306) - Applies a range update when one was produced. Needs edit: No. This function is small enough and focused enough for now.

### `PanelTimeRangeResolver.ts`
- Path: `utils/time/PanelTimeRangeResolver.ts`
- Lines: 827
- Role: Resolves board and panel time inputs into concrete ranges, boundary ranges, and reset behavior.
- Similar files: `editor/sections/EditorTimeTab.tsx`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `resolvePanelTimeRange` (28 lines, line 77) - Resolves the active panel time range for the current mode and inputs. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveResetTimeRange` (8 lines, line 112) - Resolves the panel time range for a reset action. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveInitialPanelRange` (8 lines, line 127) - Resolves the panel time range for an initial load action. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchMinMaxTable` (14 lines, line 143) - Fetches the min and max table response for a series set. Needs edit: No. This function is small enough and focused enough for now.
  - `fetchVirtualStatTable` (21 lines, line 167) - Fetches the time bounds for virtual stat tags. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveTimeBoundaryRanges` - Resolves boundary ranges for a series set into `ValueRangePair`. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeTimeBoundsInput` (16 lines, line 222) - Normalizes optional range input into the input bounds union. Needs edit: No. This function is small enough and focused enough for now.
  - `isSameTimeRange` (3 lines, line 246) - Compares two time ranges for exact equality. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.
  - `toConcreteTimeRange` (9 lines, line 256) - Converts a concrete range source into an optional time range. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeResolvedTimeBounds` (21 lines, line 272) - Normalizes resolved time bounds into a concrete optional range. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `normalizeBoardTimeRangeInput` (9 lines, line 300) - Normalizes board time input into a concrete optional range. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizePanelTimeRangeSource` (20 lines, line 316) - Normalizes the panel time payload into a range source. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `setTimeRange` (11 lines, line 344) - Selects the active time range from the panel, board, or default source. Needs edit: No. This function is small enough and focused enough for now.
  - `restoreTimeRangePair` (22 lines, line 362) - Restores a saved time-range pair when both ranges are complete. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveGlobalTimeTargetRange` (10 lines, line 392) - Chooses the final global time range target. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveEditModeRange` (18 lines, line 412) - Resolves the edit-mode range candidate. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveTopLevelRange` (14 lines, line 440) - Resolves the top-level range candidate for the current mode. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveFallbackRange` (15 lines, line 464) - Resolves the fallback range when no higher-priority rule applies. Needs edit: No. This function is small enough and focused enough for now.
  - `shouldIncludeAbsolutePanelRange` (6 lines, line 487) - Decides whether the absolute panel range should be considered. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeBoardLastRange` (14 lines, line 501) - Normalizes the board's last-relative range into concrete values. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeEditBoardLastRange` (12 lines, line 522) - Normalizes the edit board's last fetched range into a concrete range. Needs edit: No. This function is small enough and focused enough for now.
  - `getDefaultBoardRange` (15 lines, line 542) - Builds the default board range from panel defaults and board input. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeEditPreviewTimeRange` (12 lines, line 564) - Normalizes the edit preview range into a concrete optional range. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeAbsolutePanelRange` (10 lines, line 583) - Normalizes an absolute panel range into a concrete optional range. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeNowPanelRange` (13 lines, line 601) - Normalizes a now-relative panel range through the shared time source selection. Needs edit: No. This function is small enough and focused enough for now.
  - `getRelativePanelLastRange` (32 lines, line 623) - Resolves a relative last-based panel range from fetched tag time boundaries. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolvePanelRangeFromRules` (31 lines, line 662) - Resolves the final panel range by applying the rule chain in priority order. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `createTableTagMap` (32 lines, line 700) - Groups series metadata by table for the min/max query. Needs edit: Warning. This helper is still okay, but it sits inside a file that already has a broad helper surface.
  - `resolveBoundaryValueRangePair` - Resolves the min and max boundary timestamps into `ValueRangePair`. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `buildConcreteTimeRange` (17 lines, line 800) - Builds a concrete optional time range from structured boundaries. Needs edit: No. This function is small enough and focused enough for now.
  - `isCompleteTimeRange` (3 lines, line 824) - Checks whether a partial time range has both start and end values. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; good abstraction because it gives a reusable named guard or conversion.

### `RelativeTimeUtils.ts`
- Path: `utils/time/RelativeTimeUtils.ts`
- Lines: 79
- Role: Converts relative time expressions into concrete timestamps.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `subtractTimeOffset` (3 lines, line 16) - Subtracts a numeric offset from a base timestamp. Needs edit: No. This function is small enough and focused enough for now. Warning: 3 lines; this is a very thin wrapper, so keep it only if the name makes call sites clearer.
  - `getRelativeTimeOffsetMilliseconds` (18 lines, line 27) - Converts a parsed relative boundary into the numeric offset from its anchor time. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveLastRelativeBoundaryTime` (9 lines, line 53) - Resolves a last-relative boundary into a concrete timestamp. Needs edit: No. This function is small enough and focused enough for now.
  - `resolveLastRelativeTimeRange` (9 lines, line 70) - Resolves a parsed last-relative range into a concrete time range. Needs edit: No. This function is small enough and focused enough for now.

### `TimeBoundaryParsing.ts`
- Path: `utils/time/TimeBoundaryParsing.ts`
- Lines: 373
- Role: Parses and formats time boundary values and time-range configuration objects.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `createRelativeTimeBoundary` (14 lines, line 58) - Creates a relative time boundary from its structured parts. Needs edit: No. This function is small enough and focused enough for now.
  - `parseTimeRangeInputValue` (19 lines, line 79) - Parses an editor input string into a structured time boundary. Needs edit: No. This function is small enough and focused enough for now.
  - `formatTimeRangeInputValue` (12 lines, line 105) - Formats a structured boundary back into the editor input string. Needs edit: No. This function is small enough and focused enough for now.
  - `formatAxisTime` (17 lines, line 125) - Formats an axis label based on the currently visible time span. Needs edit: No. This function is small enough and focused enough for now.
  - `isEmptyTimeBoundary` (5 lines, line 149) - Checks whether a boundary is empty. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isAbsoluteTimeBoundary` (5 lines, line 161) - Checks whether a boundary is absolute. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isRelativeTimeBoundary` (5 lines, line 173) - Checks whether a boundary is relative. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isLastRelativeTimeBoundary` (5 lines, line 185) - Checks whether a boundary is a last-relative boundary. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isNowRelativeTimeBoundary` (5 lines, line 197) - Checks whether a boundary is a now-relative boundary. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isRelativeTimeRangeConfig` (5 lines, line 209) - Checks whether both boundaries in a range config are relative. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isLastRelativeTimeRangeConfig` (5 lines, line 221) - Checks whether both boundaries in a range config are last-relative. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isNowRelativeTimeRangeConfig` (5 lines, line 233) - Checks whether both boundaries in a range config are now-relative. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `isAbsoluteTimeRangeConfig` (5 lines, line 245) - Checks whether both boundaries in a range config are absolute. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `resolveTimeBoundaryValue` (21 lines, line 257) - Resolves a structured boundary into a concrete timestamp. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeTimeRangeConfig` (9 lines, line 285) - Converts a time-range config into resolved bounds. Needs edit: No. This function is small enough and focused enough for now.
  - `isConcreteTimeRange` (14 lines, line 301) - Checks whether a time range is concrete enough for chart work. Needs edit: No. This function is small enough and focused enough for now.
  - `hasTimeRangeConfigBoundaries` (10 lines, line 323) - Checks whether a range config has both boundaries of the requested boundary type. Needs edit: No. This function is small enough and focused enough for now.
  - `parseRelativeTimeBoundary` (13 lines, line 340) - Parses a relative time expression into a boundary. Needs edit: No. This function is small enough and focused enough for now.
  - `formatRelativeTimeBoundaryExpression` (11 lines, line 362) - Formats a relative boundary expression from its structured parts. Needs edit: No. This function is small enough and focused enough for now.

### `timeTypes.ts`
- Path: `utils/time/timeTypes.ts`
- Lines: 128
- Role: Defines the shared time types used by panel models, fetch logic, and chart runtime state.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

