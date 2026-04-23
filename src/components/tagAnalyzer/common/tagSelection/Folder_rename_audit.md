# Folder Rename Audit: `src/components/tagAnalyzer/common/tagSelection`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `FOLDER_AUDIT.md`
- `index.ts`
- `TagSelectionModeRow.tsx`
- `TagSelectionPanel.test.tsx`
- `TagSelectionPanel.tsx`
- `tagSelectionPanelHelpers.ts`
- `tagSelectionPresentation.test.ts`
- `tagSelectionPresentation.ts`
- `TagSelectionSearchRepository.ts`
- `tagSelectionTypes.ts`
- `useTagSelectionState.test.ts`
- `useTagSelectionState.ts`

### Verify
- Direct tracked file count: 12

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `index.ts`
- No named functions found.

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

#### `tagSelectionTypes.ts`
- No named functions found.

#### `useTagSelectionState.test.ts`
- No named functions found.

#### `useTagSelectionState.ts`
- `useTagSelectionState` - line 25, arrow function

### Verify
- Direct tracked code files inspected: 11
- Named functions recorded: 22
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
