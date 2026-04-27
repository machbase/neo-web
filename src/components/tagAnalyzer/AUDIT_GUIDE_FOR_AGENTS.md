# Tag Analyzer Audit Manual

Use this manual when auditing anything under [src/components/tagAnalyzer](/C:/_github_repos/neo-web/src/components/tagAnalyzer).

## Goal

- Make one [FOLDER_AUDIT.md](/C:/_github_repos/neo-web/src/components/tagAnalyzer/FOLDER_AUDIT.md)-style audit per folder.
- Audit every direct file in that folder.
- Audit every named function in each code file.
- Use explicit descriptions, not vague summaries.
- Judge structure by responsibilities removed, not helpers added.
- Exclude the generated `FOLDER_AUDIT.md` file from auditing itself to avoid recursive self-audits.
- Do not include test files or markdown files in the audit.
- Do not include TAZ files in the audit.

## Required Audit Sequence

Follow these steps in order for each target folder:

1. Delete the existing generated `FOLDER_AUDIT.md` in the target folder before writing the new audit.
2. List every direct auditable file in the target folder after cleanup.
3. Read every direct auditable file before writing file responsibility notes.
4. Read every named function in every code file before writing function responsibility notes.
5. For every named function, record its name, description, params when useful, return type when useful, assessment, and final verdict.
6. If a function has multiple responsibilities, write each responsibility explicitly inside the responsibility assessment instead of combining them into one vague sentence.
7. For every file, record its line count, role, assessment, and functions in the required output order below.
8. If a file has multiple responsibilities, write each responsibility explicitly instead of combining them into one vague sentence.
9. Write the final audit back as `FOLDER_AUDIT.md` in that same folder.

In this manual, `every file` means every direct auditable file after applying the scope exclusions above.

## Required File Output

For each file, write fields in this order:

- File name as the section title.
- `Lines:`
- `Role:`
- `Assessment:`
  - `Name:`
  - `Responsibility:`
  - `Merge:`
- `Functions:`
  - `none.` when there are no named functions.

`Needs edit` is optional. Use it only when a short summary judgment helps. Do not treat it as a required field.

Do not write vague roles like `manages panel` or `handles fetch`.

Write roles like:

- `Loads panel and navigator datasets by resolving time range, interval, row count, and overflow state.`
- `Converts normalized PanelInfo to persisted TAZ panel versions and back again.`
- `Renders the editor section that changes axis flags, explicit ranges, thresholds, and Y2 assignments.`

When the file is a hotspot, say which responsibilities are mixed together. Use concrete words like:

- `UI rendering, panel range policy, backend fetch orchestration, and legacy conversion are mixed in one file.`
- `This refactor added helpers, but the same component still owns chart-type policy, state mutation rules, and persistence decisions.`

Do not include a `Path:` line for each file unless there is a special reason.

If a file has multiple responsibilities, list them explicitly in the file `Assessment: Responsibility` field. Do not compress them into a generic phrase like `chart logic` or `panel behavior`.

## Required Function Output

For each named function, write fields in this order:

- Function name as the subsection title.
- `Description:`
- `Params:`
- `Return type:`
- `Assessment:`
  - `Name:`
  - `Responsibility:`
  - `Merge:`
- `Final verdict:`

If a function has multiple responsibilities, list each responsibility explicitly inside the function `Assessment: Responsibility` field. Do not hide mixed behavior behind broad words like `handles`, `manages`, or `processes`.

Use this format:

- `FileName.ts`
  - Lines: `123`
  - Role: One explicit one-line role description.
  - Assessment:
    - Name: Whether the file name directly matches the real job.
    - Responsibility: Whether the file has a single responsibility or mixed responsibilities.
    - Merge: Whether it should stay separate or merge with a duplicate or overlap.
  - Functions:
    - `functionName`
      - Description: What the function does in plain language.
      - Params: The params when useful.
      - Return type: The return type when useful.
      - Assessment:
        - Name: Whether the function name directly matches the real job.
        - Responsibility: The exact decisions, data conversion, rendering, side effects, or orchestration the function owns.
        - Merge: Whether it should stay separate or be merged with a duplicate or overlap.
      - Final verdict: One concise reason.

If the function is 5 lines or fewer, always add a warning line that says one of these:

- It is a good abstraction because it names a reusable guard, conversion, or UI event clearly.
- It is a thin wrapper and should be kept only if the name makes call sites clearer.

## Function Responsibility Rule

- A single function should have a single responsibility.
- If a function needs more than one short sentence to explain what it does, mark it for change unless there is a really good boundary reason to keep it together.
- If a function mixes validation, branching policy, data conversion, side effects, or output formatting, list each responsibility explicitly and judge whether they should be separated.
- Prefer functions whose job can be described in one short sentence without words like `and then` repeated several times.

Use this language explicitly in audits:

- `Single responsibility` when the function has one clear job.
- `Mixed responsibilities` when the function owns more than one job.
- `Keep together for now` only when there is a concrete reason the combined logic is still the clearest boundary.
- `Name matches responsibility` when the function name directly matches the real job.
- `Name mismatch` when the function name is broader, narrower, or different from the real job.

## Responsibility Removal Rule

When you judge whether code improved, do not ask only:

- Did the file get shorter?
- Were helpers extracted?
- Did the function count go up?

Ask these instead:

- Does the file have fewer distinct jobs?
- Does the file have fewer reasons to change?
- Does the owner still know the same business rules after the extraction?

Use this language explicitly in audits:

- `Responsibility removed` when a file no longer owns one category of decisions.
- `Helper added only` when code moved into helpers but the original file still owns the same rules.

Examples:

- `Responsibility removed: the component no longer builds query text and now only renders controls and dispatches actions.`
- `Helper added only: the component split one branch into three helpers, but it still owns validation, fetch setup, and persistence decisions.`

## Very bad

- One file mixes unrelated layers such as UI rendering, persistence, fetch orchestration, and version conversion.
- Legacy pre-2.0.0 logic is mixed directly into modern runtime code instead of being converted at the boundary.
- A file saves, loads, parses, converts, and mutates global state all in one place.
- Names hide the real job of the code, especially names like `Utils`, `Helpers`, or `Data` when the file actually does several unrelated tasks.
- The same conversion or normalization rule appears in multiple files.
- A function quietly changes input data in place while its name reads like a pure mapper or selector.
- A refactor adds wrapper helpers, hooks, or service names, but the original owner still knows the same policy, branching, and side-effect rules.
- A file creates new helper layers without removing any reason for the original file to change.

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
- A type alias exists only to spell `Foo | undefined` and does not add domain meaning or clarify ownership.
- A file creates intermediate data shapes only to pass them once into the next function without improving clarity.
- A function mixes mapping logic with mutation or side effects instead of keeping the transformation pipeline explicit.
- A file uses imperative step-by-step state rewriting where a clearer declarative mapping or reduction would be easier to follow.
- A refactor increases file count, but the same file still owns the same decisions.
- A new helper extracts steps, but not ownership.

## Warning

- A file is still acceptable now, but it is growing into a hotspot.
- A helper is small but named too generally.
- A function is 5 lines or fewer and may be a useless abstraction.
- Multiple docs explain closely related flows and may drift apart.
- A type file is still separate for a good reason now, but overlap is starting to grow.
- A file has several small wrappers that are still readable now, but they are starting to hide the real call flow.
- A refactor removes some local duplication, but it is not yet clear that any real responsibility left the original owner.

## Good

- The file has one clear responsibility and the name matches that responsibility.
- Legacy conversion happens immediately at the boundary and the rest of the feature uses normalized types only.
- Small functions give reusable guards, conversions, or UI events a clear name.
- The code prefers declarative and functional programming style when that makes the flow clearer.
- Similar files are intentionally separate because they belong to different layers.
- Tests stay separate from production code and focus on one unit or workflow.
- A refactor removes a whole category of knowledge from a file, such as fetch setup, persistence rules, chart policy, or legacy adaptation.
- After extraction, the original owner has fewer reasons to change.

## How To Audit

1. Read the real code, not just the file name.
2. Read nearby types when the boundary is unclear.
3. Read call sites when the responsibility is unclear.
4. Prefer saying exactly what comes in and what comes out.
5. Check whether another file already does similar work.
6. Count the distinct responsibilities in the file before deciding whether helper extraction actually helped.
7. Mark large or mixed-responsibility files clearly in the final verdict or optional `Needs edit` line.
8. Mark borderline files or functions clearly in the final verdict or optional `Needs edit` line.
9. Mark focused code clearly in the final verdict or optional `Needs edit` line.

## Naming Rule

Names should say:

- What is being parsed, mapped, loaded, normalized, saved, or rendered.
- Whether the code is UI, fetch, persistence, time logic, legacy adaptation, or chart option building.
- Whether it works on one item, one panel, one board, or a whole workflow.
- For functions, the name should be directly related to the responsibility the function owns.
- If the function name sounds narrower than the real implementation, call that mismatch out directly in the audit.
- If the function name hides policy, side effects, formatting, validation, or branching work, mark that as a naming problem.

If the name hides the job, say so directly in the audit.

## Extraction Rule

Do not praise an extraction by default.

Say it is good only when the extraction removes a responsibility from the original owner.

Say it is bad or warning-level when:

- the original file still knows the same business rules
- the extraction only renames branches
- the extraction adds navigation cost without creating a cleaner boundary

## Combine Rule

When two files look similar, do not assume they should merge.

Write one of these clearly:

- `Keep separate` when the files belong to different layers or the combined file would become less clear.
- `Review for merge` when the split looks accidental or duplicated.
- `Merge recommended` when duplicate ownership or duplicate logic should be combined.

Use `Merge assessment` in audits to say explicitly whether a duplicate or overlap should merge or stay separate.

## Concise Standard

- Keep each description to one line.
- Be explicit.
- Prefer concrete language over abstract language.
- If something is bad, say exactly what is bad.

