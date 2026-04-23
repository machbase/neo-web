# Coding Style Preference

- Prefer explicit function boundaries over hidden parameter shapes.
- For one-off object parameters, prefer an inline anonymous object type at the function signature instead of exporting a separate `Params` type.
- Only create a named parameter type when it is reused, carries real domain meaning, or meaningfully improves readability.
- Avoid alias types that only rename another type without adding domain meaning.
- Prefer passing only the data a function needs instead of passing a larger object and reading one field from it.

Example:

```ts
function buildSeries({
    mainSeries,
    navigatorSeries,
}: {
    mainSeries: SeriesOption[];
    navigatorSeries: SeriesOption[];
}) {
    return {
        series: [...mainSeries, ...navigatorSeries],
    };
}
```
