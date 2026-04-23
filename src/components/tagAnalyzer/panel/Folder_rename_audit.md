# Folder Rename Audit: `src/components/tagAnalyzer/panel`

- Created: 2026-04-23
- Scope: Direct tracked files in this folder.
- Rule: Complete one step at a time. Plan, execute, verify, and record changes before moving on.

## Step 1. Files

### Plan
- List every direct tracked file in this folder.

### Execute
- `BoardPanel.test.tsx`
- `BoardPanel.tsx`
- `BoardPanelContextMenu.tsx`
- `BoardPanelHeader.tsx`
- `FOLDER_AUDIT.md`
- `HighlightRenamePopover.tsx`

### Verify
- Direct tracked file count: 6

### Changed
- Created this audit file and recorded the direct tracked file list.

## Step 2. Functions

### Plan
- Inspect each direct tracked TypeScript or JavaScript file in this folder.
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
- Direct tracked code files inspected: 5
- Named functions recorded: 40
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
