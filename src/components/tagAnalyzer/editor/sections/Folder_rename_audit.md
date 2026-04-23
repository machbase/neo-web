# Folder Rename Audit: `src/components/tagAnalyzer/editor/sections`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `EditorAxesTab.tsx`
- `EditorDataTab.tsx`
- `EditorDisplayTab.tsx`
- `EditorGeneralTab.tsx`
- `EditorTabContent.tsx`
- `EditorTimeTab.tsx`
- `FOLDER_AUDIT.md`
- `PanelEditorSettings.tsx`
- `SECTIONS_FOLDER_AUDIT_CURRENT.md`
- `useEditorTimeTabState.test.ts`
- `useEditorTimeTabState.ts`

### Verify
- Direct file count: 11

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `EditorAxesTab.tsx`
- `EditorAxesTab` - line 53, arrow function
- `updateXAxisConfig` - line 64, arrow function
- `updateSamplingConfig` - line 74, arrow function
- `updateLeftYAxisConfig` - line 86, arrow function
- `updateRightYAxisConfig` - line 98, arrow function
- `getYAxisConfig` - line 110, arrow function
- `updateYAxisConfig` - line 116, arrow function
- `setRightYAxisEnabled` - line 136, arrow function
- `setY2TagList` - line 154, arrow function
- `setRemoveY2TagList` - line 169, arrow function
- `renderAxisRangeRow` - line 252, arrow function
- `renderThresholdRows` - line 340, arrow function

#### `EditorDataTab.tsx`
- `EditorDataTab` - line 20, arrow function
- `updateTagField` - line 39, arrow function
- `updateSourceTagName` - line 54, arrow function

#### `EditorDisplayTab.tsx`
- `EditorDisplayTab` - line 32, arrow function
- `changeChartType` - line 45, arrow function

#### `EditorGeneralTab.tsx`
- `EditorGeneralTab` - line 18, arrow function
- `setGeneralFlag` - line 32, arrow function

#### `EditorTabContent.tsx`
- `EditorTabContent` - line 20, arrow function

#### `EditorTimeTab.tsx`
- `EditorTimeTab` - line 15, arrow function

#### `PanelEditorSettings.tsx`
- `PanelEditorSettings` - line 16, arrow function

#### `useEditorTimeTabState.test.ts`
- No named functions found.

#### `useEditorTimeTabState.ts`
- `buildTimeConfigFromBoundaries` - line 36, function
- `parseRequiredTimeBoundary` - line 58, function
- `getTimeConfigWithUpdatedBoundary` - line 75, function
- `useEditorTimeTabState` - line 98, function
- `handleTimeChange` - line 112, arrow function
- `handleTimeApply` - line 126, arrow function
- `handleQuickTime` - line 140, arrow function
- `handleClear` - line 152, arrow function
- `getTimeInputValues` - line 176, function
- `setTimeInputValue` - line 192, function

### Verify
- Direct code files inspected: 9
- Named functions recorded: 32
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `EditorAxesTab.tsx`
- `EditorAxesTab` line 53: `pAxesConfig` (used), `pTagSet` (used), `pOnChangeAxesConfig` (used), `pOnChangeTagSet` (used)
- `updateXAxisConfig` line 64: `aPatch` (used)
- `updateSamplingConfig` line 74: `aPatch` (used)
- `updateLeftYAxisConfig` line 86: `aPatch` (used)
- `updateRightYAxisConfig` line 98: `aPatch` (used)
- `getYAxisConfig` line 110: `aAxisKey` (used)
- `updateYAxisConfig` line 116: `aAxisKey` (used), `aPatch` (used)
- `setRightYAxisEnabled` line 136: `aChecked` (used)
- `setY2TagList` line 154: `aValue` (used)
- `setRemoveY2TagList` line 169: `aKey` (used)
- `renderAxisRangeRow` line 252: `label` (used), `axisKey` (used), `rangeKey` (used), `disabled` (used), `labelMinWidth` (used)
- `renderThresholdRows` line 340: `aRows` (used)

#### `EditorDataTab.tsx`
- `EditorDataTab` line 20: `pDataConfig` (used), `pOnChangeTagSet` (used), `pTables` (used)
- `updateTagField` line 39: `aKey` (used), `aField` (used), `aValue` (used)
- `updateSourceTagName` line 54: `aKey` (used), `aValue` (used)

#### `EditorDisplayTab.tsx`
- `EditorDisplayTab` line 32: `pDisplayConfig` (used), `pOnChangeDisplayConfig` (used)
- `changeChartType` line 45: `aValue` (used)

#### `EditorGeneralTab.tsx`
- `EditorGeneralTab` line 18: `pGeneralConfig` (used), `pOnChangeGeneralConfig` (used)
- `setGeneralFlag` line 32: `aField` (used), `aChecked` (used)

#### `EditorTabContent.tsx`
- `EditorTabContent` line 20: `selectedTabType` (used), `editorConfig` (used), `setEditorConfig` (used), `tables` (used)

#### `EditorTimeTab.tsx`
- `EditorTimeTab` line 15: `pTimeConfig` (used), `pOnChangeTimeConfig` (used)

#### `PanelEditorSettings.tsx`
- `PanelEditorSettings` line 16: `pTabs` (used), `pSelectedTab` (used), `pSetSelectedTab` (used), `pEditorConfig` (used), `pSetEditorConfig` (used), `pTables` (used)

#### `useEditorTimeTabState.test.ts`
- No named functions found.

#### `useEditorTimeTabState.ts`
- `buildTimeConfigFromBoundaries` line 36: `aStartBoundary` (used), `aEndBoundary` (used)
- `parseRequiredTimeBoundary` line 58: `aValue` (used)
- `getTimeConfigWithUpdatedBoundary` line 75: `aTimeConfig` (used), `aField` (used), `aBoundary` (used)
- `useEditorTimeTabState` line 98: `timeConfig` (used), `onChangeTimeConfig` (used)
- `handleTimeChange` line 112: `aField` (used), `aEvent` (used)
- `handleTimeApply` line 126: `aField` (used), `aValue` (used)
- `handleQuickTime` line 140: `aOption` (used)
- `handleClear` line 152: no parameters
- `getTimeInputValues` line 176: `aTimeConfig` (used)
- `setTimeInputValue` line 192: `aField` (used), `aValue` (used), `aSetStartTime` (used), `aSetEndTime` (used)

### Verify
- Named functions checked: 32
- Parameters recorded: 65
- Parameters used: 65
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
- Parameter names reviewed: 65
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
- Function names reviewed: 32
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
- Direct files reviewed: 11
- Code files: 9
- Test files: 1
- Style files: 0
- Documentation/data/other files: 2
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
