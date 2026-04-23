# Folder Rename Audit: `src/components/tagAnalyzer/utils/legacy`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `FOLDER_AUDIT.md`
- `LEGACY_FOLDER_AUDIT_CURRENT.md`
- `LEGACY_FOLDER_FUNCTION_AUDIT_CURRENT.md`
- `LegacySeriesAdapter.test.ts`
- `LegacySeriesAdapter.ts`
- `LegacyTimeAdapter.test.ts`
- `LegacyTimeAdapter.ts`
- `LegacyTypes.ts`

### Verify
- Direct tracked file count: 8

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `LegacySeriesAdapter.test.ts`
- No named functions found.

#### `LegacySeriesAdapter.ts`
- `getSourceTagName` - line 24, function
- `withNormalizedSourceTagName` - line 42, function
- `normalizeSourceTagNames` - line 63, function
- `normalizeLegacySeriesConfigs` - line 75, function
- `normalizeLegacyChartSeries` - line 87, function
- `toLegacyTagNameItem` - line 101, function
- `toLegacyTagNameList` - line 118, function
- `toLegacySeriesConfigs` - line 130, function
- `legacySeriesToChartPoints` - line 149, function
- `normalizeLegacySeriesConfig` - line 172, function
- `createRuntimeSourceColumnsFromLegacyFields` - line 210, function
- `fromLegacyBoolean` - line 231, function
- `toLegacyBoolean` - line 241, function
- `legacyChartSeriesHasArrays` - line 251, function
- `legacyChartSeriesToRows` - line 266, function

#### `LegacyTimeAdapter.test.ts`
- No named functions found.

#### `LegacyTimeAdapter.ts`
- `normalizeLegacyTimeBoundaryRanges` - line 24, function
- `normalizeLegacyTimeRangeBoundary` - line 50, function
- `toLegacyTimeRangeInput` - line 66, function
- `toLegacyTimeValue` - line 87, function
- `legacyMinMaxPairToRange` - line 107, function
- `normalizeLegacyTimeBoundary` - line 127, function

#### `LegacyTypes.ts`
- No named functions found.

### Verify
- Direct tracked code files inspected: 5
- Named functions recorded: 21
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
