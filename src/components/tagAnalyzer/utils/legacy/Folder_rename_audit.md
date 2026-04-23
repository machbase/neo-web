# Folder Rename Audit: `src/components/tagAnalyzer/utils/legacy`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

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
- Direct file count: 8

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
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
- Direct code files inspected: 5
- Named functions recorded: 21
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `LegacySeriesAdapter.test.ts`
- No named functions found.

#### `LegacySeriesAdapter.ts`
- `getSourceTagName` line 24: `aItem` (used)
- `withNormalizedSourceTagName` line 42: `aItem` (used)
- `normalizeSourceTagNames` line 63: `aItems` (used)
- `normalizeLegacySeriesConfigs` line 75: `aItems` (used)
- `normalizeLegacyChartSeries` line 87: `aSeries` (used)
- `toLegacyTagNameItem` line 101: `aItem` (used)
- `toLegacyTagNameList` line 118: `aItems` (used)
- `toLegacySeriesConfigs` line 130: `aItems` (used)
- `legacySeriesToChartPoints` line 149: `aSeries` (used)
- `normalizeLegacySeriesConfig` line 172: `aItem` (used)
- `createRuntimeSourceColumnsFromLegacyFields` line 210: `aSourceColumns` (used), `aLegacyColumnNames` (used), `aLegacyColName` (used)
- `fromLegacyBoolean` line 231: `aValue` (used)
- `toLegacyBoolean` line 241: `aValue` (used)
- `legacyChartSeriesHasArrays` line 251: `aSeries` (used)
- `legacyChartSeriesToRows` line 266: `aSeries` (used)

#### `LegacyTimeAdapter.test.ts`
- No named functions found.

#### `LegacyTimeAdapter.ts`
- `normalizeLegacyTimeBoundaryRanges` line 24: `aTimeRange` (used)
- `normalizeLegacyTimeRangeBoundary` line 50: `aStartValue` (used), `aEndValue` (used)
- `toLegacyTimeRangeInput` line 66: `aSource` (used)
- `toLegacyTimeValue` line 87: `aBoundary` (used)
- `legacyMinMaxPairToRange` line 107: `aMin` (used), `aMax` (used)
- `normalizeLegacyTimeBoundary` line 127: `aValue` (used)

#### `LegacyTypes.ts`
- No named functions found.

### Verify
- Named functions checked: 21
- Parameters recorded: 25
- Parameters used: 25
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
- Parameter names reviewed: 25
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
- Function names reviewed: 21
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
- Direct files reviewed: 8
- Code files: 5
- Test files: 2
- Style files: 0
- Documentation/data/other files: 3
- Decision: Keep type-only files separated when they define shared contracts: `LegacyTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
