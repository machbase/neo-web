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
- Largest production file: `LegacyStorageAdapter.ts` (`413` lines)

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
- `modal/seriesSelection/TagSelectionModeRow.tsx`
- `modal/seriesSelection/TagSelectionPanel.tsx`
- `modal/seriesSelection/useTagSelectionState.ts`
  - `editor/sections/EditorDataTab.tsx`
  - `utils/fetch/ChartSeriesRowsLoader.ts`
  - `utils/series/PanelSeriesLabelFormatter.ts`
  - `utils/series/SelectedRangeSeriesSummaryBuilder.ts`
  - `utils/series/TagSelectionPanelSeriesBuilder.ts`

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
- `PanelSeriesConfig` already requires `sourceTagName: string`.
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

