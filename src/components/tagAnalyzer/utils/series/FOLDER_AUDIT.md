# Folder Audit: `utils/series`

## Summary
- Date: 2026-04-24
- Direct files: `6`
- Direct subfolders: none
- Responsibility: This folder owns series model types, aggregation options, display labels, palette fallback, selected-range summaries, and tag-selection-to-panel conversion helpers.
- Scope note: Generated audit files, test files, markdown files, and TAZ files are excluded from the inventory.
- Largest direct file: `utils/series/TagSelectionPanelSeriesBuilder.ts` (280 lines)
- Helper hotspot: `utils/series/TagSelectionPanelSeriesBuilder.ts` (10 named functions)

## Files

### `PanelSeriesAggregationConstants.ts`
- Path: `utils/series/PanelSeriesAggregationConstants.ts`
- Lines: 17
- Role: Defines the allowed aggregation mode list and the select-option objects used by series selection UI.
- Similar files: `utils/series/PanelSeriesColorResolver.ts`
- Combine note: Keep separate; aggregation mode options and color palette rules are different responsibilities.
- Responsibility assessment: Single responsibility. This file is only constant data plus one derived options list.
- Needs edit: No. The file is focused and the name matches the job.
- Functions: none.

### `PanelSeriesColorResolver.ts`
- Path: `utils/series/PanelSeriesColorResolver.ts`
- Lines: 37
- Role: Defines the TagAnalyzer line palette and resolves the visible color for one series.
- Similar files: `utils/series/PanelSeriesAggregationConstants.ts`
- Combine note: Keep separate; this file owns display-color fallback policy, not generic constants.
- Responsibility assessment: Single responsibility. This file only answers one question: which color should this series display.
- Needs edit: No. Responsibility removed: chart, editor, and save callers no longer choose palette fallback themselves.
- Functions:
  - `getPanelSeriesDisplayColor` (6 lines, line 28)
    - Brief description: Returns the stored series color or the deterministic palette fallback for the series index.
    - Responsibility: Single responsibility. This function owns the display-color fallback rule for one series.
    - Final verdict: Needs edit: No. The function is focused and the caller loses one explicit display-policy decision.
  - `getTagAnalyzerPaletteColor` (3 lines, line 35)
    - Brief description: Returns the palette color for one series index, wrapping around the palette length.
    - Responsibility: Single responsibility. This function maps an index to the shared TagAnalyzer palette.
    - Final verdict: Needs edit: No. The function is focused enough for now.
    - Warning: 3 lines; it is a thin wrapper and should be kept only if the name makes call sites clearer.

### `PanelSeriesLabelFormatter.ts`
- Path: `utils/series/PanelSeriesLabelFormatter.ts`
- Lines: 85
- Role: Formats short, editor, and chart labels for one series from alias, source tag name, and raw-vs-aggregate label rules.
- Similar files: `utils/series/SelectedRangeSeriesSummaryBuilder.ts`
- Combine note: Keep separate; label formatting and numeric summary building are related but belong to different output concerns.
- Responsibility assessment: Responsibility removed: callers no longer assemble short, editor, and chart label strings themselves. Warning: legacy source-tag fallback still leaks into a current-runtime formatter through `LegacySeriesAdapter` instead of staying at the boundary.
- Needs edit: Warning. The file is still focused on labels, but it should not need legacy fallback for `PanelSeriesConfig`.
- Functions:
  - `formatSeriesLabel` (21 lines, line 19)
    - Brief description: Chooses the alias or source tag name and formats it for the requested label target.
    - Responsibility: Mixed responsibilities. This function resolves alias precedence, reaches into legacy tag-name fallback, and applies target-specific label formatting rules.
    - Final verdict: Needs edit: Warning. Keep together for now because the target-specific label rules are one policy surface, but the legacy fallback should move out of this runtime formatter.
  - `getSeriesShortName` (6 lines, line 48)
    - Brief description: Returns the compact list label for one series.
    - Responsibility: Single responsibility. This function names the short-label call site clearly.
    - Final verdict: Needs edit: No. The wrapper is acceptable because it makes the target-specific label intent explicit.
  - `getSeriesEditorName` (6 lines, line 62)
    - Brief description: Returns the editor label for one series.
    - Responsibility: Single responsibility. This function names the editor-label variant clearly.
    - Final verdict: Needs edit: No. The wrapper is acceptable because it makes the target-specific label intent explicit.
  - `getSeriesName` (9 lines, line 77)
    - Brief description: Returns the chart label for one series, with optional raw-label formatting.
    - Responsibility: Single responsibility. This function selects the chart-label variant and forwards the raw-label flag to the shared formatter.
    - Final verdict: Needs edit: No. The wrapper is still clear and the name matches the chart-rendering use case.

### `PanelSeriesTypes.ts`
- Path: `utils/series/PanelSeriesTypes.ts`
- Lines: 66
- Role: Defines the runtime series config, annotation, chart dataset, and selected-range summary types used by TagAnalyzer.
- Similar files: `utils/panelModelTypes.ts`
- Combine note: Keep separate; panel-level model types and series-level model types are different layers.
- Responsibility assessment: Warning: this type file now holds core series config types, chart-render DTOs, and selection-summary DTOs in one place. The layer is still coherent, but overlap is starting to grow.
- Needs edit: Warning. The file is acceptable now, but chart-output types and selection-summary types may deserve their own owner if the folder grows further.
- Functions: none.

### `SelectedRangeSeriesSummaryBuilder.ts`
- Path: `utils/series/SelectedRangeSeriesSummaryBuilder.ts`
- Lines: 66
- Role: Builds selected-window min, max, and average summary rows from chart datasets and series metadata.
- Similar files: `utils/series/PanelSeriesLabelFormatter.ts`
- Combine note: Keep separate; summary statistics and label formatting should not be merged into one file.
- Responsibility assessment: Warning: this file mixes range filtering, numeric aggregation, decimal-string formatting, and summary-row assembly. Warning: it also reaches into `LegacySeriesAdapter` for a runtime summary path.
- Needs edit: Warning. The file still has one broad summary theme, but the function is doing several distinct steps and legacy fallback should not sit here.
- Functions:
  - `buildSeriesSummaryRows` (41 lines, line 26)
    - Brief description: Filters each visible series to the selected time window and builds summary rows with min, max, and average values.
    - Responsibility: Mixed responsibilities. This function aligns series data with metadata by index, filters rows by time, computes aggregates, formats numeric output strings, and builds the final summary DTOs.
    - Final verdict: Needs edit: Warning. Keep together for now because the summary pipeline is linear, but the calculation step and the output-formatting step are distinct responsibilities.

### `TagSelectionPanelSeriesBuilder.ts`
- Path: `utils/series/TagSelectionPanelSeriesBuilder.ts`
- Lines: 280
- Role: Converts selected tag drafts into chart seeds, merged runtime series lists, and fully defaulted persisted new-panel payloads.
- Similar files: `boardModal/CreateChartModal.tsx`, `editor/AddTagsModal.tsx`
- Combine note: Keep separate from the UI files, but review this file for split; it now owns more than one non-UI responsibility.
- Responsibility assessment: Helper added only: this file now has more helpers, but it still owns selected-draft normalization, legacy merge defaults, new-panel time defaults, axis defaults, display defaults, panel id generation, and persistence conversion. The file name says `SeriesBuilder`, but it also builds a full persisted panel.
- Needs edit: Yes. UI-independent selection mapping is a good boundary, but new-panel construction and persistence conversion should leave this file.
- Functions:
  - `buildDefaultRange` (16 lines, line 43)
    - Brief description: Returns the selected min/max range and pads zero-width ranges so a new chart stays visible.
    - Responsibility: Single responsibility. This function owns the zero-width default-range padding rule.
    - Final verdict: Needs edit: No. The function is focused and the name matches the job.
  - `buildCreateChartSeed` (14 lines, line 70)
    - Brief description: Converts selected series drafts and time bounds into the intermediate chart seed object.
    - Responsibility: Mixed responsibilities. This function normalizes draft source-tag names and assembles the chart-seed shape.
    - Final verdict: Needs edit: Warning. The function is still readable, but legacy normalization and seed assembly are two separate concerns.
  - `buildCreateChartPanel` (15 lines, line 95)
    - Brief description: Converts selected drafts and time bounds into the current persisted panel shape.
    - Responsibility: Single responsibility. This function owns the create-chart persistence boundary for the current panel format.
    - Final verdict: Needs edit: No. The orchestration is short and explicit, even though the file that owns it is too broad.
  - `mergeSelectedTagsIntoTagSet` (10 lines, line 119)
    - Brief description: Appends selected drafts to the current tag set and normalizes the merged result.
    - Responsibility: Mixed responsibilities. This function merges runtime series with new draft rows and also applies legacy-name normalization.
    - Final verdict: Needs edit: Warning. The merge rule is clear, but the legacy normalization rule should not live in the same step.
  - `createRuntimeSeriesDrafts` (8 lines, line 130)
    - Brief description: Copies selected drafts and adds an explicit empty color field.
    - Responsibility: Single responsibility. This function prepares draft rows for runtime series conversion.
    - Final verdict: Needs edit: No. The helper is small, but it gives the preparation step a clear name.
  - `createLegacyChartSeriesDefaults` (11 lines, line 139)
    - Brief description: Copies selected drafts and adds the old legacy chart-default fields used by the merge path.
    - Responsibility: Single responsibility. This function prepares new rows for the legacy-compatible merge path.
    - Final verdict: Needs edit: No. The helper is explicit, but it also confirms that legacy defaults still leak into this modern series builder.
  - `createRuntimePanelInfoFromSeed` (81 lines, line 151)
    - Brief description: Builds a fully defaulted runtime panel object from the create-chart seed.
    - Responsibility: Mixed responsibilities. This function sets panel metadata defaults, data defaults, toolbar defaults, time config, axis config, display config, and empty highlight state.
    - Final verdict: Needs edit: Yes. This is the strongest hotspot in the folder because it builds a whole panel policy object inside a file that is supposed to be about series conversion.
  - `createAbsoluteTimeRangeConfig` (15 lines, line 233)
    - Brief description: Builds an absolute time-range config from explicit start and end timestamps.
    - Responsibility: Single responsibility. This function only maps two timestamps into the structured time-range config shape.
    - Final verdict: Needs edit: No. The helper is focused and belongs to the panel-construction path.
  - `createPanelDisplayForChartType` (28 lines, line 249)
    - Brief description: Returns the default display flags for each supported chart type.
    - Responsibility: Single responsibility. This function owns chart-type-to-display-default mapping.
    - Final verdict: Needs edit: No. The helper is focused, but the surrounding file is still the wrong owner for this panel-display policy.
  - `createPanelKey` (3 lines, line 278)
    - Brief description: Generates a string id for a new panel.
    - Responsibility: Single responsibility. This function only wraps the panel-key generation expression.
    - Final verdict: Needs edit: No. The helper is focused enough for now.
    - Warning: 3 lines; it is a thin wrapper and should be kept only if the name makes call sites clearer.
