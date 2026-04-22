# Folder Audit: `utils/persistence/legacy`

## Summary
- Date: 2026-04-22
- Direct files: `2`
- Direct subfolders: none
- Responsibility: This folder owns legacy flat-panel persistence adapters and legacy flat-panel types.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Helper hotspot: none

## Files

### `LegacyFlatPanelMapper.ts`
- Path: `utils/persistence/legacy/LegacyFlatPanelMapper.ts`
- Lines: 231
- Role: Converts pre-2.0.0 flat panel records to and from the normalized PanelInfo shape.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions:
  - `createPanelInfoFromLegacyFlatPanelInfo` (5 lines, line 21) - Converts a pre-2.0.0 flat panel into the runtime panel model. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.
  - `toLegacyFlatPanelInfo` (51 lines, line 33) - Converts the runtime panel model into the pre-2.0.0 flat panel shape. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `resolvePanelTimeRangeConfig` (7 lines, line 85) - Resolves panel time range config. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeLegacyFlatPanelInfo` (52 lines, line 93) - Normalizes legacy flat panel info. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `createNormalizedLegacyPanelInfo` (71 lines, line 146) - Creates normalized legacy panel info. Needs edit: Warning. This function is starting to accumulate multiple steps and should be watched for further growth.
  - `normalizeNumericValue` (7 lines, line 218) - Normalizes numeric value. Needs edit: No. This function is small enough and focused enough for now.
  - `normalizeLegacyTimeKeeper` (5 lines, line 226) - Normalizes legacy time keeper. Needs edit: No. This function is small enough and focused enough for now. Warning: 5 lines; good abstraction because it gives a reusable named guard or conversion.

### `LegacyFlatPanelTypes.ts`
- Path: `utils/persistence/legacy/LegacyFlatPanelTypes.ts`
- Lines: 53
- Role: Defines the legacy flat-panel persistence types used only for pre-2.0.0 files.
- Combine note: Keep separate; the files are related but already large enough or layer-specific enough that merging would blur ownership.
- Needs edit: No. The current responsibility looks focused enough for now.
- Functions: none.

