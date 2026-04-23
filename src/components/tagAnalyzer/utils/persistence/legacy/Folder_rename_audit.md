# Folder Rename Audit: `src/components/tagAnalyzer/utils/persistence/legacy`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `FOLDER_AUDIT.md`
- `LegacyFlatPanelMapper.test.ts`
- `LegacyFlatPanelMapper.ts`
- `LegacyFlatPanelTypes.ts`

### Verify
- Direct file count: 4

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `LegacyFlatPanelMapper.test.ts`
- `normalizeLegacyPanelInfoForTest` - line 16, function
- `createRuntimeAxes` - line 26, function

#### `LegacyFlatPanelMapper.ts`
- `createPanelInfoFromLegacyFlatPanelInfo` - line 21, function
- `toLegacyFlatPanelInfo` - line 33, function
- `resolvePanelTimeRangeConfig` - line 85, function
- `normalizeLegacyFlatPanelInfo` - line 93, function
- `createNormalizedLegacyPanelInfo` - line 146, function
- `normalizeNumericValue` - line 234, function
- `normalizeLegacyTimeKeeper` - line 242, function

#### `LegacyFlatPanelTypes.ts`
- No named functions found.

### Verify
- Direct code files inspected: 3
- Named functions recorded: 9
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `LegacyFlatPanelMapper.test.ts`
- `normalizeLegacyPanelInfoForTest` line 16: `aPanelInfo` (used)
- `createRuntimeAxes` line 26: `aRawDataPixelsPerTick` (used), `aCalculatedDataPixelsPerTick` (used)

#### `LegacyFlatPanelMapper.ts`
- `createPanelInfoFromLegacyFlatPanelInfo` line 21: `aPanelInfo` (used)
- `toLegacyFlatPanelInfo` line 33: `aPanelInfo` (used)
- `resolvePanelTimeRangeConfig` line 85: `aPanelInfo` (used)
- `normalizeLegacyFlatPanelInfo` line 93: `aPanelInfo` (used)
- `createNormalizedLegacyPanelInfo` line 146: `aPanelInfo` (used)
- `normalizeNumericValue` line 234: `aValue` (used)
- `normalizeLegacyTimeKeeper` line 242: `aTimeKeeper` (used)

#### `LegacyFlatPanelTypes.ts`
- No named functions found.

### Verify
- Named functions checked: 9
- Parameters recorded: 10
- Parameters used: 10
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
- Parameter names reviewed: 10
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
- Function names reviewed: 9
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
- Direct files reviewed: 4
- Code files: 3
- Test files: 1
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `LegacyFlatPanelTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
