# Folder Rename Audit: `src/components/tagAnalyzer/utils/time`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `FOLDER_AUDIT.md`
- `IntervalUtils.test.ts`
- `IntervalUtils.ts`
- `PanelRangeControlLogic.ts`
- `PanelTimeRangeResolver.test.ts`
- `PanelTimeRangeResolver.ts`
- `RelativeTimeUtils.ts`
- `TimeBoundaryParsing.test.ts`
- `TimeBoundaryParsing.ts`
- `TimeBoundaryRangeResolver.ts`
- `TimeRangeFlow.test.ts`
- `timeTypes.ts`

### Verify
- Direct tracked file count: 12

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `IntervalUtils.test.ts`
- No named functions found.

#### `IntervalUtils.ts`
- `buildIntervalSpec` - line 32, arrow function
- `buildIntervalSpec` - line 39, arrow function
- `buildIntervalSpec` - line 46, arrow function
- `buildIntervalSpec` - line 53, arrow function
- `buildIntervalSpec` - line 60, arrow function
- `buildIntervalSpec` - line 67, arrow function
- `buildIntervalSpec` - line 74, arrow function
- `buildIntervalSpec` - line 81, arrow function
- `buildIntervalSpec` - line 88, arrow function
- `buildIntervalSpec` - line 95, arrow function
- `buildIntervalSpec` - line 102, arrow function
- `buildIntervalSpec` - line 109, arrow function
- `buildIntervalSpec` - line 116, arrow function
- `buildIntervalSpec` - line 123, arrow function
- `buildIntervalSpec` - line 130, arrow function
- `buildIntervalSpec` - line 137, arrow function
- `buildIntervalSpec` - line 144, arrow function
- `normalizeTimeUnit` - line 169, function
- `convertIntervalUnit` - line 198, function
- `getTimeUnitMilliseconds` - line 209, function
- `getIntervalMs` - line 238, function
- `calculateInterval` - line 264, function
- `resolveInterval` - line 291, function
- `formatDurationLabel` - line 310, function
- `formatDurationPart` - line 327, function

#### `PanelRangeControlLogic.ts`
- `getNavigatorRangeFromEvent` - line 23, function
- `getZoomInPanelRange` - line 37, function
- `getZoomOutRange` - line 53, function
- `getFocusedPanelRange` - line 87, function
- `createPanelRangeControlHandlers` - line 121, function
- `onShiftPanelRangeLeft` - line 128, arrow function
- `onShiftPanelRangeRight` - line 133, arrow function
- `onShiftNavigatorRangeLeft` - line 138, arrow function
- `onShiftNavigatorRangeRight` - line 143, arrow function
- `onZoomIn` - line 150, arrow function
- `onZoomOut` - line 152, arrow function
- `onFocus` - line 157, arrow function
- `getMovedPanelRange` - line 171, function
- `getMovedNavigatorRange` - line 206, function
- `getClampedNavigatorFocusRange` - line 227, function
- `getRangeWidth` - line 258, function
- `shiftTimeRange` - line 269, function
- `getDirectionOffset` - line 283, function
- `isRangeOutsideBounds` - line 295, function
- `applyRangeUpdate` - line 306, function

#### `PanelTimeRangeResolver.test.ts`
- No named functions found.

#### `PanelTimeRangeResolver.ts`
- `resolvePanelTimeRange` - line 40, function
- `fallbackRange` - line 64, arrow function
- `resolveResetTimeRange` - line 75, function
- `resolveInitialPanelRange` - line 90, function
- `normalizeTimeBoundsInput` - line 106, function
- `isSameTimeRange` - line 130, function
- `toConcreteTimeRange` - line 140, function
- `normalizeResolvedTimeBounds` - line 156, function
- `normalizeBoardTimeRangeInput` - line 184, function
- `normalizePanelTimeRangeSource` - line 200, function
- `setTimeRange` - line 228, function
- `restoreTimeRangePair` - line 246, function
- `resolveGlobalTimeTargetRange` - line 276, function
- `resolveEditModeRange` - line 296, function
- `resolveTopLevelRange` - line 324, function
- `resolveFallbackRange` - line 348, function
- `shouldIncludeAbsolutePanelRange` - line 371, function
- `normalizeBoardLastRange` - line 385, function
- `normalizeEditBoardLastRange` - line 406, function
- `getDefaultBoardRange` - line 426, function
- `normalizeEditPreviewTimeRange` - line 448, function
- `normalizeAbsolutePanelRange` - line 467, function
- `normalizeNowPanelRange` - line 485, function
- `getRelativePanelLastRange` - line 507, function
- `resolvePanelRangeFromRules` - line 546, function
- `buildConcreteTimeRange` - line 585, function
- `isCompleteTimeRange` - line 609, function

#### `RelativeTimeUtils.ts`
- `subtractTimeOffset` - line 16, function
- `getRelativeTimeOffsetMilliseconds` - line 27, function
- `resolveLastRelativeBoundaryTime` - line 53, function
- `resolveLastRelativeTimeRange` - line 70, function

#### `TimeBoundaryParsing.test.ts`
- No named functions found.

#### `TimeBoundaryParsing.ts`
- `createRelativeTimeBoundary` - line 58, function
- `parseTimeRangeInputValue` - line 79, function
- `formatTimeRangeInputValue` - line 105, function
- `formatAxisTime` - line 125, function
- `isEmptyTimeBoundary` - line 149, function
- `isAbsoluteTimeBoundary` - line 161, function
- `isRelativeTimeBoundary` - line 173, function
- `isLastRelativeTimeBoundary` - line 185, function
- `isNowRelativeTimeBoundary` - line 197, function
- `isRelativeTimeRangeConfig` - line 209, function
- `isLastRelativeTimeRangeConfig` - line 221, function
- `isNowRelativeTimeRangeConfig` - line 233, function
- `isAbsoluteTimeRangeConfig` - line 245, function
- `resolveTimeBoundaryValue` - line 257, function
- `normalizeTimeRangeConfig` - line 285, function
- `isConcreteTimeRange` - line 301, function
- `hasTimeRangeConfigBoundaries` - line 323, function
- `parseRelativeTimeBoundary` - line 340, function
- `formatRelativeTimeBoundaryExpression` - line 362, function

#### `TimeBoundaryRangeResolver.ts`
- `resolveTimeBoundaryRanges` - line 14, function
- `resolveBoundaryValueRangePair` - line 30, function
- `getActiveBoundaryInput` - line 59, function
- `createBoundaryRangePairFromInput` - line 68, function
- `createBoundaryRangePairFromRows` - line 87, function
- `shouldLoadVirtualStatBounds` - line 117, function

#### `TimeRangeFlow.test.ts`
- `createBoardRangeParams` - line 44, function

#### `timeTypes.ts`
- No named functions found.

### Verify
- Direct tracked code files inspected: 11
- Named functions recorded: 102
- Anonymous inline callbacks were not recorded because this step is for rename-relevant functions.

### Changed
- Replaced the Step 2 placeholder with a named function inventory for this folder.
## Step 3. Parameters

### Plan
- Write down every received parameter and mark which parameters are actually used.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 4. Parameter Names

### Plan
- Decide if each parameter name is appropriate and rename it if needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 5. Function Names

### Plan
- Rename functions so each function name matches the function's role.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 6. Unneeded Parameters

### Plan
- Look through every parameter and remove parameters that are not really needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 7. Unneeded Functions

### Plan
- Look through every function and remove functions that are not really needed.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.

## Step 8. File Consolidation

### Plan
- Look through every file and consolidate files when that makes the code clearer, or keep them separated when that is better.

### Execute
- Not started.

### Verify
- Not started.

### Changed
- Not started.
