# Folder Rename Audit: `src/components/tagAnalyzer/panel`

- Created: 2026-04-23
- Scope: Direct files in this folder, excluding the generated audit file.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct file in this folder, excluding the generated audit file.

### Execute
- `BoardPanel.test.tsx`
- `BoardPanel.tsx`
- `BoardPanelContextMenu.tsx`
- `BoardPanelHeader.tsx`
- `FOLDER_AUDIT.md`
- `HighlightRenamePopover.tsx`

### Verify
- Direct file count: 6

### Changed
- Recorded the current direct file list for this folder.
## Step 2. Functions

### Plan
- Inspect each direct TypeScript or JavaScript file in this folder.
- Record named functions, components, hooks, methods, and named function-valued constants.

### Execute
#### `BoardPanel.test.tsx`
- `MockPanelHeader` - line 64, arrow function
- `MockPanelBody` - line 93, arrow function
- `MockPanelFooter` - line 158, arrow function
- `createBoardPanelActions` - line 174, arrow function
- `createBoardPanelState` - line 188, arrow function
- `createProps` - line 200, arrow function

#### `BoardPanel.tsx`
- `hasLoadedPanelChartData` - line 89, function
- `BoardPanel` - line 101, function
- `makeResetParams` - line 158, function
- `handlePanelRangeApplied` - line 175, function
- `initialize` - line 220, function expression
- `reset` - line 245, function expression
- `toggleDragSelect` - line 272, function expression
- `toggleHighlight` - line 290, function expression
- `handleDragSelectStateChange` - line 309, function expression
- `handleHighlightSelection` - line 326, function
- `toggleRaw` - line 358, function expression
- `onToggleOverlap` - line 378, arrow function
- `onOpenFft` - line 390, arrow function
- `onSetGlobalTime` - line 391, arrow function
- `onOpenEdit` - line 402, arrow function
- `onDelete` - line 408, arrow function
- `handlePanelContextMenu` - line 428, function
- `closeContextMenu` - line 447, function
- `closeHighlightRenamePopover` - line 459, function
- `handleOpenHighlightRename` - line 469, function
- `applyHighlightRename` - line 491, function
- `onRefreshData` - line 607, arrow function
- `onRefreshTime` - line 613, arrow function
- `onSelection` - line 630, arrow function
- `onRefreshData` - line 664, arrow function
- `onRefreshTime` - line 670, arrow function
- `areBoardPanelPropsEqual` - line 709, function

#### `BoardPanelContextMenu.tsx`
- `BoardPanelContextMenu` - line 37, arrow function
- `runActionAfterClose` - line 67, function
- `handleDeleteConfirmOpen` - line 77, function

#### `BoardPanelHeader.tsx`
- `BoardPanelHeader` - line 33, arrow function
- `handleDelete` - line 54, arrow function

#### `HighlightRenamePopover.tsx`
- `HighlightRenamePopover` - line 23, arrow function
- `handleKeyDown` - line 48, function

### Verify
- Direct code files inspected: 5
- Named functions recorded: 40
- Anonymous inline callbacks were not recorded because this audit is focused on rename-relevant functions.

### Changed
- Recorded the current named function inventory for this folder.
## Step 3. Parameters

### Plan
- Inspect every named function recorded in Step 2.
- Record each received parameter and whether the function body uses it.

### Execute
#### `BoardPanel.test.tsx`
- `MockPanelHeader` line 64: `pActionHandlers` (used), `pRefreshHandlers` (used)
- `MockPanelBody` line 93: `pChartRefs` (used), `pPanelState` (used), `pNavigateState` (used), `pChartHandlers` (used), `pOnHighlightSelection` (used)
- `MockPanelFooter` line 158: no parameters
- `createBoardPanelActions` line 174: no parameters
- `createBoardPanelState` line 188: no parameters
- `createProps` line 200: `aPanelInfo` (used)

#### `BoardPanel.tsx`
- `hasLoadedPanelChartData` line 89: `aNavigateState` (used)
- `BoardPanel` line 101: `pPanelInfo` (used), `pBoardContext` (used), `pIsActiveTab` (used), `pChartBoardState` (used), `pChartBoardActions` (used), `pIsSelectedForOverlap` (used), `pIsOverlapAnchor` (used), `pRollupTableList` (used), `pOnToggleOverlapSelection` (used), `pOnUpdateOverlapSelection` (used), `pOnDeletePanel` (used)
- `makeResetParams` line 158: no parameters
- `handlePanelRangeApplied` line 175: `aPanelRange` (used), `aContext` (used)
- `initialize` line 220: no parameters
- `reset` line 245: no parameters
- `toggleDragSelect` line 272: no parameters
- `toggleHighlight` line 290: no parameters
- `handleDragSelectStateChange` line 309: `aIsDragSelectActive` (used), `aCanOpenFft` (used)
- `handleHighlightSelection` line 326: `aStartTime` (used), `aEndTime` (used)
- `toggleRaw` line 358: no parameters
- `onToggleOverlap` line 378: no parameters
- `onOpenFft` line 390: no parameters
- `onSetGlobalTime` line 391: no parameters
- `onOpenEdit` line 402: no parameters
- `onDelete` line 408: no parameters
- `handlePanelContextMenu` line 428: `aEvent` (used)
- `closeContextMenu` line 447: no parameters
- `closeHighlightRenamePopover` line 459: no parameters
- `handleOpenHighlightRename` line 469: `aRequest` (used)
- `applyHighlightRename` line 491: no parameters
- `onRefreshData` line 607: no parameters
- `onRefreshTime` line 613: no parameters
- `onSelection` line 630: no parameters
- `onRefreshData` line 664: no parameters
- `onRefreshTime` line 670: no parameters
- `areBoardPanelPropsEqual` line 709: `aPrevProps` (used), `aNextProps` (used)

#### `BoardPanelContextMenu.tsx`
- `BoardPanelContextMenu` line 37: `isOpen` (used), `position` (used), `isRaw` (used), `isSelectedForOverlap` (used), `isDragSelectActive` (used), `canToggleOverlap` (used), `canOpenFft` (used), `isSetGlobalTimeDisabled` (used), `actionHandlers` (used), `refreshHandlers` (used), `onClose` (used), `onOpenDeleteConfirm` (used)
- `runActionAfterClose` line 67: `aAction` (used)
- `handleDeleteConfirmOpen` line 77: no parameters

#### `BoardPanelHeader.tsx`
- `BoardPanelHeader` line 33: `pPresentationState` (used), `pActionHandlers` (used), `pRefreshHandlers` (used), `pSavedChartInfo` (used)
- `handleDelete` line 54: `aClickEvent` (used)

#### `HighlightRenamePopover.tsx`
- `HighlightRenamePopover` line 23: `isOpen` (used), `position` (used), `labelText` (used), `onLabelTextChange` (used), `onApply` (used), `onClose` (used)
- `handleKeyDown` line 48: `aEvent` (used)

### Verify
- Named functions checked: 40
- Parameters recorded: 55
- Parameters used: 55
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
- Parameter names reviewed: 55
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
- Function names reviewed: 40
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
- Direct files reviewed: 6
- Code files: 5
- Test files: 1
- Style files: 0
- Documentation/data/other files: 1
- Decision: No file consolidation performed in this broad audit pass; current separation remains safer until rename/removal candidates are handled intentionally.

### Verify
- File consolidation review completed for this folder.

### Changed
- Recorded file-consolidation decisions. No source files were moved or consolidated in this broad audit pass.
