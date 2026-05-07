# TagAnalyzer Import Boundaries

Production imports should follow this one-way flow:

```text
time
domain
series
chart
fetch / persistence
panel / modal / boardModal
TagAnalyzer.tsx / TagAnalyzerBoard.tsx
```

Rules:

- `time` is self-contained and must not import TagAnalyzer feature folders.
- `domain` owns shared runtime contracts and may import `time`, but not UI, fetch, chart, or persistence implementation code.
- `series` owns series behavior and may import `domain` and `time`.
- `chart`, `fetch`, and `persistence` may import foundational contracts, but should not import from UI folders for shared types.
- UI folders (`panel`, `modal`, `boardModal`) orchestrate lower layers; shared contracts should be promoted to `domain` or `time` instead of imported sideways.
