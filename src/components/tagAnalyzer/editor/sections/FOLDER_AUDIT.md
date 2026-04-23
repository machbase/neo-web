# Folder Audit: `editor/sections`

## Summary
- Date: 2026-04-22
- Direct files: `8`
- Direct subfolders: none
- Responsibility: This folder owns editor tab components for general, data, axes, display, and time settings.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `editor/sections/EditorAxesTab.tsx` (632 lines)
- Helper hotspot: `editor/sections/useEditorTimeTabState.ts` (10 named functions)

## Files

### `EditorAxesTab.tsx`
- Path: `editor/sections/EditorAxesTab.tsx`
- Lines: 632
- Role: Renders the editor tab that changes axis flags, explicit ranges, thresholds, and Y2 assignments.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `EditorAxesTab` (553 lines, line 77) - Configures axis behavior for the panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `setAxisFlag` (14 lines, line 95) - Updates one boolean axis field and clears dependent secondary-axis tags when needed. Needs edit: No. This function is small enough and focused enough for now.
  - `setY2TagList` (8 lines, line 116) - Enables one series on the secondary Y-axis. Needs edit: No. This function is small enough and focused enough for now.
  - `setRemoveY2TagList` (7 lines, line 130) - Removes one series from the secondary Y-axis assignment list. Needs edit: No. This function is small enough and focused enough for now.
  - `renderAxisRangeRow` (73 lines, line 217) - Renders one axis range row with min and max inputs. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `renderThresholdRows` (44 lines, line 297) - Renders the axis threshold rows for one axis group. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `EditorDataTab.tsx`
- Path: `editor/sections/EditorDataTab.tsx`
- Lines: 262
- Role: Renders the editor tab that changes selected tags, aliases, and data-source fields.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `EditorDataTab` (240 lines, line 20) - Manages the tag list assigned to a panel. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `updateTagField` (7 lines, line 37) - Updates one editable field on one tag. Needs edit: No. This function is small enough and focused enough for now.
  - `updateSourceTagName` (17 lines, line 52) - Updates one tag's normalized source tag name and removes any stale legacy tag-name field. Needs edit: No. This function is small enough and focused enough for now.

### `EditorDisplayTab.tsx`
- Path: `editor/sections/EditorDisplayTab.tsx`
- Lines: 216
- Role: Renders the editor tab that changes chart display options and chart type.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `EditorDisplayTab` (182 lines, line 32) - Controls how the panel is drawn visually. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `changeChartType` (30 lines, line 45) - Applies the display defaults for one chart type selection. Needs edit: No. This function is small enough and focused enough for now.

### `EditorTabContent.tsx`
- Path: `editor/sections/EditorTabContent.tsx`
- Lines: 93
- Role: Routes the active editor tab to the correct tab component.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `EditorTabContent` (71 lines, line 20) - Chooses which editor tab to render for the active tab. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `EditorGeneralTab.tsx`
- Path: `editor/sections/EditorGeneralTab.tsx`
- Lines: 112
- Role: Renders the editor tab that changes panel title and high-level display flags.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `EditorGeneralTab` (92 lines, line 18) - Edits the general panel behavior such as title, zoom support, and time-keeper usage. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.
  - `setGeneralFlag` (15 lines, line 32) - Updates one general-config flag and resets time-keeper state when needed. Needs edit: No. This function is small enough and focused enough for now.

### `PanelEditorSettings.tsx`
- Path: `editor/sections/PanelEditorSettings.tsx`
- Lines: 86
- Role: Renders the editor settings column that contains the tabbed editor content.
- Similar files: None that are close enough to justify a merge right now.
- Combine note: No combine action is recommended at the moment.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `PanelEditorSettings` (68 lines, line 16) - Renders the tabbed panel settings editor for general, data, axes, display, and time options. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.

### `EditorTimeTab.tsx`
- Path: `editor/sections/EditorTimeTab.tsx`
- Lines: 139
- Role: Renders the editor tab that changes panel time mode, quick times, and explicit time bounds.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: Yes. This file is large enough that it is worth checking for mixed responsibilities.
- Functions:
  - `EditorTimeTab` (122 lines, line 15) - Edits the panel-specific time range override. Needs edit: Yes. This function is large enough that it is likely doing more than one thing.

### `useEditorTimeTabState.ts`
- Path: `editor/sections/useEditorTimeTabState.ts`
- Lines: 205
- Role: Owns the local input buffers and update handlers for the time editor tab.
- Similar files: `common/tagSelection/useTagSelectionState.ts`
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `buildTimeConfigFromBoundaries` (15 lines, line 36) - Builds editor time config from structured start and end boundaries. Needs edit: No. This function is small enough and focused enough for now.
  - `parseRequiredTimeBoundary` (8 lines, line 58) - Parses one time input value and throws when the value is invalid. Needs edit: No. This function is small enough and focused enough for now.
  - `getTimeConfigWithUpdatedBoundary` (16 lines, line 75) - Builds the next time config after updating one side of the range. Needs edit: No. This function is small enough and focused enough for now.
  - `useEditorTimeTabState` (71 lines, line 98) - Owns the local input buffers and update handlers for the time editor tab. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `handleTimeChange` (13 lines, line 112) - Handles time change. Needs edit: No. This function is small enough and focused enough for now.
  - `handleTimeApply` (13 lines, line 126) - Handles time apply. Needs edit: No. This function is small enough and focused enough for now.
  - `handleQuickTime` (11 lines, line 140) - Handles quick time. Needs edit: No. This function is small enough and focused enough for now.
  - `handleClear` (7 lines, line 152) - Handles clear. Needs edit: No. This function is small enough and focused enough for now.
  - `getTimeInputValues` (6 lines, line 176) - Formats the current time config into the two text inputs used by the editor. Needs edit: No. This function is small enough and focused enough for now.
  - `setTimeInputValue` (13 lines, line 192) - Writes one input buffer value into the matching local state setter. Needs edit: No. This function is small enough and focused enough for now.

