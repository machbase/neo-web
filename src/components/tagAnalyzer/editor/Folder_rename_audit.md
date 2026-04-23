# Folder Rename Audit: `src/components/tagAnalyzer/editor`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `AddTagsModal.tsx`
- `EDITOR_FOLDER_AUDIT_CURRENT.md`
- `EditorChartPreview.tsx`
- `FOLDER_AUDIT.md`
- `OverlapTimeShiftControls.tsx`
- `PanelEditor.tsx`
- `PanelEditorConfigConverter.test.ts`
- `PanelEditorConfigConverter.ts`
- `PanelEditorTypes.ts`
- `PanelEditorUtils.test.ts`
- `PanelEditorUtils.ts`

### Verify
- Direct tracked file count: 11

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `AddTagsModal.tsx`
- `AddTagsModal` - line 22, arrow function
- `isSameSelectedTag` - line 38, arrow function
- `handleSelectTag` - line 48, arrow function
- `setPanels` - line 61, arrow function
- `onPageChange` - line 122, arrow function
- `onPageInputChange` - line 124, arrow function

#### `EditorChartPreview.tsx`
- `EditorChartPreview` - line 35, function
- `getPreviewNavigatorRange` - line 77, function
- `loadPreviewRanges` - line 90, function expression
- `toggleRawMode` - line 103, function expression
- `onSelection` - line 206, arrow function
- `onOpenHighlightRename` - line 207, arrow function

#### `OverlapTimeShiftControls.tsx`
- `OverlapTimeShiftControls` - line 28, arrow function
- `getShiftAmount` - line 51, arrow function
- `setUtcTime` - line 61, arrow function

#### `PanelEditor.tsx`
- `PanelEditor` - line 30, arrow function
- `applyEditorChanges` - line 60, arrow function
- `saveEditorChanges` - line 76, arrow function
- `confirmSaveIfNeeded` - line 87, arrow function

#### `PanelEditorConfigConverter.test.ts`
- `createEditorTimeConfig` - line 15, function

#### `PanelEditorConfigConverter.ts`
- `convertPanelInfoToEditorConfig` - line 18, function
- `mergeEditorConfigIntoPanelInfo` - line 101, function
- `mergeAxesDraftIntoPanelAxes` - line 138, function
- `mergeDisplayDraftIntoPanelDisplay` - line 211, function
- `normalizeDraftNumber` - line 228, function

#### `PanelEditorTypes.ts`
- `parseEditorNumber` - line 32, arrow function

#### `PanelEditorUtils.test.ts`
- `createEditorTimeConfig` - line 27, function

#### `PanelEditorUtils.ts`
- `resolveEditorTimeBounds` - line 34, function
- `getEditorTimeRangeMode` - line 59, function
- `hasAbsoluteEditorTimeBounds` - line 77, function
- `resolveLastRelativeEditorTimeBounds` - line 89, function
- `createLegacyEditorTimeRangeInput` - line 113, function
- `resolveLastRelativeBoundaryRanges` - line 129, function
- `createLastRelativeEditorTimeBounds` - line 143, function
- `resolveNowRelativeEditorTimeBounds` - line 160, function
- `resolveAbsoluteEditorTimeBounds` - line 177, function

### Verify
- Direct tracked code files inspected: 9
- Named functions recorded: 36
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
