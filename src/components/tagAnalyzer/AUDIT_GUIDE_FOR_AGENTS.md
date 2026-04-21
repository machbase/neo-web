# Tag Analyzer Audit Guide For Agents

Use this guide when auditing code for the Tag Analyzer area.

The goal is not to produce a generic file inventory. The goal is to produce an audit that helps a human quickly understand:
- what each file really does
- what each function really does
- where responsibilities are blurred
- what should be consolidated, renamed, or moved

## Core Expectations

- Cover every file in the requested scope.
- Cover every function in each file, not only exported functions.
- Be explicit. Avoid vague summaries like "handles fetch logic" or "does helper work".
- Describe the real responsibility of the file in plain language.
- Call out unclear names directly.
- Prefer consolidation into existing files over proposing lots of new files.
- Treat naming clarity as part of the audit, not as a separate cosmetic issue.

## What A Good Audit Must Include

For each file, include:
- file path or file name
- line count when useful
- a one- or two-sentence role description
- a complete function list
- a plain description of what each function does
- an audit note that explains overlap, duplication, unclear boundaries, naming problems, or cleanup opportunities

For the folder as a whole, include:
- file counts by subfolder when useful
- current large files or hotspots
- the main responsibility clusters
- the most important cleanup targets

## Required Audit Style

### 1. Start From Actual Code, Not File Names

Do not trust the file name by itself.

Read:
- the file contents
- the types it depends on
- its call sites when responsibility is unclear
- nearby tests if behavior is not obvious

If a file is named poorly, say so directly and recommend a better name.

### 2. Describe Responsibility, Not Just Topic

Bad:
- "fetch helpers"
- "repository for tag analyzer"
- "loads panel data"

Better:
- "builds SQL/TQL query strings for calculated and raw fetches"
- "loads one chart series at a time through explicit raw and calculated fetch paths"
- "turns panel fetch inputs into chart state for the main panel and navigator"

The role description should answer:
- what input comes in
- what output comes out
- what layer the file belongs to

### 3. List Every Function Explicitly

Do not summarize with "many helpers" or "multiple internal functions".

List each function and say what it does.

Examples of acceptable descriptions:
- `mapRowsToChartData`: converts fetched row tuples into `[time, value]` chart rows.
- `fetchRawSeriesRows`: validates the range, builds one raw fetch request, and calls the repository.
- `resolvePanelFetchInterval`: decides whether to use a saved interval or calculate one from chart width.

If the file has no functions, say `Functions: none.`

### 4. Audit Naming Aggressively

If a name is vague, say it is vague.

Names should tell the reader:
- what is being loaded, mapped, converted, or resolved
- whether the file is raw-data, chart-state, query-building, repository, legacy, or UI logic
- whether the function works on one item, one series, one panel, or a whole workflow

Bad or suspicious name patterns:
- `*Helpers`
- `*Utils` when the file contains several different responsibilities
- `*Repository` when the file is doing orchestration instead of direct backend requests
- names that say "data" when the output is actually chart state, UI state, or a transformed model

When naming is unclear, recommend exact replacement names.

Example recommendation style:
- rename `FetchHelpers.ts` to `FetchQueryUtils.ts` if the file is mostly query building
- rename `TagAnalyzerFetchRepository.ts` to `ChartSeriesRowsLoader.ts` if it actually loads one series at a time
- rename `PanelFetchWorkflow.ts` to `PanelChartDataLoader.ts` or `PanelChartStateLoader.ts` if it builds chart runtime state

## Refactor Principles To Use In The Audit

### Prefer Consolidation Over New Files

Default rule:
- first ask whether the code can be moved into an existing file with a clearer responsibility
- only suggest a new file when the responsibility is distinct and existing files would become less clear

Avoid proposing new files just because a file is large.

Before suggesting a new file, check:
- can this function move into an already existing file that owns this concern
- can the existing file name become more explicit after moving code
- would adding a new file create more navigation burden than clarity

### Prefer Concrete APIs Over Boolean Routing

If a function exists mostly to route between two different behaviors with a boolean, call that out.

Prefer:
- direct `fetchRawSeriesRows(...)`
- direct `fetchCalculatedSeriesRows(...)`

Over:
- `fetchSeriesRows(..., isRaw, ...)`

If callers can choose the behavior explicitly, the audit should recommend removing the boolean router.

### Move Logic Closer To The Function That Uses It

If a local variable or helper exists only to serve one query builder or one branch, consider merging it.

Example pattern to call out:
- a branch builds `sTimeBucket`
- the variable is only used in `buildAverageCalculationQuery(...)`
- the better shape may be for `buildAverageCalculationQuery(...)` to build its own bucket internally

This keeps the call site at one abstraction level.

### Call Out Boundary Smells

If a file needs runtime guards because the incoming type is too loose, do not just say "good defensive code".

Explain both sides:
- whether the guard is currently necessary
- whether it is a sign that the boundary type should be narrowed

Example:
- a fetch loader checks whether `colName.name`, `colName.time`, and `colName.value` exist
- if the broader `SeriesConfig` type allows them to be missing, the guard is real
- but the audit should also say the fetch boundary would be cleaner with a narrower fetch-ready type

### Prefer Moving Functions To The Right Owner

When a function feels out of place, recommend the target file, not just "extract this".

Good recommendation:
- move `analyzePanelDataLimit` into `PanelChartDataLoader.ts` because it is panel fetch workflow logic, not chart-row mapping

Weaker recommendation:
- "extract overflow logic"

Always say:
- what to move
- from which file
- to which file
- why the destination owns that concern more clearly

## What To Look For During The Audit

Check each file for:
- mixed responsibilities
- duplicate logic
- helper functions with unclear names
- repository files that do orchestration instead of transport
- query-builder files that also contain presentation logic or unrelated helpers
- boolean parameters that hide distinct behaviors
- functions used only by one branch or one caller
- conversions between legacy and normalized types that should happen as a whole-structure conversion instead of scattered single-field calls
- types that are too broad for the layer they are entering
- tests that are oversized because one production file is doing too much

## Preferred Recommendation Format

Recommendations should be concrete.

Prefer:
- move `fetchTopLevelTimeBoundaryRanges` from `TagAnalyzerDataRepository.ts` to a time-boundary focused file if the repository should stay transport-only
- rename `PanelChartDataLoader.ts` to `PanelChartStateLoader.ts` if the file returns chart state, not just raw data
- merge the average-query bucket construction into `buildAverageCalculationQuery(...)`

Avoid:
- "refactor for better separation"
- "split this file up"
- "improve naming"

## Suggested Output Structure

Use this structure unless the user asks for a different format.

### Header
- scope
- date
- short summary of what the audit covers

### Folder Summary
- total files
- subfolder counts
- large file hotspots
- biggest responsibility clusters

### Per-File Sections

For each file:
- file name and optional line count
- `Role: ...`
- `Functions:`
- one line per function
- `Audit note:` with concrete cleanup observations

### Naming Recommendations

Include a section for file naming when names are unclear.

For each recommendation, say:
- current name
- recommended name
- why the old name is unclear
- why the new name is clearer

### Bottom Line

Close with:
- the clearest areas
- the messiest areas
- the best cleanup opportunities
- whether the cleanup should mostly be moving code, renaming files, tightening boundaries, or only creating one or two new files

## Explicit Preferences From This Project

Follow these preferences unless the user says otherwise:
- do not recommend many new files by default
- prefer moving functions into existing files
- prefer explicit naming over generic utility naming
- prefer direct function names that reveal the behavior
- question "repository" naming when the file is not a thin backend adapter
- question "loader" naming when the output is unclear
- question "helpers" naming almost every time
- mention when a function seems unnecessary because the abstraction is too thin
- mention when a helper exists only because the upstream type is too broad

## Short Quality Checklist

Before finishing the audit, verify:
- every file in scope is listed
- every function in scope is listed
- each role description is specific
- vague file names are called out
- recommendations prefer consolidation first
- recommendations name exact destination files
- the audit is understandable without opening the code
