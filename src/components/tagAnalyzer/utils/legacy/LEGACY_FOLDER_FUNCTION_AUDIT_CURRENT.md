# TagAnalyzer Legacy Folder Function Audit (Current)

Scope: `src/components/tagAnalyzer/utils/legacy`

Date: `2026-04-20`

This file is the exhaustive companion to `LEGACY_FOLDER_AUDIT_CURRENT.md`.
Its purpose is to audit every file and every function under the legacy folder, including private helpers and test-only helpers.

## Summary

- Total files reviewed: `8` code/test files plus the existing summary audit
- Production files with functions: `3`
- Production type-only files with no functions: `1`
- Test files with local helper functions: `1`
- Test files with no local helper functions: `3`

Main conclusion:
- The `legacy` folder has the right high-level purpose, but it still mixes true boundary adapters with low-level conversion primitives and runtime compatibility helpers.
- Your instinct is correct: helpers like `toLegacyBoolean`, `fromLegacyBoolean`, `toLegacyTagNameItem`, and similar field-level converters should usually not be part of the public API.
- The bigger issue is that normalized runtime code still imports some legacy-aware helpers, especially the source-tag-name helpers and some legacy time-shape helpers.

## File Audit

### `LegacySeriesAdapter.ts`

Role:
- Series and tag adapter between legacy-compatible records and normalized series models.

Primary findings:
- This file is doing three jobs at once:
  - whole-series legacy boundary conversion
  - low-level field conversion
  - compatibility fallback for normal runtime code outside `legacy/`
- The first job is good.
- The second job should usually be private to `legacy/`.
- The third job is the main architecture leak.

Function audit:

- `getSourceTagName` (`public`, line `18`)
  - Responsibility: Read either `sourceTagName` or `tagName` and return one canonical string.
  - Assessment: Useful as a migration bridge, but wrong as a long-term `legacy/` export.
  - Recommendation: Move out of `legacy/` into a neutral runtime helper if transitional fallback is still needed, or remove it and read `sourceTagName` directly where normalized types already guarantee it.

- `withNormalizedSourceTagName` (`public`, line `36`)
  - Responsibility: Normalize one record so it always has `sourceTagName`.
  - Assessment: Reasonable migration helper, but not really a legacy boundary adapter.
  - Recommendation: Move out of `legacy/` or delete after the runtime stops accepting `tagName` as a normal shape.

- `normalizeSourceTagNames` (`public`, line `57`)
  - Responsibility: Batch version of `withNormalizedSourceTagName`.
  - Assessment: Same issue as the single-item helper.
  - Recommendation: Move with `withNormalizedSourceTagName` if the helper is still needed, otherwise delete once normalized code no longer needs legacy fallback behavior.

- `normalizeLegacySeriesConfigs` (`public`, line `69`)
  - Responsibility: Convert legacy-compatible series configs into normalized `SeriesConfig[]`.
  - Assessment: Good public boundary entry point.
  - Recommendation: Keep public.

- `normalizeLegacyChartSeries` (`public`, line `81`)
  - Responsibility: Convert legacy chart payloads into row-based chart data.
  - Assessment: Good boundary adapter if legacy chart payloads still arrive from older sources.
  - Recommendation: Keep public while legacy chart payloads still exist. If that path disappears, fold it inward.

- `toLegacyTagNameItem` (`public`, line `95`)
  - Responsibility: Convert one normalized item back to legacy `tagName`.
  - Assessment: Too low-level to be a public adapter API.
  - Recommendation: Make private or move into a `LegacyConversionHelpers.ts` file used only inside `legacy/`.

- `toLegacyTagNameList` (`public`, line `112`)
  - Responsibility: Batch version of `toLegacyTagNameItem`.
  - Assessment: Same issue as the single-item helper.
  - Recommendation: Make private or move into a legacy-internal helper file.

- `toLegacySeriesConfigs` (`public`, line `124`)
  - Responsibility: Convert normalized series configs back into legacy-compatible config records.
  - Assessment: Good public boundary exit point.
  - Recommendation: Keep public.

- `legacySeriesToChartPoints` (`public`, line `143`)
  - Responsibility: Convert legacy or row-based chart data into point objects.
  - Assessment: This is a conversion detail, not a strong boundary API. It is only used inside this file and its tests.
  - Recommendation: Make private unless another real boundary caller needs point output directly.

- `normalizeLegacySeriesConfig` (`private`, line `162`)
  - Responsibility: Convert one legacy-compatible series config into one normalized `SeriesConfig`.
  - Assessment: Good focused private helper. It keeps the public batch function simple.
  - Recommendation: Keep private.

- `fromLegacyBoolean` (`public`, line `199`)
  - Responsibility: Convert legacy `Y/N` into `boolean`.
  - Assessment: This is exactly the kind of primitive converter that should not be a public adapter API.
  - Recommendation: Move to a legacy-internal conversion helper file and stop exporting it.

- `toLegacyBoolean` (`public`, line `209`)
  - Responsibility: Convert `boolean` into legacy `Y/N`.
  - Assessment: Same issue as `fromLegacyBoolean`.
  - Recommendation: Move to a legacy-internal conversion helper file and stop exporting it.

- `legacyChartSeriesHasArrays` (`private`, line `219`)
  - Responsibility: Detect whether a chart payload is still in `xData/yData` legacy form.
  - Assessment: Good private type guard.
  - Recommendation: Keep private.

- `legacyChartSeriesToRows` (`private`, line `234`)
  - Responsibility: Convert legacy chart payloads into chart rows.
  - Assessment: Good private implementation helper.
  - Recommendation: Keep private.

Bottom line for this file:
- Keep public: `normalizeLegacySeriesConfigs`, `toLegacySeriesConfigs`, `normalizeLegacyChartSeries`
- Move out of `legacy/` or remove: `getSourceTagName`, `withNormalizedSourceTagName`, `normalizeSourceTagNames`
- Internalize: `toLegacyTagNameItem`, `toLegacyTagNameList`, `legacySeriesToChartPoints`, `fromLegacyBoolean`, `toLegacyBoolean`

### `LegacyStorageAdapter.ts`

Role:
- Whole-board and whole-panel storage adapter between legacy stored board/panel records and normalized `BoardInfo` / `PanelInfo`.

Primary findings:
- This is the healthiest production file in the folder.
- It is doing real boundary work.
- The main concern is size and the fact that it imports low-level conversion helpers from `LegacySeriesAdapter.ts`.

Function audit:

- `normalizeBoardInfo` (`public`, line `23`)
  - Responsibility: Convert a legacy board record into normalized board state.
  - Assessment: Strong boundary adapter. This is exactly the kind of public function the `legacy` folder should expose.
  - Recommendation: Keep public.

- `toLegacyFlatPanelInfo` (`public`, line `43`)
  - Responsibility: Flatten one normalized panel back into legacy storage shape.
  - Assessment: Strong boundary adapter.
  - Recommendation: Keep public.

- `getNextBoardListWithSavedPanels` (`public`, line `103`)
  - Responsibility: Replace the target board panels with a serialized legacy panel list.
  - Assessment: Acceptable public helper because it combines board-list persistence with boundary serialization in one common save path.
  - Recommendation: Keep public for now. If board persistence logic is later extracted, this could move with that workflow.

- `getNextBoardListWithSavedPanel` (`public`, line `120`)
  - Responsibility: Replace one saved panel in one board.
  - Assessment: Same as the whole-list save helper. The function is focused and clear.
  - Recommendation: Keep public for now.

- `getNextBoardListWithoutPanel` (`public`, line `142`)
  - Responsibility: Remove one panel from one board.
  - Assessment: Same as the other board mutation helpers.
  - Recommendation: Keep public for now.

- `normalizeLegacyPanelInfo` (`private`, line `161`)
  - Responsibility: Convert one legacy flat panel into a normalized panel by delegating to the normalization pipeline.
  - Assessment: Good private wrapper. It keeps the board-level mapper readable.
  - Recommendation: Keep private.

- `normalizeLegacyFlatPanelInfo` (`private`, line `171`)
  - Responsibility: Repair legacy field types, defaults, and sentinel values before grouping them into nested panel state.
  - Assessment: Important function and the center of the file's normalization logic. It is large, but its responsibility is still coherent.
  - Recommendation: Keep private. If this file is split later, this is one of the best extraction points.

- `createNormalizedPanelInfo` (`private`, line `230`)
  - Responsibility: Assemble normalized nested `PanelInfo` sections from the repaired flat legacy shape.
  - Assessment: Good private assembler. It separates coercion from object assembly.
  - Recommendation: Keep private.

- `resolvePanelTimeRangeConfig` (`private`, line `307`)
  - Responsibility: Choose the time-range config to serialize, preferring an existing config and falling back to a derived one.
  - Assessment: Good focused serializer helper.
  - Recommendation: Keep private.

- `updateBoardPanels` (`private`, line `323`)
  - Responsibility: Replace the panel list on the matching board only.
  - Assessment: Small but useful. Keeps the public save helpers flatter.
  - Recommendation: Keep private.

- `findBoardPanels` (`private`, line `340`)
  - Responsibility: Look up the panels for one board id.
  - Assessment: Small and clear. Fine as a private helper.
  - Recommendation: Keep private.

- `createLegacyPanelList` (`private`, line `353`)
  - Responsibility: Convert normalized panels into flat legacy panel records.
  - Assessment: Clear private mapping helper.
  - Recommendation: Keep private.

- `replaceLegacyPanel` (`private`, line `365`)
  - Responsibility: Replace one flattened legacy panel entry.
  - Assessment: Good focused private helper.
  - Recommendation: Keep private.

- `removeLegacyPanel` (`private`, line `382`)
  - Responsibility: Remove one flattened legacy panel entry.
  - Assessment: Good focused private helper.
  - Recommendation: Keep private.

- `normalizeNumericValue` (`private`, line `395`)
  - Responsibility: Coerce legacy numeric storage values into numbers, treating empty fields as `0`.
  - Assessment: Good shared coercion helper, though the empty-to-zero policy is important enough that the name could arguably be more explicit.
  - Recommendation: Keep private. If touched later, consider a name that highlights the empty-string defaulting behavior.

- `normalizeLegacyTimeKeeper` (`private`, line `409`)
  - Responsibility: Remove the legacy empty-string sentinel from `time_keeper`.
  - Assessment: Good focused legacy cleanup helper.
  - Recommendation: Keep private.

Bottom line for this file:
- Public API shape is mostly good.
- The file could eventually split into panel conversion and board mutation helpers, but it is still architecturally aligned with the `legacy` folder.
- Its main dependency problem is the public import of primitive converters from `LegacySeriesAdapter.ts`.

### `LegacyTimeAdapter.ts`

Role:
- Adapter between legacy scalar time values and the normalized time-boundary model.

Primary findings:
- The file has the right purpose.
- The problem is less about the file itself and more about where its helpers are used.
- Internal normalized time/fetch modules still serialize into legacy `bgn/end` shapes in the middle of normal runtime flows.

Function audit:

- `normalizeLegacyTimeBoundaryRanges` (`public`, line `24`)
  - Responsibility: Convert a legacy `bgn_min/bgn_max/end_min/end_max` pair into `ValueRangePair`.
  - Assessment: Reasonable boundary adapter if that min/max response shape is truly an external legacy contract.
  - Recommendation: Keep public only if the backend response shape is a real boundary. Otherwise this should move closer to the resolver or repository code that owns the response.

- `normalizeLegacyTimeRangeBoundary` (`public`, line `50`)
  - Responsibility: Convert legacy start/end scalar values into normalized structured time bounds.
  - Assessment: Strong boundary adapter when the input is truly legacy.
  - Recommendation: Keep public for true legacy input paths.

- `toLegacyTimeRangeInput` (`public`, line `66`)
  - Responsibility: Serialize a normalized range source into legacy `bgn/end` values.
  - Assessment: Acceptable at a true boundary, but it is currently used inside normalized time/fetch workflows too early.
  - Recommendation: Keep only for true edge serialization. Remove it from internal resolver/repository flows where possible.

- `toLegacyTimeValue` (`public`, line `87`)
  - Responsibility: Serialize one normalized `TimeBoundary` into one legacy scalar.
  - Assessment: This is a low-level primitive converter, not a strong public adapter.
  - Recommendation: Make private or move into a legacy-internal conversion helper file unless a real boundary caller still needs scalar-level access directly.

- `legacyMinMaxPairToRange` (`private`, line `107`)
  - Responsibility: Validate a min/max pair and return a `ValueRange`.
  - Assessment: Good private helper.
  - Recommendation: Keep private.

- `normalizeLegacyTimeBoundary` (`private`, line `127`)
  - Responsibility: Convert one legacy time scalar into the normalized `TimeBoundary` union.
  - Assessment: Important private parser adapter. It cleanly isolates the `empty` / `absolute` / parsed-relative / raw fallback logic.
  - Recommendation: Keep private.

Bottom line for this file:
- Keep `normalizeLegacyTimeRangeBoundary` as a public edge adapter.
- Re-evaluate whether `normalizeLegacyTimeBoundaryRanges` and `toLegacyTimeRangeInput` are truly boundary-level exports or just compensating for internal shape mismatch.
- Internalize `toLegacyTimeValue` unless there is a clear external reason to keep it public.

### `LegacyTypes.ts`

Role:
- Type-only legacy contracts for board storage, series configs, time values, and chart payloads.

Function audit:
- No functions in this file.

Type-level audit:
- `LegacyFlatPanelInfo`, `LegacyBoardSourceInfo`, `LegacyCompatibleSeriesConfig`, and `LegacyTimeValue` are valid edge contracts.
- `LegacyTimeRangeInput` is the type that currently leaks the most into normalized runtime code.
- `LegacySourceTagNameInput`, `LegacyNormalizedSourceTagName`, and `LegacyTagNameItem` are useful transition types, but they support the same compatibility leak seen in `LegacySeriesAdapter.ts`.

Recommendation:
- Keep this file as the edge-contract file.
- Reduce imports of these types outside real legacy boundaries.

### `LegacySeriesAdapter.test.ts`

Role:
- Focused tests for series/tag normalization and legacy chart payload conversion.

Function audit:
- No local helper functions in this file.

Coverage audit:
- Covers `normalizeSourceTagNames`
- Covers `normalizeLegacySeriesConfigs`
- Covers `toLegacyTagNameList`
- Covers `normalizeLegacyTimeBoundaryRanges`
- Covers `normalizeLegacyChartSeries`
- Covers `legacySeriesToChartPoints`

Assessment:
- Useful regression net for the series boundary behavior.
- If helper ownership changes, the tests should move with that ownership instead of forcing the public API to stay too wide.

### `LegacyStorageAdapter.test.ts`

Role:
- Main round-trip storage conversion spec for nested and flat panel/board data.

Function audit:

- `normalizeLegacyPanelInfoForTest` (`test helper`, line `15`)
  - Responsibility: Normalize one legacy flat panel by wrapping it in a board fixture and running the board-level adapter.
  - Assessment: Good test helper. It reuses the real app entry path instead of bypassing the board-level normalization flow.
  - Recommendation: Keep as a test-only helper.

Coverage audit:
- Covers nested-to-flat round trips
- Covers flat-to-nested normalization
- Covers legacy defaults and coercions
- Covers tag-name to source-tag-name normalization
- Covers board-level range normalization

Assessment:
- This is the most important test file in the folder because it protects the exact adapter boundary the runtime depends on.
- It is large, but the coverage is meaningful.

### `LegacyStorageAdapterBoardSave.test.ts`

Role:
- Focused tests for board save/update/remove helpers in `LegacyStorageAdapter.ts`.

Function audit:
- No local helper functions in this file.

Coverage audit:
- Covers `getNextBoardListWithSavedPanel`
- Covers `getNextBoardListWithSavedPanels`
- Covers `getNextBoardListWithoutPanel`
- Verifies saved tag sets serialize back to legacy `tagName`

Assessment:
- Clean focused spec.
- Good example of boundary-oriented testing.

### `LegacyTimeAdapter.test.ts`

Role:
- Focused tests for legacy time-value parsing and serialization.

Function audit:
- No local helper functions in this file.

Coverage audit:
- Covers empty legacy values
- Covers absolute numeric legacy values
- Covers supported relative expressions
- Covers unsupported raw string preservation

Assessment:
- Small and appropriately focused.
- This file should continue to test boundary conversion behavior, not justify keeping primitive converters public in unrelated modules.

## Cross-File Findings

- `LegacySeriesAdapter.ts` is the main leak point.
- `LegacyStorageAdapter.ts` is the strongest example of the right pattern.
- `LegacyTimeAdapter.ts` is directionally correct, but some of its helpers are overused in internal normalized flows.
- `LegacyTypes.ts` is fine as an edge-contract file, but some types are still flowing too far into runtime code.

Most important public API decisions:

- Keep public:
  - `normalizeBoardInfo`
  - `toLegacyFlatPanelInfo`
  - `getNextBoardListWithSavedPanels`
  - `getNextBoardListWithSavedPanel`
  - `getNextBoardListWithoutPanel`
  - `normalizeLegacySeriesConfigs`
  - `toLegacySeriesConfigs`
  - `normalizeLegacyChartSeries`
  - `normalizeLegacyTimeRangeBoundary`

- Make private or move into a legacy-internal helper file:
  - `fromLegacyBoolean`
  - `toLegacyBoolean`
  - `toLegacyTagNameItem`
  - `toLegacyTagNameList`
  - `legacySeriesToChartPoints`
  - likely `toLegacyTimeValue`

- Move out of `legacy/` or remove after migration:
  - `getSourceTagName`
  - `withNormalizedSourceTagName`
  - `normalizeSourceTagNames`

- Restrict to true edge usage only:
  - `toLegacyTimeRangeInput`
  - possibly `normalizeLegacyTimeBoundaryRanges`

## Recommended Plan

1. Create `LegacyConversionHelpers.ts` for field-level conversion primitives used only inside `legacy/`.
2. Remove runtime imports of `getSourceTagName`, `withNormalizedSourceTagName`, and `normalizeSourceTagNames` from normal UI/fetch/series code.
3. Stop passing `LegacyTimeRangeInput` through internal normalized time/fetch workflows.
4. Keep the storage adapter tests strong while narrowing the public surface of the legacy modules.

## Bottom Line

The folder does not need a total rewrite.

The core board/panel storage adapter is in a good place.
The cleanup should focus on API shape:
- public legacy modules should expose boundary conversions
- low-level field converters should stay internal
- normalized runtime code should stop depending on `legacy/` for normal operations
