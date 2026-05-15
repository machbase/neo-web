# TagAnalyzer Import Boundaries

Production imports should follow this one-way flow:

```text
domain/time
domain
series
chart
fetch / persistence
feedback
appState
panel / modal / boardModal
TagAnalyzer.tsx / TagAnalyzerBoard.tsx
```

Rules:

- `domain/time` is self-contained and must not import other TagAnalyzer feature folders.
- `domain` owns shared runtime contracts and may import `domain/time`, but not UI, fetch, chart, or persistence implementation code.
- `series` owns series behavior and may import `domain` and `domain/time`.
- `fetch` owns repositories, API calls, SQL builders, and raw request/response contracts. It should not own chart/panel loading orchestration.
- `panel` owns panel use cases such as loading chart state, fetch range selection, sampling decisions, limit analysis, and conversion from fetch rows to chart datasets.
- `persistence` owns `.taz` persisted shapes, format conversion, file write transport, and backward compatibility. It should not assemble app-tab/global-state snapshots.
- `appState` owns app-level board-list updates and save-result snapshots such as `name`, `path`, `savedCode`, and global Recoil-facing tab state.
- `feedback` owns user-facing presentation side effects such as request error toasts.
- UI folders (`panel`, `modal`, `boardModal`) orchestrate lower layers; shared contracts should be promoted to `domain` or `domain/time` instead of imported sideways.
