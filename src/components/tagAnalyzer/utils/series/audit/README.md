# Series Folder Audit

This folder audits `src/components/tagAnalyzer/utils/series`.

## Scope

- Production files audited: `SeriesLabelFormatter.ts`, `SeriesPointConverters.ts`, `SeriesSummaryUtils.ts`, `TagSelectionChartSetup.ts`, `seriesTypes.ts`
- Test files audited: `SeriesLabelFormatter.test.ts`, `SeriesSummaryUtils.test.ts`, `TagSelectionChartSetup.test.ts`
- Audit focus: file responsibility, reusable function role, and current test coverage role

## File Index

- `SeriesLabelFormatter.audit.md`
- `SeriesPointConverters.audit.md`
- `SeriesSummaryUtils.audit.md`
- `TagSelectionChartSetup.audit.md`
- `seriesTypes.audit.md`
- `SeriesLabelFormatter.test.audit.md`
- `SeriesSummaryUtils.test.audit.md`
- `TagSelectionChartSetup.test.audit.md`

## Structural Notes

- `SeriesLabelFormatter.ts` is the label-policy hub. The thin wrapper functions all delegate to one formatter so label rules stay synchronized.
- `SeriesPointConverters.ts` is the shape-normalization hub. Other files do not need to care whether points arrive as `[x, y]` tuples or `{ x, y }` objects.
- `SeriesSummaryUtils.ts` depends on `aSeriesList` and `aTagSet` being aligned by array index. That pairing rule is important to preserve in callers.
- `SeriesPointConverters.ts` does not currently have a dedicated test file in this folder.
- `seriesTypes.ts` contains no executable functions. Its role is to define the shared contracts that the other files consume.

