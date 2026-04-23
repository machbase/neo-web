# Folder Audit: `utils/persistence/legacy`

## Summary
- Date: `2026-04-22`
- Direct files: `2`
- Direct subfolders: none
- Responsibility: Owns pre-2.0.0 flat-panel persistence conversion and the legacy flat-panel type shape used only at the old `.taz` boundary.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Excluded direct files: `FOLDER_AUDIT.md`, `LegacyFlatPanelMapper.test.ts`
- Largest direct file: `utils/persistence/legacy/LegacyFlatPanelMapper.ts` (248 lines)
- Helper hotspot: `utils/persistence/legacy/LegacyFlatPanelMapper.ts`
- Responsibility removed: modern versioned parser and mapper files no longer have to know the flat pre-2.0.0 panel shape directly.
- Folder verdict: The folder has the right boundary, but its mapper still depends on low-level public legacy converters from `utils/legacy`, which keeps the legacy API surface broader than it needs to be.

## Files

### `LegacyFlatPanelMapper.ts`
- Path: `utils/persistence/legacy/LegacyFlatPanelMapper.ts`
- Lines: `248`
- Role: Converts pre-2.0.0 flat panel records to and from normalized `PanelInfo` by repairing legacy defaults, coercing field types, and flattening nested runtime sections.
- Similar files: `utils/persistence/versionParsing/TazPanelVersionParser.ts`, `utils/legacy/LegacySeriesAdapter.ts`, `utils/legacy/LegacyTimeAdapter.ts`
- Combine note: Keep separate; the pre-2.0.0 flat shape is a real legacy boundary, but review the imported low-level legacy converters because they make this file depend on a wider legacy API than it should.
- Needs edit: `Warning`
- Why: The file fits the folder, but serialization, normalization, and low-level legacy coercion policy are all dense here.
- Functions:
  - `createPanelInfoFromLegacyFlatPanelInfo` (5 lines, line 21) - Responsibility: Converts one pre-2.0.0 flat panel payload into normalized runtime `PanelInfo`. Needs edit: `No`.
    Warning: 5 lines; it is a good abstraction because it names a reusable guard, conversion, or UI event clearly.
  - `toLegacyFlatPanelInfo` (51 lines, line 33) - Responsibility: Serializes one normalized runtime panel back into the pre-2.0.0 flat panel payload. Needs edit: `Warning`.
  - `resolvePanelTimeRangeConfig` (7 lines, line 85) - Responsibility: Chooses the time-range config to serialize, preferring the existing config and falling back to one derived from saved range bounds. Needs edit: `No`.
  - `normalizeLegacyFlatPanelInfo` (52 lines, line 93) - Responsibility: Repairs one flat legacy panel payload by normalizing booleans, numbers, time bounds, and series records before runtime assembly. Needs edit: `Warning`.
  - `createNormalizedLegacyPanelInfo` (87 lines, line 146) - Responsibility: Assembles one normalized nested `PanelInfo` object from the repaired flat legacy payload. Needs edit: `Warning`.
  - `normalizeNumericValue` (7 lines, line 234) - Responsibility: Coerces one legacy numeric field into a number and treats empty input as `0`. Needs edit: `Warning`.
  - `normalizeLegacyTimeKeeper` (5 lines, line 242) - Responsibility: Removes the legacy empty-string sentinel from one saved time-range pair. Needs edit: `No`.
    Warning: 5 lines; it is a good abstraction because it names a reusable guard, conversion, or UI event clearly.

### `LegacyFlatPanelTypes.ts`
- Path: `utils/persistence/legacy/LegacyFlatPanelTypes.ts`
- Lines: `53`
- Role: Defines the flat pre-2.0.0 panel storage shape that only the legacy persistence boundary should use.
- Similar files: `utils/persistence/TazPersistenceTypes.ts`, `utils/persistence/versionParsing/TazPanelVersionParser.ts`
- Combine note: Keep separate; the legacy flat shape is a real domain boundary and would only add noise if merged into modern versioned types.
- Needs edit: `No`
- Functions: none.
