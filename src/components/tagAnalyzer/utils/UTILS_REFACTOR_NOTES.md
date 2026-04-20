# Tag Analyzer Utils Refactor Notes

## Main Problem

The `utils` folder is easier to navigate than before, but it still mixes a few different concerns:

- Pure domain types
- UI-specific panel types
- Data fetching and boundary resolution
- Legacy parsing and normalization
- Shared React components (`TagSearchModalBody`, `TagSelectionModeRow`)

The biggest code-quality issue is that many APIs still accept nullable input and return nullable output. That forces repeated `undefined` checks, weakens type guarantees, and makes it harder to know which data is actually "resolved" versus "still partial."

## Highest-Value Fixes

### 1. Reduce nullable contracts

Current pattern:

- `aBoardRange: ValueRange | undefined`
- `aRangeConfig: TimeRangeConfig | undefined`
- `resolveX(...): TimeRange | undefined`

This is the main source of noise.

Better pattern:

- Keep nullable values at the edge only
- Normalize once
- Pass strict types after normalization

Recommended split:

- `Raw...` or `Input...` types for partially known values
- `Resolved...` types for guaranteed values

Examples:

- `PanelNavigateState` could become `PendingPanelNavigateState | LoadedPanelNavigateState`
- `PanelTime` could distinguish raw legacy input from normalized panel time
- `resolveTimeRangePair` could return a result object instead of `undefined`

### 2. Tighten normalized model types

`modelTypes.ts`, `PanelModel.ts`, and `TagAnalyzerTypes.ts` are now clearer than before, but there is still overlap between:

- Domain data types
- Board/workspace action types
- Panel UI state types

Recommended refactor:

- Keep `modelTypes.ts` for domain data only
- Keep `PanelModel.ts` for panel UI-only types
- Keep `TagAnalyzerTypes.ts` for board/workspace orchestration

Then extract shared aliases that repeat across files:

- "optional time range"
- "range resolution params"
- "panel action payloads"

### 3. Consolidate time/range logic further

These files all participate in the same flow:

- `TagAnalyzerTimeRangeConfig.ts`
- `TagAnalyzerDateUtils.ts`
- `PanelRangeResolution.ts`
- `TimeRangePairUtils.ts`
- `getBgnEndTimeRange.ts`

They should read as one pipeline:

1. Parse legacy/raw input
2. Normalize into strict range types
3. Resolve boundaries/fetch-dependent values
4. Build concrete panel/navigator ranges

Right now the logic is spread across multiple files with repeated `undefined` handling. The next cleanup should be to make this flow more explicit, even if the files stay separate.

### 4. Move React components out of `utils`

These are not utilities:

- `TagSearchModalBody.tsx`
- `TagSelectionModeRow.tsx`

They are shared UI components. They should live in a small shared UI folder such as:

- `shared/`
- `tagSearch/`
- `components/`

This would make `utils` feel more trustworthy as a place for non-UI logic.

## Specific Code Smells

- Many functions accept `undefined` only because callers are not normalized early enough.
- Many helpers return `undefined` where a small result union would be clearer.
- Several types use `string | undefined` or `number | undefined` even after data has already been normalized.
- `SeriesConfig`, `PanelTime`, and chart-related types still carry optional fields that look more like input-state than resolved-state.

## Suggested Refactor Order

1. Introduce strict "resolved" types for time/range flows.
2. Limit `undefined` to parsing/fetch boundaries.
3. Replace `T | undefined` returns with explicit result objects where possible.
4. Move shared React components out of `utils`.
5. Extract repeated parameter/result types used across range-resolution helpers.

## Simple Rule Going Forward

After normalization, functions in `utils` should prefer:

- strict input
- strict output
- one responsibility

If a function still needs nullable input, it should usually mean it belongs at an edge layer, not in the middle of the core flow.
