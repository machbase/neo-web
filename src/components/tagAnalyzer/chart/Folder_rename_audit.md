# Folder Rename Audit: `src/components/tagAnalyzer/chart`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `ChartBody.test.tsx`
- `ChartBody.tsx`
- `ChartFooter.scss`
- `ChartFooter.test.tsx`
- `ChartFooter.tsx`
- `ChartHeader.scss`
- `ChartShell.scss`
- `ChartTimeSummary.tsx`
- `FOLDER_AUDIT.md`
- `PanelChartLoadContracts.ts`
- `PanelChartStateLoader.test.ts`
- `PanelChartStateLoader.ts`
- `RESPONSIBILITY_REFACTOR_PLAN.md`
- `TimeSeriesChart.test.tsx`
- `TimeSeriesChart.tsx`
- `useChartRuntimeController.test.ts`
- `useChartRuntimeController.ts`

### Verify
- Direct tracked file count: 17

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `ChartBody.test.tsx`
- `MockTimeSeriesChart` - line 27, arrow function
- `FFTModal` - line 47, arrow function
- `Popover` - line 51, arrow function
- `Button` - line 61, arrow function
- `Page` - line 73, arrow function
- `VscChevronLeft` - line 91, arrow function
- `VscChevronRight` - line 92, arrow function
- `Close` - line 93, arrow function
- `createChartBodyProps` - line 101, function

#### `ChartBody.tsx`
- `ChartBody` - line 24, arrow function
- `handleChartMouseDownCapture` - line 70, function

#### `ChartFooter.test.tsx`
- `Button` - line 16, arrow function

#### `ChartFooter.tsx`
- `ChartFooter` - line 26, arrow function

#### `ChartTimeSummary.tsx`
- `ChartTimeSummary` - line 9, arrow function

#### `PanelChartLoadContracts.ts`
- No named functions found.

#### `PanelChartStateLoader.test.ts`
- No named functions found.

#### `PanelChartStateLoader.ts`
- `loadNavigatorChartState` - line 32, function
- `loadPanelChartState` - line 52, function

#### `TimeSeriesChart.test.tsx`
- `getEchartsInstance` - line 25, arrow function
- `getBuildChartOptionMock` - line 72, arrow function
- `getBuildChartSeriesOptionMock` - line 83, arrow function
- `getExtractDataZoomRangeMock` - line 94, arrow function
- `value` - line 217, arrow function
- `toJSON` - line 226, arrow function

#### `TimeSeriesChart.tsx`
- `TimeSeriesChart` - line 31, arrow function
- `setPanelRange` - line 136, arrow function
- `getVisibleSeries` - line 139, arrow function

#### `useChartRuntimeController.test.ts`
- No named functions found.

#### `useChartRuntimeController.ts`
- `useChartRuntimeController` - line 54, function
- `updateNavigateState` - line 74, function expression
- `notifyPanelRangeApplied` - line 102, function expression
- `applyPanelAndNavigatorRanges` - line 117, function expression
- `handleNavigatorRangeChange` - line 165, function expression
- `handlePanelRangeChange` - line 178, function expression
- `setExtremes` - line 206, function expression
- `applyLoadedRanges` - line 224, function expression
- `refreshPanelData` - line 249, arrow function

### Verify
- Direct tracked code files inspected: 12
- Named functions recorded: 34
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
