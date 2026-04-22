# Tag Analyzer Audit Manual

Use this manual when auditing anything under [src/components/tagAnalyzer](/C:/_github_repos/neo-web/src/components/tagAnalyzer).

## Goal

- Make one [FOLDER_AUDIT.md](/C:/_github_repos/neo-web/src/components/tagAnalyzer/FOLDER_AUDIT.md)-style audit per folder.
- Audit every direct file in that folder.
- Audit every named function in each code file.
- Use explicit descriptions, not vague summaries.
- Exclude the generated `FOLDER_AUDIT.md` file from auditing itself to avoid recursive self-audits.
- Do not include test files or markdown files in the audit.
- Do not include TAZ files in the audit.

## Required File Output

For each file, write:

- File path.
- Line count.
- One explicit one-line role description.
- Similar file note.
- Combine note that says whether it should stay separate or be reviewed for merge.
- `Needs edit: Yes`, `No`, or `Warning`.
- `Functions: none.` when there are no named functions.

Do not write vague roles like `manages panel` or `handles fetch`.

Write roles like:

- `Loads panel and navigator datasets by resolving time range, interval, row count, and overflow state.`
- `Converts normalized PanelInfo to persisted TAZ panel versions and back again.`
- `Renders the editor section that changes axis flags, explicit ranges, thresholds, and Y2 assignments.`

## Required Function Output

For each named function, write:

- Function name.
- Line count.
- Line number when possible.
- One explicit one-line responsibility.
- `Needs edit: Yes`, `No`, or `Warning`.

If the function is 5 lines or fewer, always add a warning line that says one of these:

- It is a good abstraction because it names a reusable guard, conversion, or UI event clearly.
- It is a thin wrapper and should be kept only if the name makes call sites clearer.

## Very bad

- One file mixes unrelated layers such as UI rendering, persistence, fetch orchestration, and version conversion.
- Legacy pre-2.0.0 logic is mixed directly into modern runtime code instead of being converted at the boundary.
- A file saves, loads, parses, converts, and mutates global state all in one place.
- Names hide the real job of the code, especially names like `Utils`, `Helpers`, or `Data` when the file actually does several unrelated tasks.
- The same conversion or normalization rule appears in multiple files.
- A function quietly changes input data in place while its name reads like a pure mapper or selector.

## Bad

- A file has one theme but still holds too many responsibilities.
- A component has large inline helpers that should move to a clearer owner.
- A utility file has many helpers with different callers and different layers.
- Similar files exist and the split is not obvious.
- A function is large enough that a reader has to mentally split it into steps.
- A function is a pointless wrapper that only forwards arguments without adding a clearer name, boundary, or reusable rule.
- A file repeats the same branch or fallback logic in several functions instead of extracting one explicit rule.
- A helper takes flags or optional arguments that switch between multiple jobs.
- A function name sounds specific, but the implementation also validates, transforms, and triggers side effects.
- A helper exists only to rename one obvious method call and does not make the call site more declarative.
- A file creates intermediate data shapes only to pass them once into the next function without improving clarity.
- A function mixes mapping logic with mutation or side effects instead of keeping the transformation pipeline explicit.
- A file uses imperative step-by-step state rewriting where a clearer declarative mapping or reduction would be easier to follow.

## Warning

- A file is still acceptable now, but it is growing into a hotspot.
- A helper is small but named too generally.
- A function is 5 lines or fewer and may be a useless abstraction.
- Multiple docs explain closely related flows and may drift apart.
- A type file is still separate for a good reason now, but overlap is starting to grow.
- A file has several small wrappers that are still readable now, but they are starting to hide the real call flow.

## Good

- The file has one clear responsibility and the name matches that responsibility.
- Legacy conversion happens immediately at the boundary and the rest of the feature uses normalized types only.
- Small functions give reusable guards, conversions, or UI events a clear name.
- The code prefers declarative and functional programming style when that makes the flow clearer.
- Similar files are intentionally separate because they belong to different layers.
- Tests stay separate from production code and focus on one unit or workflow.

## How To Audit

1. Read the real code, not just the file name.
2. Read nearby types when the boundary is unclear.
3. Read call sites when the responsibility is unclear.
4. Prefer saying exactly what comes in and what comes out.
5. Check whether another file already does similar work.
6. Mark large or mixed-responsibility files with `Needs edit: Yes`.
7. Mark borderline files or functions with `Needs edit: Warning`.
8. Mark focused code with `Needs edit: No`.

## Naming Rule

Names should say:

- What is being parsed, mapped, loaded, normalized, saved, or rendered.
- Whether the code is UI, fetch, persistence, time logic, legacy adaptation, or chart option building.
- Whether it works on one item, one panel, one board, or a whole workflow.

If the name hides the job, say so directly in the audit.

## Combine Rule

When two files look similar, do not assume they should merge.

Write one of these clearly:

- `Keep separate` when the files belong to different layers or the combined file would become less clear.
- `Review for merge` when the split looks accidental or duplicated.

## Concise Standard

- Keep each description to one line.
- Be explicit.
- Prefer concrete language over abstract language.
- If something is bad, say exactly what is bad.

