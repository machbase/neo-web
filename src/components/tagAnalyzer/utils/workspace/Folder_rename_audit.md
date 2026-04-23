# Folder Rename Audit: `src/components/tagAnalyzer/utils/workspace`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `TazSavedBoardState.test.ts`
- `TazSavedBoardState.ts`
- `TazTabState.test.ts`
- `TazTabState.ts`

### Verify
- Direct tracked file count: 4

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `TazSavedBoardState.test.ts`
- No named functions found.

#### `TazSavedBoardState.ts`
- `getNextBoardListWithSavedPanels` - line 16, function
- `getNextBoardListWithSavedPanel` - line 33, function
- `getNextBoardListWithoutPanel` - line 59, function
- `updateBoardPanels` - line 72, function
- `findBoardPanels` - line 84, function
- `createPersistedPanelList` - line 93, function
- `replacePersistedPanel` - line 97, function
- `removePersistedPanel` - line 111, function
- `getPersistedPanelKey` - line 120, function

#### `TazTabState.test.ts`
- `createTazBoard` - line 15, arrow function
- `createRuntimeBoardInfo` - line 29, arrow function

#### `TazTabState.ts`
- `createLoadedTazBoard` - line 48, function
- `createTazSavePayload` - line 72, function
- `createSavedTazBoardAfterSave` - line 87, function
- `createSavedTazBoardAfterSaveAs` - line 102, function
- `createTazSavedCode` - line 122, function
- `createTazSavedCodeFromBoardInfo` - line 132, function

### Verify
- Direct tracked code files inspected: 4
- Named functions recorded: 17
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
