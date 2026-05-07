# TagAnalyzer Refactor Issues

This note tracks the issues that were identified and/or temporarily addressed during the recent TagAnalyzer refactor work.

Important:
- Some code changes were reverted.
- That means the issues below may still exist in the current codebase.
- This file is a summary of the problems we mapped out, not a claim that they are all fixed right now.

## 1. Global state update logic was scattered inside `TagAnalyzer`

Issue:
- `TagAnalyzer.tsx` directly contained multiple `gBoardList` update rules.
- Save, save-as, panel append, panel delete, and persisted panel state updates were all handled inline.

Why this was a problem:
- Global board-list mutation rules were mixed into UI/component logic.
- The update behavior was harder to reuse and harder to test in isolation.

Target direction:
- Move `gBoardList` update logic into a dedicated updater module.

## 2. `BoardInfo` depended on `GBoardListType`

Issue:
- `BoardInfo` was derived from `GBoardListType`.
- That made TagAnalyzer runtime board types depend on the app-wide tab type.

Why this was a problem:
- Load/save conversion code inside TagAnalyzer indirectly depended on global app tab state.
- Persistence code and runtime board code were not cleanly separated.

Target direction:
- Make `BoardInfo` a pure TagAnalyzer type.
- Keep `GBoardListType` only at the global-state boundary.

## 3. `gBoardList` was the app-level source of truth, but that boundary was blurry

Issue:
- `TagAnalyzer` did not read `gBoardList` directly, but it still performed many writes to it.
- The ownership boundary between app tab state and TagAnalyzer board state was not explicit.

Why this was a problem:
- It made `TagAnalyzer` more coupled to app-level state than it needed to be.
- It made it harder to treat TagAnalyzer as a clean feature module.

Target direction:
- Parent/global layer owns `gBoardList`.
- TagAnalyzer consumes one board tab and emits update actions through dedicated helpers/callbacks.

## 4. The `taz` folder mixed `.taz` persistence logic with global/tab state logic

Issue:
- `taz/loadHelper/TazTabState.ts` created loaded tab state by assigning:
  - `id`
  - `name`
  - `type`
  - `path`
  - `savedCode`
- `taz/saveHelper/TazSavedBoardState.ts` was effectively global board-list update logic.

Why this was a problem:
- Those responsibilities are not `.taz` format conversion responsibilities.
- They belong to global/workspace/tab state handling, not persistence mapping.

Target direction:
- Keep `taz` focused on persisted `.taz` conversion and compatibility handling.
- Move tab/global-state assembly to a separate state-boundary module.

## 5. The `fetch` folder mixed database fetch code with chart/panel orchestration

Issue:
- `fetch/helper/PanelChartDatasetFetcher.ts` did more than transport:
  - sample-count calculation
  - panel fetch range resolution
  - interval resolution
  - overflow detection
  - dataset shaping
- `fetch/PanelChartDataLoader.ts` orchestrated panel chart loading, not just request transport.
- `fetch/helper/ChartSeriesMapper.ts` mapped fetch rows into chart-ready series data.

Why this was a problem:
- These files were part of chart/panel loading behavior, not pure repository/query behavior.
- Folder naming no longer matched actual responsibility.

Target direction:
- Keep raw DB request code in explicit fetcher files.
- Move chart/panel load orchestration into a chart-loading module/folder.

## 6. `fetch` contained a UI presentation responsibility

Issue:
- `fetch/helper/FetchRequestErrorPresenter.ts` showed toast errors directly.

Why this was a problem:
- Toast presentation is UI feedback logic, not query/repository logic.
- It caused the query layer to own a presentation side effect.

Target direction:
- Move request-error toast handling into a dedicated feedback/presentation boundary.

## 7. `fetch` had a time-domain responsibility leak

Issue:
- The chart data fetcher previously exposed a top-level time-boundary helper that simply delegated to the time resolver.

Why this was a problem:
- Time-boundary resolution is time-domain logic, not query-layer logic.
- It blurred the meaning of the `fetch` folder.

Target direction:
- Call time-boundary resolution from the time module directly.

## 8. `fetch` had a local app-storage/config leak

Issue:
- `fetchRollupMetadata()` reads `localStorage` internally to choose the rollup metadata SQL variant.

Why this was a problem:
- Reading browser/app storage is not a pure fetch concern.
- It mixed environment/config lookup into a data-access function.

Target direction:
- Resolve the rollup version outside the fetcher and pass it in explicitly.

Note:
- This one had a broader dependency impact because non-TagAnalyzer code also called it.

## 9. Save/load responsibilities were conceptually mixed up

Issue:
- It was easy to think `taz` was “doing the file save/load” end to end.
- In reality, transport and conversion were split across different places.

Actual flow:
- Save transport:
  - initiated from `TagAnalyzer`
  - actual write goes through the shared API layer
- Load transport:
  - file open/load happens outside `TagAnalyzer`
  - `TagAnalyzer` receives the loaded tab object and converts it into runtime board state
- `taz` mainly handles:
  - persisted shape
  - version compatibility
  - persisted-to-runtime conversion
  - runtime-to-persisted conversion

Why this mattered:
- Folder boundaries were being discussed using an inaccurate mental model.
- Clarifying this was necessary before any clean refactor.

## 10. Runtime board shape and persisted `.taz` shape were still different

Issue:
- Even if `GBoardListType` were removed from TagAnalyzer internals, TagAnalyzer would still need persistence conversion.

Why this was important:
- Removing app-tab coupling does not remove legacy/persistence conversion needs.
- There are still differences between:
  - runtime board/panel shape
  - current persisted `.taz` shape
  - older legacy `.taz` shapes

Target direction:
- Keep persistence conversion code.
- Do not confuse global-state decoupling with persistence-format removal.

## 11. The true role split we arrived at

The clearer responsibility split was:

- `fetch`
  - database requests
  - SQL building
  - raw repository responses

- `taz`
  - `.taz` persisted types
  - load/save conversion
  - backward compatibility for older saved formats

- `globalStateUpdate`
  - app-level tab/board list updates
  - loaded tab assembly

- `time`
  - time-domain rules
  - boundary resolution
  - range parsing
  - interval decisions

- chart/panel load layer
  - chart fetch orchestration
  - fetch range selection
  - sampling
  - dataset shaping

## 12. Most concrete breach list

The most concrete folder-responsibility breaches identified were:

- `fetch/helper/FetchRequestErrorPresenter.ts`
  - UI toast behavior inside fetch layer

- `fetch/helper/PanelChartDatasetFetcher.ts`
  - panel/chart loading orchestration inside fetch layer

- `fetch/PanelChartDataLoader.ts`
  - chart load orchestration inside fetch layer

- `fetch/helper/ChartSeriesMapper.ts`
  - chart-series shaping inside fetch layer

- `fetch/ChartSeriesDataFetcher.ts`
  - chart series data transport

- `taz/loadHelper/TazTabState.ts`
  - open-tab/global-state assembly inside persistence folder

- `taz/saveHelper/TazSavedBoardState.ts`
  - global board-list update logic inside persistence folder

## 13. Order of refactor priorities that made the most sense

The refactor order that made the most sense was:

1. Centralize `gBoardList` update logic.
2. Decouple `BoardInfo` from `GBoardListType`.
3. Remove global/tab state helpers from `taz`.
4. Move chart loading/orchestration out of low-level fetchers.
5. Move UI toast feedback out of fetch helpers.
6. Remove time/local-storage leaks from fetch helpers where possible.

