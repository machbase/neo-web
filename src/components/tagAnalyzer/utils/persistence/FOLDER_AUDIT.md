# Folder Audit: `utils/persistence`

## Summary
- Date: `2026-04-22`
- Direct files: `7`
- Direct subfolders: `utils/persistence/legacy`
- Responsibility: Owns versioned `.taz` persistence boundaries for TagAnalyzer boards and panels: persisted type definitions, format version resolution, inbound parsing, runtime-to-persisted mapping, and normalized board-save serialization.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Excluded direct files: `ExampleTaz.taz`, `FOLDER_AUDIT.md`, `TazBoardInfoParser.test.ts`, `TazBoardStatePersistence.test.ts`, `TazFilePersistence.test.ts`, `TazFormatVersions.md`, `TazPanelInfoMapper.test.ts`
- Largest direct file: `utils/persistence/TazPanelInfoMapper.ts` (917 lines)
- Helper hotspot: `utils/persistence/TazPanelInfoMapper.ts`
- Responsibility removed: pre-2.0.0 flat-panel conversion now lives in `utils/persistence/legacy` instead of being mixed directly into the modern versioned mapper.
- Responsibility removed: `.taz` tab-open, board-list save-state, and dirty-state helpers now live in `utils/workspace` instead of this folder.
- Folder verdict: The folder theme is now correct at the file level; the remaining work here is internal simplification inside large parser and mapper files rather than moving more workspace code out.

## Files

### `TazBoardInfoParser.ts`
- Path: `utils/persistence/TazBoardInfoParser.ts`
- Lines: `367`
- Role: Parses persisted `.taz` boards and panels into normalized `BoardInfo` by resolving version branches, repairing missing defaults, recoloring old series lists, and cleaning legacy time sentinels.
- Similar files: `utils/persistence/TazPanelInfoMapper.ts`, `utils/persistence/legacy/LegacyFlatPanelMapper.ts`
- Combine note: Keep separate; inbound parsing and default repair belong at a different boundary than outbound serialization, though the duplicated per-version defaulting logic should be watched.
- Needs edit: `Warning`
- Why: The file still has one persistence theme, but version routing, default injection, color repair, and legacy fallback are all owned here.
- Functions:
  - `parseReceivedBoardInfo` (16 lines, line 38) - Responsibility: Converts one persisted board payload into normalized `BoardInfo` and normalizes the top-level board time range. Needs edit: `No`.
  - `parseReceivedPanelInfo` (54 lines, line 62) - Responsibility: Chooses the correct parser path for one persisted panel by version and structural fallback, then returns normalized `PanelInfo`. Needs edit: `Warning`.
  - `normalizePersistedPanelInfoV200` (22 lines, line 117) - Responsibility: Repairs missing defaults on one `2.0.0` persisted panel before the mapper reads it. Needs edit: `No`.
  - `normalizePersistedPanelInfoV201` (22 lines, line 140) - Responsibility: Repairs missing defaults on one `2.0.1` persisted panel before the mapper reads it. Needs edit: `No`.
  - `normalizePersistedPanelInfoV202` (70 lines, line 163) - Responsibility: Repairs missing data, time, and grouped-axis defaults on one `2.0.2` persisted panel before conversion. Needs edit: `Warning`.
  - `normalizePersistedPanelInfoV203` (69 lines, line 234) - Responsibility: Repairs missing data, time, and left/right-axis defaults on one `2.0.3` persisted panel before conversion. Needs edit: `Warning`.
  - `normalizePersistedSeriesInfoV200` (8 lines, line 304) - Responsibility: Guarantees that one `2.0.0` persisted series always has an `annotations` array. Needs edit: `No`.
  - `normalizePersistedSeriesInfoV201` (8 lines, line 313) - Responsibility: Guarantees that one `2.0.1+` persisted series always has an `annotations` array. Needs edit: `No`.
  - `createColoredSeriesListV200` (9 lines, line 322) - Responsibility: Adds missing color values to one `2.0.0` persisted series list before runtime parsing. Needs edit: `Warning`.
  - `createColoredSeriesListV201` (9 lines, line 332) - Responsibility: Adds missing color values to one `2.0.1` persisted series list before runtime parsing. Needs edit: `Warning`.
  - `createColoredSeriesListV202` (9 lines, line 342) - Responsibility: Adds missing color values to one `2.0.2` persisted series list before runtime parsing. Needs edit: `Warning`.
  - `createColoredSeriesListV203` (9 lines, line 352) - Responsibility: Adds missing color values to one `2.0.3` persisted series list before runtime parsing. Needs edit: `Warning`.
  - `normalizeLegacyTimeKeeper` (5 lines, line 362) - Responsibility: Removes the legacy empty-string sentinel from a saved time-range pair. Needs edit: `No`.
    Warning: 5 lines; it is a good abstraction because it names a reusable guard, conversion, or UI event clearly.

### `TazBoardStatePersistence.ts`
- Path: `utils/persistence/TazBoardStatePersistence.ts`
- Lines: `162`
- Role: Serializes normalized `BoardInfo` models back into the latest persisted `.taz` board shape.
- Similar files: `utils/persistence/TazFilePersistence.ts`, `utils/persistence/TazPanelInfoMapper.ts`
- Combine note: Keep separate; board-level serialization is a clean persistence boundary that should stay apart from panel-level mapping.
- Needs edit: `No`
- Why: Workspace board-list mutation helpers were moved out to `utils/workspace/TazSavedBoardState.ts`, leaving this file with one persistence responsibility.
- Functions:
  - `createPersistedTazBoardInfo` (9 lines, line 85) - Responsibility: Serializes one normalized `BoardInfo` into the current persisted `.taz` board shape. Needs edit: `No`.

### `TazFilePersistence.ts`
- Path: `utils/persistence/TazFilePersistence.ts`
- Lines: `145`
- Role: Shapes `.taz` save payloads directly from normalized runtime `BoardInfo` models.
- Similar files: `utils/persistence/TazBoardStatePersistence.ts`, `utils/workspace/TazTabState.ts`
- Combine note: Keep separate; this file now owns BoardInfo-to-save-payload shaping while workspace tab helpers live outside the persistence folder.
- Needs edit: `No`
- Why: `.taz` tab-open and save-flow state helpers were moved out to `utils/workspace/TazTabState.ts`, leaving this file on the persistence boundary.
- Functions:
  - `createSaveTazBoardInfo` (3 lines, line 71) - Responsibility: Delegates one normalized board serialization to the main persisted board serializer. Needs edit: `Warning`.
    Warning: 3 lines; it is a thin wrapper and should be kept only if the name makes call sites clearer.
  - `createTazSavePayloadFromBoardInfo` (9 lines, line 81) - Responsibility: Builds the persisted `.taz` payload from normalized `BoardInfo` and clears transient tab fields. Needs edit: `No`.

### `TazPanelInfoMapper.ts`
- Path: `utils/persistence/TazPanelInfoMapper.ts`
- Lines: `917`
- Role: Defines versioned persisted panel and series types and converts normalized runtime panel and series models to and from each persisted `.taz` shape.
- Similar files: `utils/persistence/TazBoardInfoParser.ts`, `utils/persistence/TazPersistenceTypes.ts`, `utils/persistence/legacy/LegacyFlatPanelMapper.ts`
- Combine note: Keep separate from the board parser because structural mapping is a real boundary, but review an internal split because persisted type declarations, type guards, serializers, deserializers, and clone helpers all change for different reasons.
- Needs edit: `Yes`
- Why: The file still has one persistence theme, but it is too large and mixes persisted type declarations, shape guards, versioned mappers, and cloning primitives in one owner.
- Functions:
  - `isPersistedPanelInfoV200` (18 lines, line 238) - Responsibility: Detects whether one unknown persisted panel matches the nested `2.0.0` panel shape. Needs edit: `No`.
  - `isPersistedPanelInfoV201` (18 lines, line 263) - Responsibility: Detects whether one unknown persisted panel matches the explicit `2.0.1` panel shape. Needs edit: `Warning`.
  - `isPersistedPanelInfoV202` (21 lines, line 288) - Responsibility: Detects whether one unknown persisted panel matches the grouped-axis `2.0.2` panel shape. Needs edit: `No`.
  - `isPersistedPanelInfoV203` (21 lines, line 316) - Responsibility: Detects whether one unknown persisted panel matches the left/right-axis `2.0.3` panel shape. Needs edit: `No`.
  - `createPersistedSeriesInfo` (17 lines, line 344) - Responsibility: Converts one runtime series config into the explicit persisted series shape. Needs edit: `No`.
  - `createPersistedPanelInfo` (82 lines, line 368) - Responsibility: Converts one runtime panel into the explicit `2.0.3` persisted panel shape. Needs edit: `Warning`.
  - `createPanelInfoFromPersistedV200` (71 lines, line 457) - Responsibility: Converts one `2.0.0` persisted panel into the normalized runtime `PanelInfo` shape. Needs edit: `Warning`.
  - `createPanelInfoFromPersistedV201` (80 lines, line 535) - Responsibility: Converts one `2.0.1` persisted panel into the normalized runtime `PanelInfo` shape. Needs edit: `Warning`.
  - `createPanelInfoFromPersistedV202` (80 lines, line 622) - Responsibility: Converts one `2.0.2` persisted panel into the normalized runtime `PanelInfo` shape. Needs edit: `Warning`.
  - `createPanelInfoFromPersistedV203` (80 lines, line 709) - Responsibility: Converts one `2.0.3` persisted panel into the normalized runtime `PanelInfo` shape. Needs edit: `Warning`.
  - `createSeriesInfoFromPersistedV200` (17 lines, line 790) - Responsibility: Converts one `2.0.0` persisted series into the normalized runtime series shape. Needs edit: `No`.
  - `createSeriesInfoFromPersistedV201` (17 lines, line 808) - Responsibility: Converts one `2.0.1+` persisted series into the normalized runtime series shape. Needs edit: `No`.
  - `createPersistedSeriesColumnsV201` (16 lines, line 826) - Responsibility: Renames one runtime series column record into the persisted column-name field layout. Needs edit: `No`.
  - `createRuntimeSeriesColumns` (21 lines, line 843) - Responsibility: Renames one persisted series column record back into the runtime column-name field layout. Needs edit: `No`.
  - `cloneSeriesColumns` (3 lines, line 865) - Responsibility: Clones one runtime series column record when it exists. Needs edit: `Warning`.
    Warning: 3 lines; it is a thin wrapper and should be kept only if the name makes call sites clearer.
  - `cloneSeriesAnnotation` (9 lines, line 869) - Responsibility: Clones one series annotation record into a detached runtime-safe object. Needs edit: `No`.
  - `clonePanelHighlight` (9 lines, line 879) - Responsibility: Clones one panel highlight record into a detached runtime-safe object. Needs edit: `No`.
  - `cloneTimeRangePair` (17 lines, line 889) - Responsibility: Clones one nested saved time-range pair so persistence conversion does not share references with runtime state. Needs edit: `No`.
  - `cloneValueRange` (5 lines, line 907) - Responsibility: Clones one value-range object when it exists. Needs edit: `No`.
    Warning: 5 lines; it is a good abstraction because it names a reusable guard, conversion, or UI event clearly.
  - `cloneValueRangeOrDefault` (3 lines, line 913) - Responsibility: Clones one value-range object or supplies a `{ min, max }` default when it is missing. Needs edit: `Warning`.
    Warning: 3 lines; it is a thin wrapper and should be kept only if the name makes call sites clearer.

### `TazPersistenceTypes.ts`
- Path: `utils/persistence/TazPersistenceTypes.ts`
- Lines: `28`
- Role: Declares the persisted board-level union for all supported `.taz` panel payload shapes and the root persisted board contract.
- Similar files: `utils/persistence/TazPanelInfoMapper.ts`, `utils/persistence/legacy/LegacyFlatPanelTypes.ts`
- Combine note: Keep separate; this file is the shared type boundary between parser, mapper, and legacy adapter files.
- Needs edit: `No`
- Functions: none.

### `TazVersion.ts`
- Path: `utils/persistence/TazVersion.ts`
- Lines: `38`
- Role: Defines the current `.taz` format version and resolves persisted version buckets for parser and mapper code.
- Similar files: `utils/persistence/TazPersistenceTypes.ts`, `utils/version/utils.ts`
- Combine note: Keep separate; version policy is a clean boundary and would make parser and mapper files noisier if inlined.
- Needs edit: `No`
- Functions:
  - `resolvePersistedTazVersion` (25 lines, line 13) - Responsibility: Buckets one optional persisted version string into the supported `.taz` version set used by parser dispatch. Needs edit: `No`.
