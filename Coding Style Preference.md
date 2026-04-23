# Coding Style Preference

- Prefer explicit function boundaries over hidden parameter shapes.
- Prefer separate function parameters with each type written next to its parameter.
- Avoid single object parameters unless the function is a TSX component/JSX renderer, the input is already a real domain struct such as `TimeRangeMs`, or the object shape is genuinely the simplest readable input.
- If a single object parameter is necessary for a one-off helper, prefer an inline anonymous object type at the function signature instead of exporting a separate `Params` type.
- Only create a named parameter type when it is reused, carries real domain meaning, or meaningfully improves readability.
- Avoid alias types that only rename another type without adding domain meaning.
- Prefer passing only the data a function needs instead of passing a larger object and reading one field from it.

Example:

```ts
function buildSeries(
    aMainSeries: SeriesOption[],
    aNavigatorSeries: SeriesOption[],
) {
    return {
        series: [...aMainSeries, ...aNavigatorSeries],
    };
}
```
