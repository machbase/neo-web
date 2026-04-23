# Folder Rename Audit: `src/components/tagAnalyzer/utils/persistence`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `ExampleTaz.taz`
- `FOLDER_AUDIT.md`
- `TazBoardInfoParser.test.ts`
- `TazBoardInfoParser.ts`
- `TazBoardStatePersistence.test.ts`
- `TazBoardStatePersistence.ts`
- `TazFilePersistence.test.ts`
- `TazFilePersistence.ts`
- `TazFormatVersions.md`
- `TazPanelInfoMapper.test.ts`
- `TazPanelInfoMapper.ts`
- `TazPanelPersistenceTypes.ts`
- `TazPersistenceTypes.ts`
- `TazVersion.ts`

### Verify
- Direct file count: 14

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `TazBoardInfoParser.test.ts`
- No named functions found.

#### `TazBoardInfoParser.ts`
- `parseReceivedBoardInfo` - line 44, function
- `parseReceivedPanelInfo` - line 68, function
- `normalizePersistedPanelInfoV200` - line 135, function
- `normalizePersistedPanelInfoV201` - line 158, function
- `normalizePersistedPanelInfoV202` - line 181, function
- `normalizePersistedPanelInfoV203` - line 252, function
- `normalizePersistedPanelInfoV204` - line 322, function
- `normalizePersistedSeriesInfoV200` - line 339, function
- `normalizePersistedSeriesInfoV201` - line 348, function
- `normalizePersistedSeriesInfoV204` - line 357, function
- `createColoredSeriesListV200` - line 366, function
- `createColoredSeriesListV201` - line 376, function
- `createColoredSeriesListV202` - line 386, function
- `createColoredSeriesListV203` - line 396, function
- `createColoredSeriesListV204` - line 406, function
- `normalizeLegacyTimeKeeper` - line 416, function

#### `TazBoardStatePersistence.test.ts`
- No named functions found.

#### `TazBoardStatePersistence.ts`
- `createPersistedTazBoardInfo` - line 13, function

#### `TazFilePersistence.test.ts`
- `createRuntimeBoardInfo` - line 10, arrow function

#### `TazFilePersistence.ts`
- `createSaveTazBoardInfo` - line 13, function
- `createTazSavePayloadFromBoardInfo` - line 23, function

#### `TazPanelInfoMapper.test.ts`
- No named functions found.

#### `TazPanelInfoMapper.ts`
- `isPersistedPanelInfoV200` - line 28, function
- `isPersistedPanelInfoV201` - line 56, function
- `isPersistedPanelInfoV202` - line 84, function
- `isPersistedPanelInfoV203` - line 112, function
- `isPersistedPanelInfoV204` - line 140, function
- `createPersistedSeriesInfo` - line 158, function
- `createPersistedPanelInfo` - line 182, function
- `createPanelInfoFromPersistedV200` - line 271, function
- `createPanelInfoFromPersistedV201` - line 308, function
- `createPanelInfoFromPersistedV202` - line 395, function
- `createPanelInfoFromPersistedV203` - line 482, function
- `createPanelInfoFromPersistedV204` - line 569, function
- `createRuntimeAxesFromPersistedV200` - line 586, function
- `createSeriesInfoFromPersistedV200` - line 679, function
- `createRuntimeSeriesColumnsFromPersistedV200` - line 703, function
- `hasRuntimeSeriesColumns` - line 724, function
- `createSeriesInfoFromPersistedV201` - line 734, function
- `createPersistedSeriesColumnsV201` - line 752, function
- `createRuntimeSeriesColumns` - line 765, function
- `cloneSeriesColumns` - line 787, function
- `cloneSeriesAnnotation` - line 798, function
- `clonePanelHighlight` - line 808, function
- `cloneTimeRangePair` - line 818, function
- `cloneValueRange` - line 836, function
- `cloneValueRangeOrDefault` - line 842, function

#### `TazPanelPersistenceTypes.ts`
- No named functions found.

#### `TazPersistenceTypes.ts`
- No named functions found.

#### `TazVersion.ts`
- `resolvePersistedTazVersion` - line 19, function

### Verify
- Direct code files inspected: 11
- Named functions recorded: 46
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `TazBoardInfoParser.test.ts`
- No named functions found.

#### `TazBoardInfoParser.ts`
- `parseReceivedBoardInfo` line 44: `aBoardInfo` (used)
- `parseReceivedPanelInfo` line 68: `aPanelInfo` (used), `aPersistedVersion` (used)
- `normalizePersistedPanelInfoV200` line 135: `aPanelInfo` (used)
- `normalizePersistedPanelInfoV201` line 158: `aPanelInfo` (used)
- `normalizePersistedPanelInfoV202` line 181: `aPanelInfo` (used)
- `normalizePersistedPanelInfoV203` line 252: `aPanelInfo` (used)
- `normalizePersistedPanelInfoV204` line 322: `aPanelInfo` (used)
- `normalizePersistedSeriesInfoV200` line 339: `aSeriesInfo` (used)
- `normalizePersistedSeriesInfoV201` line 348: `aSeriesInfo` (used)
- `normalizePersistedSeriesInfoV204` line 357: `aSeriesInfo` (used)
- `createColoredSeriesListV200` line 366: `aSeriesList` (used)
- `createColoredSeriesListV201` line 376: `aSeriesList` (used)
- `createColoredSeriesListV202` line 386: `aSeriesList` (used)
- `createColoredSeriesListV203` line 396: `aSeriesList` (used)
- `createColoredSeriesListV204` line 406: `aSeriesList` (used)
- `normalizeLegacyTimeKeeper` line 416: `aTimeKeeper` (used)

#### `TazBoardStatePersistence.test.ts`
- No named functions found.

#### `TazBoardStatePersistence.ts`
- `createPersistedTazBoardInfo` line 13: `aBoardInfo` (used)

#### `TazFilePersistence.test.ts`
- `createRuntimeBoardInfo` line 10: no parameters

#### `TazFilePersistence.ts`
- `createSaveTazBoardInfo` line 13: `aBoard` (used)
- `createTazSavePayloadFromBoardInfo` line 23: `aBoard` (used)

#### `TazPanelInfoMapper.test.ts`
- No named functions found.

#### `TazPanelInfoMapper.ts`
- `isPersistedPanelInfoV200` line 28: `aPanelInfo` (used)
- `isPersistedPanelInfoV201` line 56: `aPanelInfo` (used)
- `isPersistedPanelInfoV202` line 84: `aPanelInfo` (used)
- `isPersistedPanelInfoV203` line 112: `aPanelInfo` (used)
- `isPersistedPanelInfoV204` line 140: `aPanelInfo` (used)
- `createPersistedSeriesInfo` line 158: `aSeriesInfo` (used)
- `createPersistedPanelInfo` line 182: `aPanelInfo` (used)
- `createPanelInfoFromPersistedV200` line 271: `aPanelInfo` (used)
- `createPanelInfoFromPersistedV201` line 308: `aPanelInfo` (used)
- `createPanelInfoFromPersistedV202` line 395: `aPanelInfo` (used)
- `createPanelInfoFromPersistedV203` line 482: `aPanelInfo` (used)
- `createPanelInfoFromPersistedV204` line 569: `aPanelInfo` (used)
- `createRuntimeAxesFromPersistedV200` line 586: `aAxes` (used)
- `createSeriesInfoFromPersistedV200` line 679: `aSeriesInfo` (used)
- `createRuntimeSeriesColumnsFromPersistedV200` line 703: `aSeriesInfo` (used)
- `hasRuntimeSeriesColumns` line 724: `aColumns` (used)
- `createSeriesInfoFromPersistedV201` line 734: `aSeriesInfo` (used)
- `createPersistedSeriesColumnsV201` line 752: `aColumns` (used)
- `createRuntimeSeriesColumns` line 765: `aColumns` (used)
- `cloneSeriesColumns` line 787: `aColumns` (used)
- `cloneSeriesAnnotation` line 798: `aAnnotation` (used)
- `clonePanelHighlight` line 808: `aHighlight` (used)
- `cloneTimeRangePair` line 818: `aTimeRangePair` (used)
- `cloneValueRange` line 836: `aValueRange` (used)
- `cloneValueRangeOrDefault` line 842: `aValueRange` (used)

#### `TazPanelPersistenceTypes.ts`
- No named functions found.

#### `TazPersistenceTypes.ts`
- No named functions found.

#### `TazVersion.ts`
- `resolvePersistedTazVersion` line 19: `aVersion` (used)

### Verify
- Named functions checked: 46
- Parameters recorded: 46
- Parameters used: 46
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
- Parameter names reviewed: 46
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
- Function names reviewed: 46
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
- Direct files reviewed: 14
- Code files: 11
- Test files: 4
- Style files: 0
- Documentation/data/other files: 3
- Decision: Keep type-only files separated when they define shared contracts: `TazPanelPersistenceTypes.ts`, `TazPersistenceTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
