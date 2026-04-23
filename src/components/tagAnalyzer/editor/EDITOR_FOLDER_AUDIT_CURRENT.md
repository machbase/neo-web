# TagAnalyzer Editor Folder Audit (Current)

Scope: `src/components/tagAnalyzer/editor`

Date: `2026-04-22`

This audit covers the current on-disk files in the editor root folder.
It follows the shared guide in `src/components/tagAnalyzer/AUDIT_GUIDE_FOR_AGENTS.md`.
Note: the current worktree contains `EditorChartPreview.tsx` and a deleted `PanelEditorPreviewChart.tsx`; this audit follows the files that exist on disk right now.

## Summary

- Total files: `10`
- Production files: `8`
- Subfolder audit: `sections/SECTIONS_FOLDER_AUDIT_CURRENT.md`
- Largest root hotspots:
  - `PanelEditor.tsx` (`240` lines): editor shell, preview sync, and save flow
  - `EditorChartPreview.tsx` (`229` lines): preview chart shell, runtime hookup, and toolbar actions
  - `PanelEditorUtils.ts` (`183` lines): editor time-range resolution with legacy boundary conversion

Anonymous inline JSX callbacks are not itemized one by one below.
When a file relies on many of them, that is called out in the file audit note.

## Severity Summary

- `Very bad`
  - `PanelEditorUtils.ts` still serializes normalized editor time state back into legacy `bgn/end` input just to resolve preview ranges.

- `Bad`
  - `PanelEditor.tsx` mixes editor shell layout, preview state orchestration, apply logic, and save-confirm flow.
  - `EditorChartPreview.tsx` mixes preview-specific runtime setup, derived presentation text, and toolbar behavior.
  - `EditorTypes.ts` owns the shared editor type declarations.

- `Warning`
  - Several tiny helpers are good, but a few are thin or misleading, especially `setUtcTime`.
  - The root UI files still contain many inline JSX callbacks, which makes scanability worse.

- `Good`
  - `PanelEditorConfigConverter.ts` is explicit, focused, and easy to audit.
  - `useSavePanelToGlobalRecoilState.ts` is a clean single-purpose hook.

## File Audit

### `AddTagsModal.tsx` (`156` lines)

Role: opens the add-tags modal, loads table-backed tag selection state, validates the pending selection, and merges selected tags into the current panel tag set.

Functions:
- `AddTagsModal` (`line 24`, `130` lines): renders the modal, wires table/tag selection state, and commits the chosen tags back into the editor. Needs edit: `No`.
- `handleSelectTag` (`line 49`, `7` lines): adds one selected tag unless the selection limit has already been reached. Needs edit: `No`.
- `setPanels` (`line 62`, `13` lines): validates the pending selection, merges the selected tags into the existing tag set, and closes the modal. Needs edit: `Yes`; the name is vague and should say that it applies selected tags.

Audit note:
- The file is mostly focused and readable.
- The main cleanup is naming: `setPanels` should be something like `applySelectedTags`.

### `EditorChartPreview.tsx` (`229` lines)

Role: renders the editor-only chart preview, hooks the preview into the shared chart runtime controller, applies preview ranges, and exposes preview refresh and raw-mode actions.

Functions:
- `EditorChartPreview` (`line 36`, `192` lines): owns preview chart state, runtime-controller hookup, derived header text, toolbar actions, and chart/footer rendering. Needs edit: `Yes`; it is the main multi-responsibility preview file.
- `getPreviewNavigatorRange` (`line 78`, `7` lines): prefers the live navigator range when present and otherwise falls back to the editor footer range. Needs edit: `No`.
- `loadPreviewRanges` (`line 91`, `7` lines): skips empty-width containers and then applies the preview and navigator ranges to the runtime controller. Needs edit: `No`.
- `toggleRawMode` (`line 104`, `5` lines): flips preview raw mode and refreshes the preview data with the current ranges. Needs edit: `No`. Warning (`<=5` lines): good abstraction because it keeps the toolbar button readable and groups the paired state update plus refresh.

Audit note:
- This file mixes preview-only orchestration, range loading, derived presentation strings, and toolbar event behavior.
- It also contains several inline JSX callbacks for refresh and chart handlers.
- Best cleanup: keep this as the preview shell, but move the derived presentation state and some toolbar actions into a small helper or hook.

### `OverlapTimeShiftControls.tsx` (`200` lines)

Role: renders one overlap time-shift row, converts the entered amount and unit into milliseconds, and shows the panel time span in chart UTC text.

Functions:
- `OverlapTimeShiftControls` (`line 28`, `171` lines): renders the overlap shift UI, current time window text, unit picker, and left/right shift buttons. Needs edit: `No`.
- `getShiftAmount` (`line 51`, `3` lines): converts the current unit and numeric value into milliseconds. Needs edit: `No`. Warning (`<=5` lines): good abstraction because both shift buttons need the same conversion.
- `setUtcTime` (`line 61`, `3` lines): subtracts the local timezone offset before chart time formatting. Needs edit: `Yes`. Warning (`<=5` lines): thin abstraction with a misleading name; `toUtcChartTime` would be clearer, or it could be inlined because it is only used once.

Audit note:
- The file is focused.
- The main issue is the misleading `setUtcTime` helper name.

### `PanelEditor.tsx` (`240` lines)

Role: renders the top-level panel editor shell, manages draft and applied preview state, resolves preview time bounds, and saves the edited panel into board state.

Functions:
- `PanelEditor` (`line 31`, `206` lines): owns editor draft state, applied panel state, tab state, initialization/reset effect, save confirmation flow, and shell rendering. Needs edit: `Yes`; this is the main editor hotspot.
- `applyEditorChanges` (`line 56`, `10` lines): merges the current editor draft into panel info and resolves the preview time range for that draft. Needs edit: `No`.
- `saveEditorChanges` (`line 72`, `5` lines): saves the applied panel, marks the edit as saved, and exits the editor. Needs edit: `No`. Warning (`<=5` lines): good abstraction because the direct save path and confirm modal both reuse it.
- `confirmSaveIfNeeded` (`line 83`, `8` lines): compares the current draft to the applied preview state and opens the confirm modal when they differ. Needs edit: `No`.

Audit note:
- The file currently combines shell layout, preview synchronization, apply logic, and save/confirm workflow.
- `applyEditorChanges` and the initialization `useEffect` both resolve preview time bounds, so there is duplicated orchestration.
- The heavy design-system prop noise also makes the component harder to scan.

### `PanelEditorConfigConverter.ts` (`178` lines)

Role: converts saved panel info into editor draft sections, merges editor drafts back into saved panel info, and normalizes blank numeric draft values while saving.

Functions:
- `convertPanelInfoToEditorConfig` (`line 18`, `50` lines): maps one saved panel model into grouped editor draft sections. Needs edit: `No`.
- `mergeEditorConfigIntoPanelInfo` (`line 76`, `30` lines): applies one editor draft back into the saved panel model while preserving fields the editor does not own. Needs edit: `No`.
- `mergeAxesDraftIntoPanelAxes` (`line 113`, `38` lines): converts axes draft values, including blank draft numbers, into saved panel axes. Needs edit: `No`.
- `mergeDisplayDraftIntoPanelDisplay` (`line 158`, `10` lines): converts display draft values into the saved display shape. Needs edit: `No`.
- `normalizeDraftNumber` (`line 175`, `3` lines): converts a blank numeric draft field into `0` for persistence. Needs edit: `No`. Warning (`<=5` lines): good abstraction because it is reused across several merge paths and gives the blank-to-zero rule one explicit name.

Audit note:
- This is one of the clearest files in the editor folder.
- It has one job, explicit mapping, and no UI concerns.

### `EditorTypes.ts`

Role: declares editor event and draft types and also parses numeric editor input into number-or-blank draft values.

Functions:
- `parseEditorNumber` (`line 28`, `3` lines): converts an empty input string to `''` and any other input string to `Number(...)`. Needs edit: `Yes`. Warning (`<=5` lines): the logic itself is fine, but this helper does not belong in a type-definition file.

Audit note:
- The type declarations are useful and explicit.
- The problem is ownership: `parseEditorNumber` should move into `PanelEditorUtils.ts` or a small draft-input helper so this file can stay type-only.

### `PanelEditorUtils.ts` (`183` lines)

Role: resolves concrete editor preview time bounds, chooses the correct resolution path, converts last-relative editor input into legacy-shaped boundary requests, and returns absolute or fallback preview ranges.

Functions:
- `resolveEditorTimeBounds` (`line 34`, `18` lines): orchestrates last-relative, now-relative, absolute, and fallback preview-range resolution. Needs edit: `Yes`; the control flow is clear, but the function still depends on legacy-shaped conversion below it.
- `getEditorTimeRangeMode` (`line 59`, `11` lines): classifies the editor time config into the correct resolution path. Needs edit: `No`.
- `hasAbsoluteEditorTimeBounds` (`line 77`, `3` lines): checks whether the stored numeric time range is concrete and ordered. Needs edit: `No`. Warning (`<=5` lines): good abstraction because it gives a clear name to an otherwise cryptic numeric condition.
- `resolveLastRelativeEditorTimeBounds` (`line 89`, `17` lines): resolves last-relative preview ranges by fetching the last available time bounds for the current tag set. Needs edit: `No`.
- `createLegacyEditorTimeRangeInput` (`line 113`, `8` lines): converts normalized editor time state into legacy `bgn/end` input for boundary lookup. Needs edit: `Yes`; this is the clearest boundary leak in the file.
- `resolveLastRelativeBoundaryRanges` (`line 129`, `6` lines): fetches the concrete boundary ranges needed for last-relative preview resolution. Needs edit: `No`.
- `createLastRelativeEditorTimeBounds` (`line 143`, `10` lines): builds the concrete preview range from the resolved last available end time. Needs edit: `No`.
- `resolveNowRelativeEditorTimeBounds` (`line 160`, `10` lines): resolves `now`-relative editor ranges against current time. Needs edit: `No`.
- `resolveAbsoluteEditorTimeBounds` (`line 177`, `6` lines): returns the stored numeric editor range as the preview range. Needs edit: `No`.

Audit note:
- The branching is explicit and readable.
- The problem is boundary ownership: the editor layer should not need to know about `toLegacyTimeRangeInput` just to resolve preview ranges.
- Best cleanup: move the legacy-shape conversion down into the boundary resolver or repository layer.

### `useSavePanelToGlobalRecoilState.ts` (`29` lines)

Role: exposes one hook that saves the edited panel into the currently selected board in Recoil state.

Functions:
- `useSavePanelToGlobalRecoilState` (`line 11`, `18` lines): builds a save callback that reads the selected board id and replaces the matching saved panel. Needs edit: `No`.

Audit note:
- Clean, single-purpose hook.
- This is a good example of editor code that does one thing clearly.

## Bottom Line

- Clearest files:
  - `PanelEditorConfigConverter.ts`
  - `useSavePanelToGlobalRecoilState.ts`

- Messiest files:
  - `PanelEditor.tsx`
  - `EditorChartPreview.tsx`
  - `PanelEditorUtils.ts`

- Best cleanup opportunities:
  - move legacy time-shape conversion out of `PanelEditorUtils.ts`
  - split preview orchestration from UI rendering in `EditorChartPreview.tsx`
  - reduce the amount of workflow logic living inside `PanelEditor.tsx`
  - rename thin or vague helpers like `setPanels` and `setUtcTime`

