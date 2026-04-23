# Folder Rename Audit: `src/components/tagAnalyzer/utils/persistence`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

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
- Direct tracked file count: 14

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
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
- Direct tracked code files inspected: 11
- Named functions recorded: 46
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
