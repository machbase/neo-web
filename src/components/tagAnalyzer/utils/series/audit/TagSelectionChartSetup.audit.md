# TagSelectionChartSetup.ts Audit

## File Role

`TagSelectionChartSetup.ts` assembles the data needed to create or update a chart from selected tag drafts.

## Supporting Values

### `MIN_MAX_PADDING` (`TagSelectionChartSetup.ts:7`)

Role: Defines the fallback width that gets added when the requested range would otherwise collapse to a single timestamp.

## Function Audit

### `buildDefaultRange` (`TagSelectionChartSetup.ts:17`)

Role: Produces a chart range that is always visible, even when min and max are identical.

Behavior summary:

- Returns the input bounds unchanged when the range already has width.
- Adds `MIN_MAX_PADDING` to `max` when `min === max`.

### `buildCreateChartSeed` (`TagSelectionChartSetup.ts:44`)

Role: Builds the initial chart payload from explicit chart inputs and the selected tag drafts.

Behavior summary:

- Keeps the requested `chartType`.
- Builds `tagSet` by concatenating the selected drafts onto an empty set and normalizing source tag names.
- Builds `defaultRange` by delegating to `buildDefaultRange(...)`.

### `mergeSelectedTagsIntoTagSet` (`TagSelectionChartSetup.ts:71`)

Role: Rebuilds a chart's tag set after the user changes the selected drafts.

Behavior summary:

- Converts the incoming draft list with `convertTagChartType(...)`.
- Merges that converted draft data into the existing series configs with `concatTagSet(...)`.
- Normalizes source tag names before returning the merged result.

## Notes

- The file is pure. It returns assembled data structures and does not trigger side effects.
- This file is the setup boundary between tag-selection UI data and the normalized chart-series config structure.

