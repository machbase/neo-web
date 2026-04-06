# PanelHelper Refactor Notes

This file reviews [PanelHelper.ts](/c:/_github_repos/neo-web/src/components/tagAnalyzer/panel/PanelHelper.ts):
- what functions exist
- where the remaining duplication is
- how the helper layer can become more declarative and practical
- which refactors are worth doing first

## Current Purpose

`PanelHelper.ts` is currently doing 4 different jobs:

1. Range math
2. Fetch parameter building
3. Async data loading helpers
4. Panel time-resolution logic

That means it is already more organized than before, but it still mixes:
- pure calculations
- async orchestration
- domain normalization
- UI-facing header formatting

So the file is useful, but broad.

## Function Groups

### 1. Range / movement helpers

These are mostly good examples of practical functional helpers:
- `getSelectionMenuPosition`
- `getExpandedNavigatorRange`
- `getNavigatorRangeFromEvent`
- `shouldReloadNavigatorData`
- `getZoomInPanelRange`
- `getZoomOutRange`
- `getFocusedPanelRange`
- `getMovedPanelRange`
- `getMovedNavigatorRange`
- `getPanelGlobalTimeTarget`
- `createPanelTimeKeeperPayload`

What they do:
- convert chart or button input into a next range or next payload
- avoid putting small math blocks in `Panel.tsx`

How they could improve:
- rename some “get” functions to reflect decision-making instead of raw lookup
- unify the returned shapes where possible

Examples:
- `getZoomOutRange` and `getMovedPanelRange` both return `{ panelRange, navigatorRange? }`
- `getFocusedPanelRange` also returns the same shape

Suggested improvement:
- define one shared exported type like `PanelRangeUpdate`
- use that consistently at the type level instead of keeping it file-local only

### 2. Chart sizing / fetch preparation helpers

These are small but useful:
- `getPanelChartWidth`
- `getPanelFetchCount`
- `getPanelFetchTimeRange`
- `getPanelIntervalOption`
- `buildCalculationFetchParams`
- `buildRawFetchParams`

What they do:
- convert panel state into API-ready params

What is duplicated:
- `buildCalculationFetchParams` and `buildRawFetchParams` still have a lot of overlapping fields:
  - `Table`
  - `TagNames`
  - `Start`
  - `End`
  - `CalculationMode`
  - interval spread
  - `colName`
  - `Count`

Suggested refactor:
- add a small shared base builder
- keep raw/calculation-specific fields layered on top

Example shape:

```ts
type BaseFetchParams = {
  Table: string;
  TagNames: string;
  Start: number;
  End: number;
  CalculationMode: string;
  colName: unknown;
  Count: number;
} & TagAnalyzerIntervalOption;
```

Then:
- `buildBaseFetchParams(...)`
- `buildRawFetchParams(...)`
- `buildCalculationFetchParams(...)`

This would be more declarative because the common fetch contract becomes visible in one place.

### 3. Dataset creation helpers

These are:
- `fetchPanelDatasets`
- `fetchChartRows`
- `mapRowsToChartData`
- `getSeriesName`
- `buildChartSeriesItem`
- `getPanelDataLimitState`

What they do:
- fetch rows
- convert rows to chart series
- detect raw data truncation / limit overflow

This area is much better than before because the navigator/panel fetch loops were merged.

Remaining issue:
- `fetchPanelDatasets` still does several jobs at once:
  - resolve time range
  - resolve interval
  - fetch rows
  - detect limit state
  - build final chart series

That is still acceptable, but it is the biggest “mixed orchestration” function in the helper file.

Suggested improvement:
- keep `fetchPanelDatasets` as the orchestration entry
- split the inside into two smaller helpers:
  - `resolvePanelFetchContext(...)`
  - `buildDatasetFromFetchResult(...)`

That would make the main loop easier to read.

Example:

```ts
const context = resolvePanelFetchContext(...);
const dataset = buildDatasetFromFetchResult(...);
```

This is a practical refactor because it improves readability without scattering logic too much.

### 4. Reset / initialization time resolution helpers

These are:
- `getTopLevelLastRange`
- `getEditableTopLevelLastRange`
- `getDefaultBoardRange`
- `getEditPreviewRange`
- `getAbsolutePanelRange`
- `getNowPanelRange`
- `getRelativePanelLastRange`
- `resolveResetTimeRange`
- `resolveInitialPanelRange`
- `getTimeKeeperRanges`

What they do:
- convert board + panel time config into actual numeric time windows

This is the most domain-heavy part of the file.

What is duplicated:
- `resolveResetTimeRange` and `resolveInitialPanelRange` share most of their decision tree:
  - top-level last
  - relative panel last
  - now
  - absolute / default fallback

The difference is mostly:
- edit mode behavior
- reset fallback order

Suggested refactor:
- introduce one shared resolver like `resolveBasePanelTimeRange(...)`
- pass strategy options for the few differences

Example idea:

```ts
type PanelTimeResolutionMode = 'initial' | 'reset';

resolvePanelTimeRange({
  mode: 'reset',
  boardInfo,
  panelData,
  panelTime,
  bgnEndTimeRange,
  isEdit,
});
```

Why this helps:
- makes the “time resolution policy” explicit
- reduces duplicated if-chain structure
- centralizes the order of precedence

This is one of the best next refactors in the file.

### 5. UI-facing formatting helper

This is currently:
- `buildPanelHeaderState`

What it does:
- converts panel runtime state into the view model used by `PanelHeader`

This is a good pattern.

Why it is useful:
- `Panel.tsx` does not need to inline string formatting and visibility rules
- `PanelHeader` receives an already-shaped state object

Minor improvement:
- move the time/interval text formatting into tiny helpers if this object keeps growing

But this is not urgent.

## Duplicates And Overlap

The biggest duplicates or overlaps still present are:

1. `resolveResetTimeRange` vs `resolveInitialPanelRange`
- same resolution tree with slightly different priorities

2. `buildCalculationFetchParams` vs `buildRawFetchParams`
- same base fields with different special cases

3. `getMovedPanelRange`, `getMovedNavigatorRange`, `getZoomOutRange`, `getFocusedPanelRange`
- same family of `panelRange + optional navigatorRange` results, but no single exported update contract

4. `getTopLevelLastRange`, `getEditableTopLevelLastRange`, `getEditPreviewRange`
- same “derive a range from top-level min/max state” family
- names are okay, but there is repeated shape-building

## Naming Improvements

Several names are serviceable, but not as clear as they could be.

The general pattern I would aim for is:
- use `build...` for object shaping
- use `resolve...` for decision trees
- use `create...` for simple value construction
- use `fetch...` for async data loading
- use `is...` / `has...` / `should...` for boolean intent

### Names That Could Be Clearer

#### `getPanelFetchCount`

Current meaning:
- calculate how many samples to request for a chart width

Why the current name is a little vague:
- “get” sounds like simple lookup
- this is really calculating a fetch limit

Better options:
- `resolvePanelFetchCount`
- `calculatePanelFetchCount`

Recommended:
- `calculatePanelFetchCount`

#### `getPanelFetchTimeRange`

Current meaning:
- resolve the actual numeric time range to use for fetching

Why the current name is weak:
- not a simple getter
- it combines panel time config, board time config, and optional override range

Better options:
- `resolvePanelFetchTimeRange`
- `resolveFetchTimeRange`

Recommended:
- `resolvePanelFetchTimeRange`

#### `getPanelIntervalOption`

Current meaning:
- decide the fetch interval based on panel config, chart width, raw mode, and navigator mode

Why the current name is weak:
- “option” is generic
- “get” hides the fact that this is a calculation and fallback decision

Better options:
- `resolvePanelInterval`
- `resolveFetchInterval`

Recommended:
- `resolvePanelFetchInterval`

#### `getPanelChartWidth`

Current meaning:
- normalize chart width so fetch/count logic never sees `0` or `undefined`

Why the current name is weak:
- it sounds like raw property access

Better options:
- `normalizeChartWidth`
- `resolveChartWidth`

Recommended:
- `normalizeChartWidth`

#### `getPanelDataLimitState`

Current meaning:
- determine whether a raw fetch hit a data limit and what the effective limit end is

Why the current name is weak:
- “state” is vague
- it is really a limit analysis result

Better options:
- `analyzePanelDataLimit`
- `resolvePanelDataLimit`

Recommended:
- `analyzePanelDataLimit`

#### `getTopLevelLastRange`

Current meaning:
- derive a range from top-level board `last...` config

Why the current name is slightly unclear:
- “top level” is an internal concept

Better options:
- `resolveBoardLastRange`
- `resolveRootLastRange`

Recommended:
- `resolveBoardLastRange`

#### `getEditableTopLevelLastRange`

Current meaning:
- derive the edit-preview version of the board-level last range

Why the current name is awkward:
- “editable” is vague
- “top level” is still vague

Better options:
- `resolveEditBoardLastRange`
- `resolveEditableBoardLastRange`

Recommended:
- `resolveEditBoardLastRange`

#### `getEditPreviewRange`

Current meaning:
- derive a reset/init range from the editor preview min/max values

Why the current name is not ideal:
- “preview range” could mean many things

Better options:
- `resolveEditPreviewTimeRange`
- `resolvePreviewTimeRange`

Recommended:
- `resolveEditPreviewTimeRange`

#### `getAbsolutePanelRange`

Current meaning:
- return a numeric range only when panel time config is absolute numbers

This one is already fairly good.

Possible small improvement:
- `resolveAbsolutePanelRange`

Recommended:
- optional rename only

#### `getNowPanelRange`

Current meaning:
- resolve a `now...` based relative range

Why the current name is a bit underspecified:
- not just “now”
- it is “panel time config using now semantics”

Better options:
- `resolveNowRelativePanelRange`
- `resolveNowPanelRange`

Recommended:
- `resolveNowPanelRange`

#### `getRelativePanelLastRange`

Current meaning:
- resolve a panel-local `last...` range against fetched bounds

This one is fairly good.

Possible improvement:
- `resolveRelativeLastPanelRange`

Recommended:
- optional rename only

#### `getTimeKeeperRanges`

Current meaning:
- convert saved time-keeper state into panel and navigator ranges

Why the current name is only okay:
- “get” hides that it validates and may return nothing

Better options:
- `resolveTimeKeeperRanges`
- `buildTimeKeeperRanges`

Recommended:
- `resolveTimeKeeperRanges`

#### `getPanelGlobalTimeTarget`

Current meaning:
- choose between pre-overflow range and panel range when pushing global time

Why the current name is weak:
- “target” is vague

Better options:
- `resolveGlobalTimeTargetRange`
- `resolvePanelGlobalTimeRange`

Recommended:
- `resolveGlobalTimeTargetRange`

#### `buildPanelHeaderState`

Current meaning:
- shape panel runtime state into header view state

This one is already a good name.

Recommended:
- keep as-is

#### `fetchPanelDatasets`

Current meaning:
- orchestration helper that resolves fetch context, fetches rows, builds datasets, and tracks limit state

Why the current name is only partially accurate:
- it does more than fetching
- it also computes interval/count/limit analysis

Better options:
- `loadPanelDatasets`
- `resolvePanelDatasets`
- `buildFetchedPanelDatasets`

Recommended:
- keep for now, or rename to `loadPanelDatasets` if you want the async orchestration nature to be more obvious

### Naming Direction For The File

If this file is kept as one file, I would aim for:

- `normalize...`
  - for input cleanup like width
- `calculate...`
  - for numeric math
- `resolve...`
  - for decision trees and fallback logic
- `build...`
  - for output object shaping
- `fetch...` or `load...`
  - for async remote work

That naming consistency alone would make `PanelHelper.ts` easier to scan even before deeper refactors happen.

## Declarative / Functional Improvements

The goal should not be “make everything pure at all costs.”
The practical goal should be:
- keep calculations pure
- keep orchestration obvious
- keep async helpers readable

### Good candidates for more declarative refactoring

#### A. Build a `PanelFetchContext`

Right now several helpers separately pass:
- `panelData`
- `panelTime`
- `panelAxes`
- `boardInfo`
- `chartWidth`
- `isRaw`
- `timeRange`

That is a lot of repeated shape passing.

Suggested:

```ts
type PanelFetchContext = {
  timeRange: TagAnalyzerTimeRange;
  interval: TagAnalyzerIntervalOption;
  count: number;
  isRaw: boolean;
};
```

Then:
- one helper builds the context
- other helpers consume it

This would make async dataset assembly much more declarative.

#### B. Make movement helpers use explicit direction unions

Right now some helpers still use raw strings like:
- `'l'`
- `'r'`

Suggested:

```ts
type PanelMoveDirection = 'left' | 'right';
```

This improves readability immediately with low risk.

#### C. Introduce one exported `PanelRangeUpdate`

That shared return shape already exists in practice:

```ts
type PanelRangeUpdate = {
  panelRange: TagAnalyzerTimeRange;
  navigatorRange?: TagAnalyzerTimeRange;
};
```

It should be promoted to an exported type if more panel files use it.

#### D. Replace truthy checks on numeric times

There are places like:
- `panelRange.startTime ? ... : ''`
- `aPreOverflowRange.startTime && aPreOverflowRange.endTime`

These work because `0` is being used as “empty,” but they are not very explicit.

Suggested:
- use a small helper like `isInitializedTimeRange(...)`
- or compare against `0` explicitly

That would make the intent clearer after the model changes.

## Suggested Refactor Order

### First

1. Merge `resolveResetTimeRange` and `resolveInitialPanelRange` into one policy-driven resolver.
2. Extract `buildBaseFetchParams(...)` from raw/calculation fetch param builders.
3. Introduce explicit direction types for movement helpers.

These are the biggest readability wins for the least disruption.

### Second

4. Introduce `PanelFetchContext` so `fetchPanelDatasets` has fewer repeated inputs.
5. Split `fetchPanelDatasets` internally into:
   - `resolvePanelFetchContext(...)`
   - `buildDatasetFromFetchResult(...)`

### Later

6. Consider splitting `PanelHelper.ts` into:
   - `PanelRangeUtil.ts`
   - `PanelFetchUtil.ts`
   - `PanelTimeResolver.ts`

I would not do this immediately.
Right now the file is still manageable enough, and splitting too early could make navigation worse.

## Practical Recommendation

The best practical next refactor is:

1. unify the initial/reset range decision logic
2. make fetch-param building share a base helper
3. add explicit direction and update-result types

That would make the file noticeably more declarative and easier to scan without turning it into a pile of tiny helpers.
