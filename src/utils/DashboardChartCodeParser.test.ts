import { DashboardChartCodeParser } from './DashboardChartCodeParser';

/**
 * Build a parsed-query stub matching what DashboardQueryParser produces.
 */
const makeQuery = (alias: string, idx: number, dataType: 'TIME_VALUE' | 'NAME_VALUE' = 'TIME_VALUE') => ({
    query: `SELECT * FROM TAG WHERE NAME = '${alias}'`,
    idx,
    alias,
    dataType,
    time: { start: '1000', end: '2000' },
});

/**
 * Resolved fetch response helper.
 */
const makeSuccess = (rows: any[]) => ({
    success: true,
    data: { columns: ['TIME', 'VALUE'], rows },
});
const makeFailure = (reason = 'syntax error') => ({
    success: false,
    reason,
});
const makeNameValue = (value: number | null) => ({
    success: true,
    data: { columns: ['NAME', 'VALUE'], rows: value === null ? [[{ value: null }]] : [[{ value }]] },
});

/**
 * Run the generated TQL chart-code string inside a sandbox that mimics LineChart's runtime:
 *   - _chart / _chartOption are injected
 *   - sQuery.forEach kicks off fetch calls
 *
 * Returns the captured chartOption plus helpers to flush microtasks.
 */
const runGeneratedCode = async (generated: string, fetchImpl: jest.Mock, opts?: { seriesLen?: number }) => {
    const seriesLen = opts?.seriesLen ?? 2;
    const chartOption: any = {
        series: Array.from({ length: seriesLen }, () => ({ data: [], name: '', label: { formatter: null }, detail: { formatter: null } })),
        graphic: undefined,
    };
    const chart = {
        setOption: jest.fn((next: any) => {
            if (next?.series) chartOption.series = next.series;
            if (Object.prototype.hasOwnProperty.call(next ?? {}, 'graphic')) chartOption.graphic = next.graphic;
        }),
        getWidth: () => 600,
        getModel: () => ({
            getComponent: () => ({
                coordinateSystem: { getRect: () => ({ x: 0, y: 0, width: 600, height: 400 }) },
            }),
        }),
        convertToPixel: () => [0, 0],
    };

    // Save originals
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = fetchImpl;

    // The generated string is a bare block `{ let sQuery=...; ...; sQuery.forEach((aData, idx) => getData(...)) }`.
    // Wrap it in a function so we can inject _chart and _chartOption via the closure of a `new Function`.
    const runner = new Function('_chart', '_chartOption', 'aIdx', generated);
    // aIdx isn't set at the top level by the generator (it's set inside the forEach callback as `idx`),
    // but the generated body still references `aIdx` via the .then handler — the forEach exposes it.
    // We pass aIdx=0 only for any stray top-level access (defensive).
    runner(chart, chartOption, 0);

    // Drain microtasks: fetch().then().then() chains require multiple Promise.resolve flushes.
    for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }

    (globalThis as any).fetch = origFetch;

    return { chartOption, chart };
};

/**
 * Build a fetch mock keyed by alias substring. Async resolution emulates real network race.
 */
const fetchByAlias = (responses: Record<string, any>, delays: Record<string, number> = {}) =>
    jest.fn((_url: string, opts: any) => {
        const body: string = opts?.body ?? '';
        const matchedAlias = Object.keys(responses).find((alias) => body.includes(alias));
        const response = matchedAlias ? responses[matchedAlias] : { success: true, data: { columns: [], rows: [] } };
        const delay = matchedAlias ? delays[matchedAlias] ?? 0 : 0;
        // Use microtask-based delay so we can drain via Promise.resolve flush.
        // A "delay" of N means N additional Promise.resolve hops before resolving.
        let promise: Promise<any> = Promise.resolve({ json: () => Promise.resolve(response) });
        for (let i = 0; i < delay; i += 1) {
            promise = promise.then((v) => v);
        }
        return promise;
    });

describe('DashboardChartCodeParser — static substring assertions', () => {
    test('preamble declares sEmptyFlags and sEmptyCount', () => {
        const code = DashboardChartCodeParser({}, 'line', [makeQuery('SENSOR_A', 0)], '1.0.1', false, 'panel-1', []);
        expect(code).toContain('let sEmptyFlags = [];');
        expect(code).toContain('let sEmptyCount = 0;');
    });

    test('NO_DATA_FINAL helper body is inlined in TimeValueFunc', () => {
        const code = DashboardChartCodeParser({}, 'line', [makeQuery('SENSOR_A', 0)], '1.0.1', false, 'panel-1', []);
        expect(code).toContain('No data available');
        expect(code).toContain('sCount >= sQuery.length && sEmptyCount >= sQuery.length');
    });

    test('NameValueFunc inlines NO_DATA_FINAL + sCount increment', () => {
        const code = DashboardChartCodeParser({ unit: '', digit: 0 }, 'pie', [makeQuery('NAME_A', 0, 'NAME_VALUE')], '1.0.1', false, 'panel-1');
        expect(code).toContain('No data available');
        expect(code).toContain('sCount += 1');
        expect(code).toContain('sEmptyFlags');
    });

    test('LiquidNameValueFunc inlines NO_DATA_FINAL + sCount increment', () => {
        const code = DashboardChartCodeParser({ unit: '', digit: 0, minData: 0, maxData: 100 }, 'liquidFill', [makeQuery('LIQ_A', 0, 'NAME_VALUE')], '1.0.1', false, 'panel-1');
        expect(code).toContain('No data available');
        expect(code).toContain('sCount += 1');
        expect(code).toContain('sEmptyFlags');
    });

    test('TimeValueFunc non-threshold branch contains sCount += 1', () => {
        const code = DashboardChartCodeParser({}, 'line', [makeQuery('A', 0)], '1.0.1', false, 'panel-x', []);
        // The TimeValueFunc body should have sCount += 1 outside any threshold-only branch.
        // We count occurrences: the SYNTAX_ERR err-branch and the success path both increment.
        const matches = code.match(/sCount \+= 1/g) ?? [];
        expect(matches.length).toBeGreaterThanOrEqual(2); // success-path + SYNTAX_ERR + .catch
    });

    test('generated code never emits window.postMessage (badge UX removed)', () => {
        const code = DashboardChartCodeParser({}, 'line', [makeQuery('A', 0)], '1.0.1', false, 'panel-x', []);
        expect(code).not.toContain('window.postMessage');
    });

    test('SYNTAX_ERR branch + .catch path both increment sCount', () => {
        const code = DashboardChartCodeParser({}, 'line', [makeQuery('A', 0)], '1.0.1', false, 'panel-x', []);
        // SYNTAX_ERR err-branch: `_chartOption.series[aIdx].data = [];\n\tsCount += 1;`
        expect(code).toMatch(/_chartOption\.series\[aIdx\]\.data = \[\];[\s\S]*?sCount \+= 1/);
        // .catch path: `.catch((err) => { sCount += 1;`
        expect(code).toContain('.catch((err) => { sCount += 1;');
    });
});

describe('DashboardChartCodeParser — public-dashboard mirror lacks NO_DATA', () => {
    test('mirror does not export NO_DATA aggregation (intentional asymmetry)', async () => {
        // Use require to inspect the mirror module's source-emitted code: call it with the same args
        // and check that the mirror string does not contain NO_DATA-final sentinels.
        // The mirror has a different TimeValueFunc signature so we just sanity check the export exists.
        const mirror = require('../public-dashboard/utils/DashboardChartCodeParser');
        expect(typeof mirror.DashboardChartCodeParser).toBe('function');
        // The mirror's TimeValueFunc accepts only (aYAxisOptions) — passing extra args is harmless.
        const code = mirror.DashboardChartCodeParser({}, 'line', [makeQuery('A', 0)], '1.0.1', false, 'panel-x', []);
        expect(code).not.toContain('sEmptyFlags');
        expect(code).not.toContain('No data available');
    });
});

describe('DashboardChartCodeParser — runtime sandbox evaluation', () => {
    test('TimeValue mixed empty/non-empty does not render No-data overlay', async () => {
        const queries = [makeQuery('SENSOR_A', 0), makeQuery('SENSOR_B', 1)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-mix', []);
        const fetchMock = fetchByAlias({
            SENSOR_A: makeSuccess([[1, 10]]),
            SENSOR_B: makeSuccess([]), // empty
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 2 });
        // Mixed case: graphic should be cleared (empty array), not show 'No data available'
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).not.toContain('No data available');
    });

    test('TimeValue all-empty renders No-data overlay', async () => {
        const queries = [makeQuery('SENSOR_A', 0), makeQuery('SENSOR_B', 1)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-all-empty', []);
        const fetchMock = fetchByAlias({
            SENSOR_A: makeSuccess([]),
            SENSOR_B: makeSuccess([]),
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 2 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).toContain('No data available');
    });

    test('single-series TimeValue empty regression: still shows overlay', async () => {
        const queries = [makeQuery('SOLO_A', 0)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-solo', []);
        const fetchMock = fetchByAlias({
            SOLO_A: makeSuccess([]),
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 1 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).toContain('No data available');
    });

    test('async race: empty-first then non-empty — same final state (no overlay)', async () => {
        const queries = [makeQuery('ALPHA', 0), makeQuery('BETA', 1)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-race-1', []);
        const fetchMock = fetchByAlias(
            {
                ALPHA: makeSuccess([]), // empty resolves first
                BETA: makeSuccess([[1, 5]]),
            },
            { ALPHA: 0, BETA: 5 }
        );
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 2 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).not.toContain('No data available');
    });

    test('async race: non-empty-first then empty — same final state (no overlay)', async () => {
        const queries = [makeQuery('ALPHA', 0), makeQuery('BETA', 1)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-race-2', []);
        const fetchMock = fetchByAlias(
            {
                ALPHA: makeSuccess([[1, 5]]),
                BETA: makeSuccess([]),
            },
            { ALPHA: 0, BETA: 5 }
        );
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 2 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).not.toContain('No data available');
    });

    test('error response triggers SYNTAX_ERR path (sErr populated, no No-data overlay because sCount progresses)', async () => {
        const queries = [makeQuery('ERRQ', 0)];
        const code = DashboardChartCodeParser({}, 'line', queries, '1.0.1', false, 'panel-err', []);
        const fetchMock = fetchByAlias({
            ERRQ: makeFailure('boom'),
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 1 });
        // SYNTAX_ERR sets _chartOption.graphic to a text element with the error message
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).toContain('boom');
        // Should NOT show No-data overlay (the SYNTAX_ERR path returns early before NO_DATA_FINAL runs)
        expect(graphicText).not.toContain('No data available');
    });

    test('NameValue (pie): all empty renders No-data overlay', async () => {
        const queries = [makeQuery('PIE_A', 0, 'NAME_VALUE'), makeQuery('PIE_B', 1, 'NAME_VALUE')];
        const code = DashboardChartCodeParser({ unit: '', digit: 0 }, 'pie', queries, '1.0.1', false, 'panel-pie', []);
        const fetchMock = fetchByAlias({
            PIE_A: makeNameValue(null),
            PIE_B: makeNameValue(null),
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 1 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).toContain('No data available');
    });

    test('LiquidFill single empty series renders No-data overlay', async () => {
        const queries = [makeQuery('LIQ_A', 0, 'NAME_VALUE')];
        const code = DashboardChartCodeParser({ unit: '', digit: 0, minData: 0, maxData: 100 }, 'liquidFill', queries, '1.0.1', false, 'panel-liq', []);
        const fetchMock = fetchByAlias({
            LIQ_A: makeNameValue(null),
        });
        const { chartOption } = await runGeneratedCode(code, fetchMock, { seriesLen: 1 });
        const graphicText = JSON.stringify(chartOption.graphic ?? '');
        expect(graphicText).toContain('No data available');
    });
});
