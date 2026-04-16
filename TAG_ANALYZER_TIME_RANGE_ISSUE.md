# Tag Analyzer Time Range Issue

## What went wrong

The error was happening because Tag Analyzer sometimes tried to fetch data **before it had a real time range**.

Instead of sending a normal time range like:

- start time = `1710000000000`
- end time = `1710003600000`

it sometimes sent values like:

- start time = `0`
- end time = `0`

Those values were passed down into the Machbase query builder in `machiot.ts`.

That eventually produced a query that looked conceptually like this:

```sql
WHERE TIME BETWEEN 0 AND 0
```

The problem is:

- `TIME` is a `DATETIME` column
- `0` is just an integer

So Machbase complained:

```text
Type conversion error: error occurred while comparing the values of type (DATETIME) and type (INT32)
```

## Why it happened

There were two main paths where this could happen:

1. The normal Tag Analyzer panel fetch path
2. The panel editor preview path

In both cases, the app could end up with an unresolved or placeholder range, and that bad range was still allowed to continue into the fetch layer.

## The simple version

The bug was not really "Machbase is broken".

The bug was:

> We were asking Machbase to compare a real datetime column with invalid placeholder numbers.

## What I changed

I patched the Tag Analyzer layer so that:

1. If the time range is not valid yet, it does **not** call the repository fetch
2. The editor preview now falls back to the current navigator range instead of making a fake `0 ~ 0` range

So now, if the range is unresolved, the app returns an empty result instead of sending a broken query to Machbase.

## Where the problem was in the code

- Main fetch guard: `src/components/tagAnalyzer/utils/TagAnalyzerFetchUtils.ts`
- Editor preview fallback: `src/components/tagAnalyzer/editor/PanelEditorUtil.ts`
- Low-level query builder that was receiving the bad values: `src/api/repository/machiot.ts`

## What this means in practice

Before:

- unresolved range could become `0 ~ 0`
- `0 ~ 0` was sent to `machiot.ts`
- Machbase received an invalid time comparison
- logs showed `DATETIME` vs `INT32`

After:

- unresolved range is stopped earlier
- no invalid query is sent
- Tag Analyzer returns empty data until a real time range exists

## Questions For You

Please answer these so I can decide whether we should tighten the behavior more:

1. When Tag Analyzer does not have a valid time range yet, do you want it to:
   - show empty data silently
   - show a warning message in the UI
   - auto-fall back to a default recent range

2. Do you ever intentionally need to query from the Unix epoch or near `0` time?
   - Right now I am treating `0` as "unresolved placeholder", not as a real timestamp.

3. Should the editor preview be stricter?
   - For example, if the time input is mixed or invalid, should we show a validation message instead of quietly falling back to the navigator range?

4. Do you want me to patch the lower-level `machiot.ts` query builder too as a second safety net?
   - The current fix blocks bad values before they get there, but we can also harden the repository layer.

5. If a range is invalid, what should the UI say?
   - Example: `Please select a valid time range before loading data.`
