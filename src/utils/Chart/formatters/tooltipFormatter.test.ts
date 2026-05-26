import { generateTooltipAxisFunction } from './tooltipFormatter';
import { generateTooltipAxisFunction as generateTooltipAxisFunctionMirror } from '@/public-dashboard/utils/Chart/formatters/tooltipFormatter';
import { decodeFormatterFunction } from '@/utils/dashboardUtil';

type EnabledMeta = { idx: number; name: string; color: string; unit?: string };
type Param = {
    seriesIndex: number;
    seriesName?: string;
    name?: string | number;
    axisValueLabel?: string;
    data?: any[];
    value?: any;
    marker?: string;
};

// Convert a stringified function (returned by generateTooltipAxisFunction) into a callable function.
const compile = (aSource: string): ((params: Param[]) => string) => {
    // The source is a function expression like "function (params) { ... }".
    // Wrap it so `new Function` returns the function value.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return new Function(`return (${aSource});`)() as (params: Param[]) => string;
};

const buildParam = (aOverride: Partial<Param> & { seriesIndex: number; value: any }): Param => ({
    name: 1700000000000,
    axisValueLabel: 'x-axis',
    data: [1700000000000, aOverride.value],
    marker: '<span class="m"></span>',
    seriesName: `series-${aOverride.seriesIndex}`,
    ...aOverride,
});

describe('generateTooltipAxisFunction (axis trigger)', () => {
    describe('with enabledSeriesMeta (Phase 1 enabled-only branch)', () => {
        const sMeta: EnabledMeta[] = [
            { idx: 0, name: 'Tag-A', color: '#ff0000' },
            { idx: 2, name: 'Tag-C', color: '#00ff00' },
        ];

        test('renders rows in meta order, marking missing-data series as no data', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);

            // Only series idx=0 has data; idx=2 has no params.
            const sParams: Param[] = [buildParam({ seriesIndex: 0, value: 42 })];
            const sOutput = sFn(sParams);

            // Tag-A row shows value 42; Tag-C row shows "no data".
            const sIndexA = sOutput.indexOf('Tag-A');
            const sIndexC = sOutput.indexOf('Tag-C');
            expect(sIndexA).toBeGreaterThan(-1);
            expect(sIndexC).toBeGreaterThan(-1);
            expect(sIndexA).toBeLessThan(sIndexC); // meta-order preserved
            expect(sOutput).toContain('<b>42</b>');
            expect(sOutput.match(/no data/g)?.length).toBe(1);
        });

        test('collapses duplicate seriesIndex at same x and shows +N badge', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);

            const sParams: Param[] = [
                buildParam({ seriesIndex: 0, value: 10 }),
                buildParam({ seriesIndex: 0, value: 11 }),
                buildParam({ seriesIndex: 0, value: 12 }),
                buildParam({ seriesIndex: 2, value: 99 }),
            ];
            const sOutput = sFn(sParams);

            // First value is shown for seriesIndex=0, with +2 badge (3 entries total).
            expect(sOutput).toContain('<b>10</b>');
            expect(sOutput).toContain('+2');
            // No other badges should appear (Tag-C has only one value).
            expect(sOutput.match(/\+\d+/g)?.length).toBe(1);
        });

        test('disabled series (not in meta) are not rendered', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);

            const sParams: Param[] = [
                buildParam({ seriesIndex: 0, value: 1, seriesName: 'Tag-A' }),
                // seriesIndex 1 is NOT in meta — must be filtered out.
                buildParam({ seriesIndex: 1, value: 555, seriesName: 'Tag-B-disabled' }),
                buildParam({ seriesIndex: 2, value: 2, seriesName: 'Tag-C' }),
            ];
            const sOutput = sFn(sParams);

            expect(sOutput).not.toContain('Tag-B-disabled');
            expect(sOutput).not.toContain('555');
            expect(sOutput).toContain('Tag-A');
            expect(sOutput).toContain('Tag-C');
        });

        test('NaN/undefined/null values are rendered as no data, not literal NaN/undefined', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);

            const sParams: Param[] = [
                buildParam({ seriesIndex: 0, value: null }),
                buildParam({ seriesIndex: 2, value: undefined }),
            ];
            const sOutput = sFn(sParams);

            expect(sOutput).not.toMatch(/NaN/);
            expect(sOutput).not.toMatch(/>undefined</);
            expect(sOutput).not.toMatch(/>null</);
            // Both rows fall back to "no data".
            expect(sOutput.match(/no data/g)?.length).toBe(2);
        });

        test('value 0 is rendered as 0 (not no data)', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);

            const sParams: Param[] = [buildParam({ seriesIndex: 0, value: 0 })];
            const sOutput = sFn(sParams);

            expect(sOutput).toContain('<b>0</b>');
            // Tag-C still shows no data.
            expect(sOutput.match(/no data/g)?.length).toBe(1);
        });

        test('returns empty string when params is empty', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = compile(sSource);
            expect(sFn([])).toBe('');
        });
    });

    describe('without enabledSeriesMeta (backward-compat fallback branch)', () => {
        test('keeps legacy table rendering with no-data placeholder', () => {
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined);
            const sFn = compile(sSource);

            const sParams: Param[] = [
                buildParam({ seriesIndex: 0, value: 1 }),
                buildParam({ seriesIndex: 1, value: null }),
            ];
            const sOutput = sFn(sParams);

            // Legacy branch uses 'no-data' (with hyphen) text, present source string.
            expect(sOutput).toContain('<b>1</b>');
            expect(sOutput).toContain('no-data');
            // No +N badge logic in legacy branch.
            expect(sOutput).not.toMatch(/\+\d+/);
        });
    });

    describe('runtime pipeline (JSON.stringify → decodeFormatterFunction → eval)', () => {
        // Regression guard for the SyntaxError observed at 2026-05-11 13:27. The unit eval path
        // (compile()) does not exercise the double-encoding hop that `chartOption(${decodeFormatterFunction(JSON.stringify(opt))})`
        // performs at LineChart.tsx:344, so meta encoded as raw JSON.stringify(...) used to leave \" inside
        // object literals and crashed the chart runtime.
        const runThroughPipeline = (aSource: string): ((params: Param[]) => string) => {
            const sChartOption = { tooltip: { formatter: aSource } };
            const sJson = JSON.stringify(sChartOption);
            const sDecoded = decodeFormatterFunction(sJson);
            // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
            const sParsed = new Function(`return (${sDecoded});`)();
            return sParsed.tooltip.formatter as (params: Param[]) => string;
        };

        test('survives chartOption JSON.stringify + decodeFormatterFunction without SyntaxError (ASCII)', () => {
            const sMeta: EnabledMeta[] = [
                { idx: 0, name: 'TAG-02(avg)', color: '#367FEB' },
                { idx: 1, name: 'TAG-03(sum)', color: '#FF6B6B' },
            ];
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            // Must not throw "Invalid or unexpected token".
            const sFn = runThroughPipeline(sSource);
            const sOutput = sFn([buildParam({ seriesIndex: 0, value: 12.345 })]);
            expect(sOutput).toContain('TAG-02(avg)');
            expect(sOutput).toContain('TAG-03(sum)');
            expect(sOutput).toContain('no data');
        });

        test('survives the pipeline with non-ASCII (Korean) series names', () => {
            const sMeta: EnabledMeta[] = [
                { idx: 0, name: '온도(평균)', color: '#367FEB' },
                { idx: 1, name: '습도', color: '#00C896' },
            ];
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = runThroughPipeline(sSource);
            const sOutput = sFn([buildParam({ seriesIndex: 1, value: 55 })]);
            expect(sOutput).toContain('온도(평균)');
            expect(sOutput).toContain('습도');
            expect(sOutput).toContain('<b>55</b>');
        });

        test('survives the pipeline with quotes/backslashes in series names', () => {
            const sMeta: EnabledMeta[] = [
                { idx: 0, name: 'tag\'s "name"', color: '#fff' },
                { idx: 1, name: 'a\\b', color: '#000' },
            ];
            const sSource = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sFn = runThroughPipeline(sSource);
            const sOutput = sFn([buildParam({ seriesIndex: 0, value: 1 })]);
            expect(sOutput).toContain('tag\'s "name"');
            expect(sOutput).toContain('a\\b');
        });
    });

    describe('canonical = mirror equivalence', () => {
        test('canonical and public-dashboard mirror return identical stringified output for same input', () => {
            const sMeta: EnabledMeta[] = [
                { idx: 0, name: 'A', color: '#fff' },
                { idx: 1, name: 'B', color: '#000' },
            ];

            // Same args, both arities (with and without meta).
            const sCanonicalNoMeta = generateTooltipAxisFunction({}, 'TIME', undefined, undefined);
            const sMirrorNoMeta = generateTooltipAxisFunctionMirror({}, 'TIME', undefined, undefined);
            expect(sCanonicalNoMeta).toBe(sMirrorNoMeta);

            const sCanonicalWithMeta = generateTooltipAxisFunction({}, 'TIME', undefined, undefined, sMeta);
            const sMirrorWithMeta = generateTooltipAxisFunctionMirror({}, 'TIME', undefined, undefined, sMeta);
            expect(sCanonicalWithMeta).toBe(sMirrorWithMeta);

            const sFormatter = '(function(v){return v.toFixed(1);})';
            const sCanonicalWithFormatter = generateTooltipAxisFunction({}, 'TIME', sFormatter, undefined, sMeta);
            const sMirrorWithFormatter = generateTooltipAxisFunctionMirror({}, 'TIME', sFormatter, undefined, sMeta);
            expect(sCanonicalWithFormatter).toBe(sMirrorWithFormatter);
        });
    });
});
