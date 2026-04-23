# Maximum Update Depth Report

## Issue
React warned: `Maximum update depth exceeded` while TagAnalyzer board panels were loading or refreshing time boundaries.

## What Was Happening
1. `TagAnalyzer` refetched top-level `timeBoundaryRanges` from an effect in [TagAnalyzer.tsx](C:/_github_repos/neo-web/src/components/tagAnalyzer/TagAnalyzer.tsx:334).
2. That effect was being retriggered by board-level panel persistence churn, not just by real top-level time changes.
3. Each refetch returned a new `ValueRangePair` object, so `timeBoundaryRanges` looked changed even when the values were the same.
4. `BoardPanel` watches `pChartBoardState.timeBoundaryRanges` and ran `reset()` when that prop changed in [BoardPanel.tsx](C:/_github_repos/neo-web/src/components/tagAnalyzer/panel/BoardPanel.tsx:573).
5. `reset()` resolved a range, then called `setExtremes(range, range)` in [BoardPanel.tsx](C:/_github_repos/neo-web/src/components/tagAnalyzer/panel/BoardPanel.tsx:247).
6. `setExtremes()` flowed into `applyPanelAndNavigatorRanges()` in [useChartRuntimeController.ts](C:/_github_repos/neo-web/src/components/tagAnalyzer/chart/useChartRuntimeController.ts:196).
7. Before the fix, that path did not stop when the requested panel range and navigator range were already the current ones.
8. That update path could notify the board that panel state had changed, which wrote panel state back into the board list.
9. Writing panel state rebuilt `pInfo`, rebuilt `newBoardInfo`, and retriggered the top-level boundary effect again.

## Why It Happened
- A top-level responsibility and a panel-level responsibility were coupled together.
- Top-level boundary loading was reacting to panel persistence churn.
- Panel reset logic treated a new object reference as a meaningful boundary change.
- The shared chart runtime did not explicitly no-op identical range updates.

## Why React Warned
The loop became:

`useEffect` -> `setState` / persist -> rerender -> same `useEffect` runs again

React eventually stopped it with the maximum update depth warning.

## Extra Startup Race
`BoardPanel` could also run `reset()` before the initial `initialize()` flow had fully finished.
That made the loop easier to trigger because boundary-driven reset work could run while chart ranges were still settling.

## Visible Symptoms
- Repeated panel resets or reloads.
- Repeated fetch attempts to the TQL endpoint.
- If auth was already broken, repeated `401` errors could appear as a symptom of the loop.

## Fix
- `TagAnalyzer` now dedupes equal boundary results and only updates boundary state when values really changed.
- `BoardPanel` only reacts to boundary changes after initialization finished and boundary data exists.
- `BoardPanel.reset()` now exits when it resolves the same visible range.
- `applyPanelAndNavigatorRanges()` now exits early for identical panel and navigator ranges.
