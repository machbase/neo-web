# TagAnalyzer Editor Sections Folder Audit (Current)

Scope: `src/components/tagAnalyzer/editor/sections`

Date: `2026-04-22`

This audit covers the section components used by the panel editor settings tabs.
It follows the shared guide in `src/components/tagAnalyzer/AUDIT_GUIDE_FOR_AGENTS.md`.

## Summary

- Total files: `9`
- Production files: `8`
- Largest hotspots:
  - `AxesSection.tsx` (`632` lines): X-axis, Y-axis, Y2-axis, range rows, threshold rows, and Y2 tag assignment
  - `TimeRangeSection.tsx` (`139` lines): time-range section view that renders the date pickers, quick ranges, and clear action
  - `useTimeRangeSectionState.ts` (`205` lines): time-input buffers, parsing, boundary updates, quick ranges, and clear/reset behavior
  - `DataSection.tsx` (`262` lines): tag list editing, tag removal, and add-tag modal orchestration

Anonymous inline JSX callbacks are not itemized one by one below.
When they materially affect readability, that is called out in the file audit note.

## Severity Summary

- `Very bad`
  - None in this folder.

- `Bad`
  - `AxesSection.tsx` is the biggest editor UI hotspot and owns too many separate sub-areas.
  - `DataSection.tsx` still carries a large editable-row JSX block even after the legacy adapter dependency was removed.

- `Warning`
  - `useTimeRangeSectionState.ts` now owns the time-range coordination cleanly, but it is the next file to watch if more editor-time rules are added.
  - `TimeRangeSection.tsx` is much clearer now, but it still relies on several inline callback props in the rendered date pickers and buttons.

- `Good`
  - `TimeRangeSection.tsx` now mostly renders the section UI while `useTimeRangeSectionState.ts` owns the time-input workflow.
  - `EditorTabContent.tsx`, `GeneralSection.tsx`, and `PanelEditorSettings.tsx` each have one clear job.

## File Audit

### `AxesSection.tsx` (`632` lines)

Role: edits X-axis tick spacing and sampling, primary Y-axis scale and thresholds, secondary Y2-axis scale and thresholds, and per-series Y2 assignment.

Functions:
- `AxesSection` (`line 77`, `553` lines): renders all axis controls, derives Y2 option lists, defines row config data, and wires axis updates back into editor state. Needs edit: `Yes`; it is too large and owns too many UI sub-areas.
- `setAxisFlag` (`line 95`, `14` lines): updates one axis flag and clears all Y2 series assignments when the secondary axis is disabled. Needs edit: `No`.
- `setY2TagList` (`line 116`, `8` lines): marks one series as using the secondary Y-axis. Needs edit: `Yes`; the name sounds like it replaces a whole list even though it only assigns one tag.
- `setRemoveY2TagList` (`line 130`, `7` lines): removes one series from the secondary Y-axis assignment. Needs edit: `Yes`; the name is awkward and should say it removes one tag from Y2.
- `renderAxisRangeRow` (`line 217`, `73` lines): renders one min/max row and updates the chosen range fields inside the axes draft. Needs edit: `No`.
- `renderThresholdRows` (`line 297`, `44` lines): renders one group of UCL/LCL checkbox-and-value controls for an axis. Needs edit: `No`.

Audit note:
- This is the biggest single editor section file.
- One file owns X-axis settings, primary Y-axis settings, secondary Y-axis settings, row config constants, and Y2 tag assignment UI.
- It also contains many inline input callbacks.
- Best cleanup: split `AxisRangeRow`, `AxisThresholdRows`, and the Y2 tag assignment block into smaller components or at least move the row-config data out of the component body.

### `DataSection.tsx` (`262` lines)

Role: renders the current panel tag list, edits calculation mode/source tag name/alias/color, removes tags, and opens the add-tags modal.

Functions:
- `DataSection` (`line 20`, `240` lines): owns add-tag modal state and renders the editable tag rows for the panel tag set. Needs edit: `Yes`; it is still focused, but the JSX block is large and row-level concerns are still inline.
- `updateTagField` (`line 37`, `7` lines): updates one editable tag field by tag key. Needs edit: `No`.
- `updateSourceTagName` (`line 52`, `17` lines): updates `sourceTagName` on the normalized tag model and removes any stale `tagName` field from that item. Needs edit: `No`.

Audit note:
- The file also relies on many inline row-level callbacks, which makes each tag row harder to scan.
- Best cleanup: consider extracting a small `TagRowEditor` component so the section stops carrying the entire row layout inline.

### `DisplaySection.tsx` (`216` lines)

Role: edits chart type, point visibility, legend visibility, point radius, fill opacity, and line thickness.

Functions:
- `DisplaySection` (`line 32`, `182` lines): renders chart-type presets and the display-setting inputs for one panel. Needs edit: `No`.
- `changeChartType` (`line 45`, `30` lines): applies the preset display defaults for `Zone`, `Dot`, or `Line`. Needs edit: `Yes`; the behavior is fine, but the repeated object shape and string branching would be clearer as a preset map.

Audit note:
- This file is focused and understandable.
- The only real cleanup is making the chart-type preset logic more data-driven.

### `EditorTabContent.tsx` (`93` lines)

Role: chooses the active editor tab component and wires that section back into the shared editor config state.

Functions:
- `EditorTabContent` (`line 20`, `71` lines): renders the correct section component for the selected tab and passes state update adapters to that section. Needs edit: `No`.

Audit note:
- Clear coordinator component with one job.
- This is a good example of explicit tab-to-component routing.

### `GeneralSection.tsx` (`112` lines)

Role: edits panel title, drag zoom behavior, and time-keeper behavior.

Functions:
- `GeneralSection` (`line 18`, `92` lines): renders the small general-settings form. Needs edit: `No`.
- `setGeneralFlag` (`line 32`, `15` lines): updates one general flag and clears `time_keeper` state when time-keeper is turned off. Needs edit: `No`.

Audit note:
- Small, focused, and easy to understand.
- Good single-responsibility section.

### `PanelEditorSettings.tsx` (`86` lines)

Role: renders the editor tab strip and the shared settings panel body that hosts the active section component.

Functions:
- `PanelEditorSettings` (`line 16`, `68` lines): renders the tab layout and injects the active tab content. Needs edit: `No`.

Audit note:
- Good layout wrapper.
- Responsibility is clear and stable.

### `TimeRangeSection.tsx` (`139` lines)

Role: renders the panel time override section and delegates time-input buffer and parsing workflow to a dedicated hook.

Functions:
- `TimeRangeSection` (`line 15`, `122` lines): renders the date pickers, quick ranges, and clear action for the panel time override while using the dedicated hook state. Needs edit: `No`.

Audit note:
- The main coordination logic now lives in `useTimeRangeSectionState.ts`, which is a better ownership boundary.
- The remaining cleanup is mostly presentational: reduce repeated wrapper blocks and some inline callback noise if this file grows again.

### `useTimeRangeSectionState.ts` (`205` lines)

Role: owns the time-range section input buffers, parses user-entered values, builds normalized time config updates, and handles quick-range and clear actions.

Functions:
- `buildTimeConfigFromBoundaries` (`line 36`, `15` lines): converts structured start/end boundaries into normalized editor time config. Needs edit: `No`.
- `parseRequiredTimeBoundary` (`line 58`, `8` lines): parses a required time input and throws when the value is invalid. Needs edit: `No`.
- `getTimeConfigWithUpdatedBoundary` (`line 75`, `16` lines): preserves the untouched boundary while building the next time config for one updated field. Needs edit: `No`.
- `useTimeRangeSectionState` (`line 98`, `71` lines): owns the local input state and returns the handlers used by the time-range section UI. Needs edit: `No`.
- `handleTimeChange` (`line 112`, `13` lines): updates the local input buffer and applies the parsed boundary when the live input is valid. Needs edit: `No`.
- `handleTimeApply` (`line 126`, `13` lines): applies a committed picker value and synchronizes the local input buffer with the saved time config. Needs edit: `No`.
- `handleQuickTime` (`line 140`, `11` lines): applies a quick-range preset and updates both local input buffers. Needs edit: `No`.
- `handleClear` (`line 152`, `7` lines): clears the custom time override and resets both local buffers. Needs edit: `No`.
- `getTimeInputValues` (`line 176`, `6` lines): formats the stored time config into the start and end input strings. Needs edit: `No`.
- `setTimeInputValue` (`line 192`, `13` lines): writes one input value into the matching local state setter. Needs edit: `No`.

Audit note:
- This is a cleaner owner for the time-range workflow than the JSX-heavy section component.
- If the hook grows much further, the first split should be between pure config-building helpers and the React state hook itself.

