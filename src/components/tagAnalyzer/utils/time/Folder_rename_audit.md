# Folder Rename Audit: `src/components/tagAnalyzer/utils/time`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

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
- Direct file count: 12

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
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
- Direct code files inspected: 11
- Named functions recorded: 102
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `IntervalUtils.test.ts`
- No named functions found.

#### `IntervalUtils.ts`
- `buildIntervalSpec` line 32: `aCalc` (used)
- `buildIntervalSpec` line 39: no parameters
- `buildIntervalSpec` line 46: no parameters
- `buildIntervalSpec` line 53: `aCalc` (used)
- `buildIntervalSpec` line 60: no parameters
- `buildIntervalSpec` line 67: no parameters
- `buildIntervalSpec` line 74: no parameters
- `buildIntervalSpec` line 81: no parameters
- `buildIntervalSpec` line 88: no parameters
- `buildIntervalSpec` line 95: no parameters
- `buildIntervalSpec` line 102: `aCalc` (used)
- `buildIntervalSpec` line 109: no parameters
- `buildIntervalSpec` line 116: no parameters
- `buildIntervalSpec` line 123: no parameters
- `buildIntervalSpec` line 130: no parameters
- `buildIntervalSpec` line 137: no parameters
- `buildIntervalSpec` line 144: no parameters
- `normalizeTimeUnit` line 169: `aUnit` (used)
- `convertIntervalUnit` line 198: `aUnit` (used)
- `getTimeUnitMilliseconds` line 209: `aType` (used), `aValue` (used)
- `getIntervalMs` line 238: `aType` (used), `aValue` (used)
- `calculateInterval` line 264: `aStartTime` (used), `aEndTime` (used), `aWidth` (used), `aIsRaw` (used), `aPixelsPerTick` (used), `aPixelsPerTickRaw` (used), `aIsNavigator` (used)
- `resolveInterval` line 291: `aCalc` (used)
- `formatDurationLabel` line 310: `aStartTime` (used), `aEndTime` (used)
- `formatDurationPart` line 327: `aValue` (used), `aSuffix` (used)

#### `PanelRangeControlLogic.ts`
- `getNavigatorRangeFromEvent` line 23: `aEvent` (used)
- `getZoomInPanelRange` line 37: `aPanelRange` (used), `aZoom = default` (used)
- `getZoomOutRange` line 53: `aPanelRange` (used), `aNavigatorRange` (used), `aZoom = default` (used)
- `getFocusedPanelRange` line 87: `aPanelRange` (used), `aNavigatorRange` (used)
- `createPanelRangeControlHandlers` line 121: `aSetExtremes` (used), `aPanelRange` (used), `aNavigatorRange` (used)
- `onShiftPanelRangeLeft` line 128: no parameters
- `onShiftPanelRangeRight` line 133: no parameters
- `onShiftNavigatorRangeLeft` line 138: no parameters
- `onShiftNavigatorRangeRight` line 143: no parameters
- `onZoomIn` line 150: `aZoom` (used)
- `onZoomOut` line 152: `aZoom` (used)
- `onFocus` line 157: no parameters
- `getMovedPanelRange` line 171: `aPanelRange` (used), `aNavigatorRange` (used), `aDirection` (used)
- `getMovedNavigatorRange` line 206: `aPanelRange` (used), `aNavigatorRange` (used), `aDirection` (used)
- `getClampedNavigatorFocusRange` line 227: `aNavigatorRange` (used), `aCenterTime` (used), `aNextWidth` (used)
- `getRangeWidth` line 258: `aRange` (used)
- `shiftTimeRange` line 269: `aRange` (used), `aOffset` (used)
- `getDirectionOffset` line 283: `aRangeWidth` (used), `aDirection` (used)
- `isRangeOutsideBounds` line 295: `aRange` (used), `aBounds` (used)
- `applyRangeUpdate` line 306: `aSetExtremes` (used), `aRangeUpdate` (used)

#### `PanelTimeRangeResolver.test.ts`
- No named functions found.

#### `PanelTimeRangeResolver.ts`
- `resolvePanelTimeRange` line 40: `aParams` (used)
- `fallbackRange` line 64: no parameters
- `resolveResetTimeRange` line 75: `aParams` (used)
- `resolveInitialPanelRange` line 90: `aParams` (used)
- `normalizeTimeBoundsInput` line 106: `aRange` (used), `aRangeConfig` (used)
- `isSameTimeRange` line 130: `aLeft` (used), `aRight` (used)
- `toConcreteTimeRange` line 140: `aRange` (used)
- `normalizeResolvedTimeBounds` line 156: `aTimeBounds` (used)
- `normalizeBoardTimeRangeInput` line 184: `aBoardTime` (used)
- `normalizePanelTimeRangeSource` line 200: `aPanelTime` (used)
- `setTimeRange` line 228: `aPanelRangeSource` (used), `aBoardRangeSource` (used)
- `restoreTimeRangePair` line 246: `aTimeKeeper` (used)
- `resolveGlobalTimeTargetRange` line 276: `aPreOverflowRange` (used), `aPanelRange` (used)
- `resolveEditModeRange` line 296: `aMode` (used), `aTimeBoundaryRanges` (used), `aBoardTime` (used), `aPanelTime` (used)
- `resolveTopLevelRange` line 324: `aMode` (used), `aIsEdit` (used), `aBoardTime` (used), `aTimeBoundaryRanges` (used)
- `resolveFallbackRange` line 348: `aMode` (used), `aIsEdit` (used), `aBoardTime` (used), `aPanelTime` (used)
- `shouldIncludeAbsolutePanelRange` line 371: `aMode` (used), `aIsEdit` (used)
- `normalizeBoardLastRange` line 385: `aBoardTime` (used), `aTimeBoundaryRanges` (used)
- `normalizeEditBoardLastRange` line 406: `aTimeBoundaryRanges` (used)
- `getDefaultBoardRange` line 426: `aBoardTime` (used), `aPanelTime` (used)
- `normalizeEditPreviewTimeRange` line 448: `aTimeBoundaryRanges` (used)
- `normalizeAbsolutePanelRange` line 467: `aPanelTime` (used)
- `normalizeNowPanelRange` line 485: `aBoardTime` (used), `aPanelTime` (used)
- `getRelativePanelLastRange` line 507: `aPanelData` (used), `aBoardTime` (used), `aPanelTime` (used)
- `resolvePanelRangeFromRules` line 546: `topLevelRange` (used), `boardTime` (used), `panelData` (used), `panelTime` (used), `includeAbsolutePanelRange` (used), `fallbackRange` (used)
- `buildConcreteTimeRange` line 585: `aStartValue` (used), `aEndValue` (used)
- `isCompleteTimeRange` line 609: `aRange` (used)

#### `RelativeTimeUtils.ts`
- `subtractTimeOffset` line 16: `aTime` (used), `aOffsetMilliseconds` (used)
- `getRelativeTimeOffsetMilliseconds` line 27: `aAnchorTime` (used), `aBoundary` (used)
- `resolveLastRelativeBoundaryTime` line 53: `aAnchorTime` (used), `aBoundary` (used)
- `resolveLastRelativeTimeRange` line 70: `aAnchorTime` (used), `aRangeConfig` (used)

#### `TimeBoundaryParsing.test.ts`
- No named functions found.

#### `TimeBoundaryParsing.ts`
- `createRelativeTimeBoundary` line 58: `aAnchor` (used), `aAmount` (used), `aUnit` (used), `aExpression = default` (used)
- `parseTimeRangeInputValue` line 79: `aValue` (used)
- `formatTimeRangeInputValue` line 105: `aBoundary` (used)
- `formatAxisTime` line 125: `aValue` (used), `aRange` (used)
- `isEmptyTimeBoundary` line 149: `aBoundary` (used)
- `isAbsoluteTimeBoundary` line 161: `aBoundary` (used)
- `isRelativeTimeBoundary` line 173: `aBoundary` (used)
- `isLastRelativeTimeBoundary` line 185: `aBoundary` (used)
- `isNowRelativeTimeBoundary` line 197: `aBoundary` (used)
- `isRelativeTimeRangeConfig` line 209: `aRangeConfig` (used)
- `isLastRelativeTimeRangeConfig` line 221: `aRangeConfig` (used)
- `isNowRelativeTimeRangeConfig` line 233: `aRangeConfig` (used)
- `isAbsoluteTimeRangeConfig` line 245: `aRangeConfig` (used)
- `resolveTimeBoundaryValue` line 257: `aBoundary` (used)
- `normalizeTimeRangeConfig` line 285: `aRangeConfig` (used)
- `isConcreteTimeRange` line 301: `aTimeRange` (used)
- `hasTimeRangeConfigBoundaries` line 323: `aRangeConfig` (used), `aIsBoundary` (used)
- `parseRelativeTimeBoundary` line 340: `aValue` (used)
- `formatRelativeTimeBoundaryExpression` line 362: `aAnchor` (used), `aAmount` (used), `aUnit` (used)

#### `TimeBoundaryRangeResolver.ts`
- `resolveTimeBoundaryRanges` line 14: `aSeriesConfigSet` (used), `aBoardTime` (used), `aPanelTime` (used)
- `resolveBoundaryValueRangePair` line 30: `aBaseTable` (used), `aBoardTime` (used), `aPanelTime` (used)
- `getActiveBoundaryInput` line 59: `aBoardTime` (used), `aPanelTime` (used)
- `createBoundaryRangePairFromInput` line 68: `aBaseTimeRange` (used)
- `createBoundaryRangePairFromRows` line 87: `aRows` (used)
- `shouldLoadVirtualStatBounds` line 117: `aBaseTimeRange` (used)

#### `TimeRangeFlow.test.ts`
- `createBoardRangeParams` line 44: `aStart` (used), `aEnd` (used)

#### `timeTypes.ts`
- No named functions found.

### Verify
- Named functions checked: 102
- Parameters recorded: 150
- Parameters used: 150
- Parameters unused: 0

### Changed
- Recorded parameter usage for each named function in this folder.
## Step 4. Parameter Names

### Plan
- Decide whether each parameter name is explicit enough for its function role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded parameter names are accepted for now.

### Verify
- Parameter names reviewed: 150
- Parameter rename candidates: 0

### Changed
- No parameter rename candidates remain after the source cleanup.
## Step 5. Function Names

### Plan
- Decide whether each function name matches the function's role.
- Treat names as accepted unless they are listed as review candidates below.

### Execute
- All recorded function names are accepted for now.

### Verify
- Function names reviewed: 102
- Function rename candidates: 0

### Changed
- No function rename candidates remain after the source cleanup.
## Step 6. Unneeded Parameters

### Plan
- Review the unused parameters found in Step 3.
- Remove only parameters that are not required by callbacks, interfaces, tests, or external call signatures.

### Execute
- No unused parameters found in the recorded named functions.

### Verify
- Unused parameter candidates reviewed: 0

### Changed
- No source parameters needed removal in this cleanup pass.
## Step 7. Unneeded Functions

### Plan
- Review each named function for evidence that it is still needed.
- Use a static name scan only as a candidate finder, not as proof that deletion is safe.

### Execute
- No unneeded functions were confirmed by the static scan.

### Verify
- Function removal candidates reviewed: 0

### Changed
- No function removal candidates remain after the source cleanup.
## Step 8. File Consolidation

### Plan
- Review direct files in this folder for consolidation opportunities.
- Consolidate only when it makes ownership clearer and reduces reasons to change.

### Execute
- Direct files reviewed: 12
- Code files: 11
- Test files: 4
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `timeTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
