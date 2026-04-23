# Folder Rename Audit: `src/components/tagAnalyzer/modal`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `CreateChartModal.tsx`
- `FFTModal.tsx`
- `FOLDER_AUDIT.md`
- `OverlapComparisonUtils.test.ts`
- `OverlapComparisonUtils.ts`
- `OverlapModal.tsx`

### Verify
- Direct tracked file count: 6

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `CreateChartModal.tsx`
- `getMinMaxBounds` - line 30, arrow function
- `CreateChartModal` - line 52, arrow function
- `isSameSelectedTag` - line 70, arrow function
- `handleSelectTag` - line 87, arrow function
- `setPanels` - line 104, arrow function
- `onPageChange` - line 267, arrow function
- `onPageInputChange` - line 269, arrow function

#### `FFTModal.tsx`
- `createFFTModalOptions` - line 26, function
- `FFTModal` - line 34, arrow function
- `handleSelectedTag` - line 184, arrow function
- `handle2DChart` - line 195, arrow function
- `handleRunCode` - line 202, arrow function
- `handleSelectInterval` - line 257, arrow function
- `getTqlChartData` - line 263, arrow function

#### `OverlapComparisonUtils.test.ts`
- No named functions found.

#### `OverlapComparisonUtils.ts`
- `shiftOverlapPanels` - line 29, function
- `buildOverlapLoadState` - line 51, function
- `resolveOverlapTimeRange` - line 80, function
- `alignOverlapTime` - line 97, function
- `mapOverlapRows` - line 114, function
- `getNextOverlapPanels` - line 128, function

#### `OverlapModal.tsx`
- `OverlapModal` - line 51, function
- `fetchOverlapPanelData` - line 66, function expression
- `loadOverlapData` - line 158, function expression
- `shiftPanelTime` - line 181, function expression
- `renderOverlapTimeShiftControl` - line 197, function

### Verify
- Direct tracked code files inspected: 5
- Named functions recorded: 25
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
