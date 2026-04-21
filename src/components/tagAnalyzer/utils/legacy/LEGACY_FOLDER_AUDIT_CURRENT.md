# TagAnalyzer Legacy Folder Audit (Current)

Scope: `src/components/tagAnalyzer/utils/legacy`

Date: `2026-04-20`

This audit complements `src/components/tagAnalyzer/utils/UTILS_FOLDER_AUDIT_CURRENT.md`.

Main question for this audit:
- Should helpers like `toLegacyBoolean`, `fromLegacyBoolean`, and `toLegacyTagNameItem` stay public and be callable outside of whole-structure legacy conversion?

Short answer:
- Yes, your direction is good.
- The `legacy` folder should mostly expose boundary adapters.
- Small field-level legacy converters should usually be private to the legacy layer.

## Summary

- Total files in folder now: `8`
- Production files: `4`
- Test files: `4`
- Largest production file: `LegacyStorageAdapter.ts` (`413` lines)
- Largest test file: `LegacyStorageAdapter.test.ts` (`753` lines)

The folder currently mixes three different roles:
- real boundary adapters that convert full legacy records to normalized models and back
- small conversion primitives like `Y/N <-> boolean` and `tagName <-> sourceTagName`
- compatibility helpers that are still used by normal runtime code outside the `legacy` folder

That third role is the main design smell.

The strongest evidence is not only `toLegacyBoolean` and `fromLegacyBoolean`.
The stronger signal is that normal UI, fetch, series, and time code still imports helpers from `legacy/`, which means the normalized model boundary is not fully enforced yet.

## Folder Shape

### `LegacySeriesAdapter.ts` (`236` lines)
Role:
- legacy series/tag adapter
- currently mixes whole-structure conversion, low-level field conversion, and runtime compatibility helpers

Current public exports:
- `getSourceTagName`
- `withNormalizedSourceTagName`
- `normalizeSourceTagNames`
- `normalizeLegacySeriesConfigs`
- `normalizeLegacyChartSeries`
- `toLegacyTagNameItem`
- `toLegacyTagNameList`
- `toLegacySeriesConfigs`
- `legacySeriesToChartPoints`
- `fromLegacyBoolean`
- `toLegacyBoolean`

Audit note:
- This file has the biggest boundary leak in the folder.
- `fromLegacyBoolean` and `toLegacyBoolean` are low-level conversion rules. They should not need to be public just so another legacy adapter can use them.
- `toLegacyTagNameItem` and `toLegacyTagNameList` are also low-level field converters. They are useful, but they are implementation details of legacy serialization.
- `getSourceTagName`, `withNormalizedSourceTagName`, and `normalizeSourceTagNames` are more problematic. They are imported by runtime code outside the `legacy` folder:
  - `common/tagSelection/TagSelectionModeRow.tsx`
  - `common/tagSelection/TagSelectionPanel.tsx`
  - `common/tagSelection/useTagSelectionState.ts`
  - `editor/sections/DataSection.tsx`
  - `utils/fetch/ChartSeriesRowsLoader.ts`
  - `utils/series/SeriesLabelFormatter.ts`
  - `utils/series/SeriesSummaryUtils.ts`
  - `utils/series/TagSelectionChartSetup.ts`

Assessment:
- Keep public:
  - `normalizeLegacySeriesConfigs`
  - `toLegacySeriesConfigs`
  - `normalizeLegacyChartSeries`
- Make private or move to a legacy-internal helper file:
  - `fromLegacyBoolean`
  - `toLegacyBoolean`
  - `toLegacyTagNameItem`
  - `toLegacyTagNameList`
  - `legacySeriesToChartPoints`
- Move out of `legacy/` or remove entirely:
  - `getSourceTagName`
  - `withNormalizedSourceTagName`
  - `normalizeSourceTagNames`

Why:
- `SeriesConfig` already requires `sourceTagName: string`.
- `TagSelectionDraftItem` already requires `sourceTagName: string`.
- When runtime code still calls `getSourceTagName`, it means normalized code is still behaving as if legacy `tagName` might be present.
- If fallback behavior is still needed during a transition, the helper should live in a neutral place such as `utils/series`, not in `utils/legacy`.

### `LegacyStorageAdapter.ts` (`413` lines)
Role:
- whole-board and whole-panel storage adapter between legacy board records and normalized `BoardInfo` / `PanelInfo`

Current public exports:
- `normalizeBoardInfo`
- `toLegacyFlatPanelInfo`
- `getNextBoardListWithSavedPanels`
- `getNextBoardListWithSavedPanel`
- `getNextBoardListWithoutPanel`

Audit note:
- This is the healthiest file in the folder from an architecture standpoint.
- It is doing real boundary work: full legacy board/panel normalization and serialization.
- The main issue is that it imports `fromLegacyBoolean` and `toLegacyBoolean` from `LegacySeriesAdapter.ts`.

Assessment:
- Keep the public API in this file.
- Do not make callers outside `legacy/` build or decode legacy panel fields by hand.
- Move shared field converters into a legacy-internal helper file so this adapter is not coupled to public exports from another adapter.

### `LegacyTimeAdapter.ts` (`148` lines)
Role:
- legacy time adapter between legacy `bgn/end` scalar fields and normalized time boundary models

Current public exports:
- `normalizeLegacyTimeBoundaryRanges`
- `normalizeLegacyTimeRangeBoundary`
- `toLegacyTimeRangeInput`
- `toLegacyTimeValue`

Audit note:
- The core intent is good, but legacy time shapes still leak into internal runtime modules.
- Current non-test imports outside `legacy/`:
  - `editor/PanelEditorUtils.ts` imports `toLegacyTimeRangeInput`
  - `utils/time/PanelTimeRangeResolver.ts` imports `normalizeLegacyTimeBoundaryRanges` and `toLegacyTimeRangeInput`
  - `utils/fetch/TagAnalyzerDataRepository.ts` imports `toLegacyTimeRangeInput`
  - `TagAnalyzer.tsx` imports `normalizeLegacyTimeRangeBoundary`

Assessment:
- `normalizeLegacyTimeRangeBoundary` is reasonable when the input is truly legacy.
- `toLegacyTimeRangeInput` being used by `PanelTimeRangeResolver.ts` and `TagAnalyzerDataRepository.ts` is a design smell.
- Those modules are internal normalized runtime logic, but they still serialize into legacy `bgn/end` shapes mid-pipeline.

Recommendation:
- Keep real edge conversion here.
- Stop passing `LegacyTimeRangeInput` around inside normalized time/fetch logic.
- Introduce a normalized internal boundary-range contract in `utils/time`, then convert to the legacy shape only at the true external boundary.

### `LegacyTypes.ts` (`136` lines)
Role:
- type-only legacy contracts for board storage, series configs, and legacy time values

Audit note:
- This file is fine as a contract file.
- The issue is not the file itself.
- The issue is that some of these legacy types still leak into runtime logic outside the `legacy` folder, especially `LegacyTimeRangeInput`.

Assessment:
- Keep the type definitions.
- Treat them as edge contracts, not as normal runtime types.

## Tests

### `LegacySeriesAdapter.test.ts` (`131` lines)
Role:
- covers source-tag normalization, legacy series config normalization, tag-name serialization, and legacy chart-series conversion

Audit note:
- Useful safety net for the series boundary behavior.
- If low-level converters move into a helper file, the tests should follow the new ownership split.

### `LegacyStorageAdapter.test.ts` (`753` lines)
Role:
- large round-trip spec for nested/flat board and panel conversion

Audit note:
- This is the most important regression net in the folder.
- It protects the exact boundary you want to preserve while cleanup happens.

### `LegacyStorageAdapterBoardSave.test.ts` (`152` lines)
Role:
- focused save/update/remove tests for board panel persistence helpers

Audit note:
- This file is clean and well scoped.

### `LegacyTimeAdapter.test.ts` (`44` lines)
Role:
- focused parsing and serialization checks for legacy time values

Audit note:
- Good focused spec.
- It should remain a boundary-focused test, not a reason to keep legacy scalar helpers public everywhere.

## Leak Inventory

### Good public boundary adapters to keep

- `normalizeBoardInfo`
- `toLegacyFlatPanelInfo`
- `getNextBoardListWithSavedPanels`
- `getNextBoardListWithSavedPanel`
- `getNextBoardListWithoutPanel`
- `normalizeLegacySeriesConfigs`
- `toLegacySeriesConfigs`
- `normalizeLegacyChartSeries`
- `normalizeLegacyTimeRangeBoundary` only when the input is truly legacy

### Low-level helpers that should stop being public

- `fromLegacyBoolean`
- `toLegacyBoolean`
- `toLegacyTagNameItem`
- `toLegacyTagNameList`
- `legacySeriesToChartPoints`
- likely `toLegacyTimeValue` too, unless a true edge caller still needs the scalar conversion directly

### Runtime compatibility helpers that should move out of `legacy/` or disappear

- `getSourceTagName`
- `withNormalizedSourceTagName`
- `normalizeSourceTagNames`
- `toLegacyTimeRangeInput`
- `normalizeLegacyTimeBoundaryRanges`

## Recommended Target Shape

The clean target is:

- `legacy/LegacyStorageAdapter.ts`
  - public whole-board and whole-panel boundary adapter
- `legacy/LegacySeriesAdapter.ts`
  - public whole-series legacy boundary adapter only
- `legacy/LegacyTimeAdapter.ts`
  - public legacy time boundary adapter only
- `legacy/LegacyConversionHelpers.ts`
  - shared field-level converters used only inside `legacy/`
- `series/...`
  - neutral runtime helpers for normalized series models, if any fallback behavior is still temporarily required
- `time/...`
  - normalized internal range contracts for resolver/fetch flows

## Refactor Plan

### 1. Contain primitive converters inside `legacy/`

- Create `LegacyConversionHelpers.ts`.
- Move these helpers there:
  - `fromLegacyBoolean`
  - `toLegacyBoolean`
  - `toLegacyTagNameItem`
  - `toLegacyTagNameList`
  - optionally `toLegacyTimeValue`
- Update `LegacyStorageAdapter.ts`, `LegacySeriesAdapter.ts`, and `LegacyTimeAdapter.ts` to import those helpers internally.
- Stop exporting primitive field converters from the public adapter files.

Expected result:
- Non-legacy code can no longer casually depend on low-level legacy field rules.

### 2. Remove legacy-aware reads from normalized runtime code

- Replace `getSourceTagName(...)` with direct `sourceTagName` access where the types already guarantee it.
- Review these call sites first:
  - `common/tagSelection/TagSelectionModeRow.tsx`
  - `common/tagSelection/TagSelectionPanel.tsx`
  - `editor/sections/DataSection.tsx`
  - `utils/fetch/ChartSeriesRowsLoader.ts`
  - `utils/series/SeriesLabelFormatter.ts`
  - `utils/series/SeriesSummaryUtils.ts`
- Review normalization helpers next:
  - `common/tagSelection/useTagSelectionState.ts`
  - `utils/series/TagSelectionChartSetup.ts`

Expected result:
- Normalized UI and runtime code stops depending on `legacy/` for basic series-name behavior.

### 3. Remove legacy time shapes from internal pipelines

- Change internal time/fetch helpers so they take normalized range data instead of `LegacyTimeRangeInput`.
- Start with:
  - `utils/time/PanelTimeRangeResolver.ts`
  - `utils/fetch/TagAnalyzerDataRepository.ts`
  - `editor/PanelEditorUtils.ts`
- Keep `toLegacyTimeRangeInput` only where a real external legacy contract still requires `bgn/end`.

Expected result:
- Internal time logic no longer serializes to legacy shapes and then immediately deserializes again.

### 4. Tighten tests around ownership boundaries

- Keep the current round-trip storage tests.
- Add or update tests so normalized runtime objects do not rely on `tagName`.
- If helper ownership changes, move helper tests to the new helper file instead of leaving them attached to public adapter modules.

Expected result:
- The tests protect the adapter boundary without encouraging helper leakage.

## Suggested Priority

1. Remove `getSourceTagName` / `withNormalizedSourceTagName` / `normalizeSourceTagNames` from normal runtime code.
2. Internalize `toLegacyBoolean`, `fromLegacyBoolean`, `toLegacyTagNameItem`, and similar primitives.
3. Remove `LegacyTimeRangeInput` from internal time/fetch flows.
4. Clean up tests and file names after the boundaries are stable.

## Bottom Line

Your instinct is correct.

The `legacy` folder should mostly expose whole-structure boundary adapters, not tiny conversion primitives.

The biggest current smell is not only `toLegacyBoolean`.
The bigger issue is that normal UI, fetch, and series code still imports legacy-aware helpers, which means the normalized model boundary is still soft.

If this cleanup is done, the `legacy` folder becomes a real boundary instead of a shared compatibility toolbox.
