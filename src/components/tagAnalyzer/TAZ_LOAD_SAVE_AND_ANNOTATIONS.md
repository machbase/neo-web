# TAZ Save and Load Report

`.taz` is JSON text for a TagAnalyzer board, not a binary format.
It stores board fields such as `id`, `name`, `path`, `range_bgn`, `range_end`, and `panels`.
Saved panels use the legacy flat storage shape. Runtime TagAnalyzer uses a nested shape.

## Entry points

Current live load paths:
- `src/components/side/FileExplorer/index.tsx`
- `src/components/side/FileExplorer/SaveModal.tsx`
- `src/components/newBoard/index.tsx`

Current live save paths:
- `src/components/mainContent/MainContent.tsx`
- `src/components/side/FileExplorer/SaveModal.tsx`

TagAnalyzer-local copy of the `.taz` save and load shaping now lives in:
- `src/components/tagAnalyzer/utils/persistence/TazFilePersistence.ts`

That helper is intentionally kept inside `tagAnalyzer` only.
It mirrors the `.taz` parsing and save shaping logic without changing shared app files outside TagAnalyzer.

Current save-copy helpers:
- `createTazSavePayload(...)`
- `createSavedTazBoardAfterSave(...)`
- `createSavedTazBoardAfterSaveAs(...)`

## Load flow

The current live load paths read `.taz` text and run compatibility repair with `CheckDataCompatibility(..., 'taz')`.
They then build a board object and store it in `gBoardList` with `type: 'taz'`.

The TagAnalyzer-local helper `createLoadedTazBoard(...)` does the same shaping in one explicit place.
`MainContent.tsx` sees that type and renders `TagAnalyzer`.
`TagAnalyzer.tsx` then calls `normalizeBoardInfo(...)` from `LegacyStorageAdapter.ts` to convert saved flat panels into runtime panel objects.

## Runtime vs save

Editing a board does not save the file immediately.
`TagAnalyzer.tsx` updates in-memory Recoil state and uses `schedulePersistPanelState()` to keep `gBoardList` in a save-ready form.
`getNextBoardListWithSavedPanels(...)` converts runtime panels back into the legacy flat saved shape.

## Save flow

`MainContent.tsx` saves existing `.taz` files through `handleSaveModalOpen()`.
`SaveModal.tsx` handles Save As.
Both live paths clone the current board, clear transient fields such as `code` and `savedCode`, and write the full board JSON through `postFileList(...)`.

The TagAnalyzer-local helper mirrors those save paths as a local copy:
- `createTazSavePayload(...)` builds the persisted `.taz` payload.
- `createSavedTazBoardAfterSave(...)` mirrors the existing-file save state update.
- `createSavedTazBoardAfterSaveAs(...)` mirrors the Save As state update.

## Storage boundary

`LegacyStorageAdapter.ts` is the persistence boundary.
`normalizeBoardInfo(...)` maps saved data into runtime state.
`toLegacyFlatPanelInfo(...)` maps runtime state back into saved data.
Any new persisted fields, including annotations or highlights, must be handled in both directions or they will be lost on save.

## Caveat

The TagAnalyzer-local persistence helper is not wired into shared file-entry code yet.
That keeps the implementation isolated to `src/components/tagAnalyzer`, but the live app still uses the existing non-TagAnalyzer file-open and file-save entry points.
