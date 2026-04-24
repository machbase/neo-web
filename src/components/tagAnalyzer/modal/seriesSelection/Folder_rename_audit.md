# Folder Rename Audit: `src/components/tagAnalyzer/modal/seriesSelection`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `FOLDER_AUDIT.md`
- `TagSelectionConstants.ts`
- `TagSelectionModeRow.tsx`
- `TagSelectionPanel.test.tsx`
- `TagSelectionPanel.tsx`
- `tagSelectionPanelHelpers.ts`
- `tagSelectionPresentation.test.ts`
- `tagSelectionPresentation.ts`
- `TagSelectionSearchRepository.ts`
- `TagSelectionTypes.ts`
- `useTagSelectionState.test.ts`
- `useTagSelectionState.ts`

### Verify
- Direct file count: 12

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `TagSelectionModeRow.tsx`
- `TagSelectionModeRow` - line 34, arrow function

#### `TagSelectionPanel.test.tsx`
- `onPageChange` - line 91, arrow function
- `onPageInputChange` - line 93, arrow function

#### `TagSelectionPanel.tsx`
- `TagSelectionPanel` - line 39, arrow function
- `handleSelectedSeriesDraftKeyDown` - line 81, arrow function

#### `tagSelectionPanelHelpers.ts`
- `mapTagSearchItemsToListItems` - line 23, function
- `findTagById` - line 40, function
- `mapSelectedSeriesDraftListItems` - line 53, function

#### `tagSelectionPresentation.test.ts`
- No named functions found.

#### `tagSelectionPresentation.ts`
- `buildTagSelectionLimitError` - line 10, function
- `getTagSelectionErrorMessage` - line 21, function
- `getTagSelectionCountColor` - line 43, function
- `buildTagSelectionCountLabel` - line 57, function

#### `TagSelectionSearchRepository.ts`
- `fetchTableName` - line 51, function
- `getTagPagination` - line 90, function
- `getTagTotal` - line 126, function
- `buildTableColumns` - line 159, function
- `getTagTotalFromResponse` - line 174, function
- `normalizeTagSearchItems` - line 185, function
- `fetchTagSearchColumns` - line 201, function
- `fetchTagSearchPage` - line 236, function
- `getMetaTableName` - line 283, function

#### `TagSelectionTypes.ts`
- No named functions found.

#### `useTagSelectionState.test.ts`
- No named functions found.

#### `useTagSelectionState.ts`
- `useTagSelectionState` - line 25, arrow function

### Verify
- Direct code files inspected: 11
- Named functions recorded: 22
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `TagSelectionModeRow.tsx`
- `TagSelectionModeRow` line 34: `selectedSeriesDraft` (used), `options` (used), `onModeChange` (used), `triggerStyle` (used)

#### `TagSelectionPanel.test.tsx`
- `onPageChange` line 91: no parameters
- `onPageInputChange` line 93: no parameters

#### `TagSelectionPanel.tsx`
- `TagSelectionPanel` line 39: `tableOptions` (used), `selectedTable` (used), `onSelectedTableChange` (used), `tagTotal` (used), `tagInputValue` (used), `onTagInputChange` (used), `onSearch` (used), `availableTags` (used), `onAvailableTagSelect` (used), `selectedSeriesDrafts` (used), `onSelectedSeriesDraftRemove` (used), `renderSelectedSeriesDraftLabel` (used), `maxSelectedCount` (used), `paginationProp` (used)
- `handleSelectedSeriesDraftKeyDown` line 81: `aEvent` (used), `aTagId` (used)

#### `tagSelectionPanelHelpers.ts`
- `mapTagSearchItemsToListItems` line 23: `aAvailableTags` (used)
- `findTagById` line 40: `aAvailableTags` (used), `aId` (used)
- `mapSelectedSeriesDraftListItems` line 53: `aSelectedSeriesDrafts` (used)

#### `tagSelectionPresentation.test.ts`
- No named functions found.

#### `tagSelectionPresentation.ts`
- `buildTagSelectionLimitError` line 10: `aMaxSelectedCount` (used)
- `getTagSelectionErrorMessage` line 21: `aSelectedCount` (used), `aMaxSelectedCount` (used)
- `getTagSelectionCountColor` line 43: `aSelectedCount` (used), `aMaxSelectedCount` (used)
- `buildTagSelectionCountLabel` line 57: `aSelectedCount` (used), `aMaxSelectedCount` (used)

#### `TagSelectionSearchRepository.ts`
- `fetchTableName` line 51: `aTableName` (used)
- `getTagPagination` line 90: `aTableName` (used), `aTagFilter` (used), `aPageNumber` (used), `aSourceColumn` (used)
- `getTagTotal` line 126: `aTableName` (used), `aTagFilter` (used), `aSourceColumn` (used)
- `buildTableColumns` line 159: `aRows` (used)
- `getTagTotalFromResponse` line 174: `aResponse` (used)
- `normalizeTagSearchItems` line 185: `aRows` (used)
- `fetchTagSearchColumns` line 201: `aTable` (used)
- `fetchTagSearchPage` line 236: `table` (used), `searchText` (used), `page` (used), `columns` (used)
- `getMetaTableName` line 283: `aSourceTableName` (used)

#### `TagSelectionTypes.ts`
- No named functions found.

#### `useTagSelectionState.test.ts`
- No named functions found.

#### `useTagSelectionState.ts`
- `useTagSelectionState` line 25: `tables` (used), `initialTable` (used), `maxSelectedCount` (used), `isSameSelectedTag` (used)

### Verify
- Named functions checked: 22
- Parameters recorded: 52
- Parameters used: 52
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
- Parameter names reviewed: 52
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
- Function names reviewed: 22
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
- Test files: 3
- Style files: 0
- Documentation/data/other files: 1
- Decision: Keep type-only files separated when they define shared contracts: `TagSelectionTypes.ts`.
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
