import { TimeUnit } from '../../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import {
    createNewPanelInfo,
    type PanelInfo,
} from '../panelModel';
import type { SeriesRowsQuery } from '../../api/seriesDataApi';
import {
    buildPanelSeriesQuery,
    createSeriesRowsQueryKeys,
    resolvePanelSeriesRequest,
} from './panelSeriesRequest';

const TIME_SERIES: PanelSeriesDefinition = {
    key: 'temperature',
    table: 'TAG',
    sourceTagName: 'TEMPERATURE',
    alias: 'Temperature',
    calculationMode: PanelSeriesCalculationMode.Average,
    color: undefined,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};

function createPanelConfig(
    series: PanelSeriesDefinition = TIME_SERIES,
): Pick<PanelInfo, 'query' | 'mode' | 'display'> {
    const { query, mode, display } = createNewPanelInfo(
        [series],
        'Request test',
        'Line',
    );
    return { query, mode, display };
}

describe('buildPanelSeriesQuery', () => {
    it('honors a configured interval unit from a legacy panel', () => {
        const panelInfo = createPanelConfig();
        panelInfo.query.intervalType = TimeUnit.Second;

        const query = buildPanelSeriesQuery(
            'main',
            panelInfo,
            { start: 0, end: 3_600_000 },
            300,
            {},
        );

        expect(query.kind).toBe('calculated');
        if (query.kind !== 'calculated') return;
        expect(query.interval).toEqual({
            IntervalType: TimeUnit.Second,
            IntervalValue: 60,
        });
        expect(query.rowLimit).toBe(100);
    });

    it('derives a numeric bucket from the width-based row limit', () => {
        const numericSeries: PanelSeriesDefinition = {
            ...TIME_SERIES,
            sourceColumns: {
                ...TIME_SERIES.sourceColumns,
                timeBaseTime: true,
                timeType: 4,
            },
        };

        const query = buildPanelSeriesQuery(
            'main',
            createPanelConfig(numericSeries),
            { start: 0, end: 1_000 },
            300,
            {},
        );

        expect(query.kind).toBe('calculated');
        if (query.kind !== 'calculated') return;
        expect(query.rowLimit).toBe(100);
        expect(query.numericBucketWidth).toBe(10);
    });

    it('expands calculated main data without changing its visible resolution', () => {
        const numericSeries: PanelSeriesDefinition = {
            ...TIME_SERIES,
            sourceColumns: {
                ...TIME_SERIES.sourceColumns,
                timeBaseTime: true,
                timeType: 4,
            },
        };

        const query = resolvePanelSeriesRequest({
            target: 'main',
            panelInfo: createPanelConfig(numericSeries),
            rangeState: {
                range: {
                    mainRange: { start: 0, end: 1_000 },
                    navigatorRange: { start: -1_000, end: 2_000 },
                },
                fullRange: { start: -1_000, end: 2_000 },
                navigatorRangeInput: { start: '-1000', end: '2000' },
            },
            visibleRange: { start: 0, end: 1_000 },
            chartWidth: 300,
            rollupTables: {},
            refreshVersion: 0,
        }).fetchQuery;

        expect(query).toMatchObject({
            kind: 'calculated',
            range: { start: -1_000, end: 2_000 },
            rowLimit: 10_000,
            numericBucketWidth: 10,
        });
    });

    it('keeps a larger configured visible row budget during main prefetch', () => {
        const panelInfo = createPanelConfig();
        panelInfo.display.pixelsPerTick.calculated = 0.01;

        const request = resolvePanelSeriesRequest({
            target: 'main',
            panelInfo,
            rangeState: {
                range: {
                    mainRange: { start: 0, end: 1_000 },
                    navigatorRange: { start: 0, end: 10_000 },
                },
                fullRange: { start: 0, end: 10_000 },
                navigatorRangeInput: { start: '0', end: '10000' },
            },
            visibleRange: { start: 0, end: 1_000 },
            chartWidth: 300,
            rollupTables: {},
            refreshVersion: 0,
        });

        expect(request.fetchQuery).toMatchObject({
            kind: 'calculated',
            rowLimit: 30_000,
        });
    });

    it('aligns numeric bucket origins across nearby navigator requests', () => {
        const numericSeries: PanelSeriesDefinition = {
            ...TIME_SERIES,
            sourceColumns: {
                ...TIME_SERIES.sourceColumns,
                timeBaseTime: true,
                timeType: 4,
            },
        };
        const panelInfo = createPanelConfig(numericSeries);
        const createRequest = (start: number) =>
            resolvePanelSeriesRequest({
                target: 'navigator',
                panelInfo,
                rangeState: {
                    range: {
                        mainRange: { start, end: start + 1_000 },
                        navigatorRange: { start, end: start + 1_000 },
                    },
                    fullRange: { start: -5_000, end: 5_000 },
                    navigatorRangeInput: {
                        start: String(start),
                        end: String(start + 1_000),
                    },
                },
                visibleRange: { start, end: start + 1_000 },
                chartWidth: 300,
                rollupTables: {},
                refreshVersion: 0,
            }).fetchQuery;

        const first = createRequest(0);
        const shifted = createRequest(1);
        expect(first.kind).toBe('calculated');
        expect(shifted.kind).toBe('calculated');
        if (first.kind !== 'calculated' || shifted.kind !== 'calculated') {
            return;
        }
        expect(first.numericBucketWidth).toBe(shifted.numericBucketWidth);
        expect(first.range.start).toBe(shifted.range.start);
    });

    it('uses the sampling setting for the requested chart target', () => {
        const panelInfo = createPanelConfig({
            ...TIME_SERIES,
            calculationMode: PanelSeriesCalculationMode.Maximum,
        });
        panelInfo.mode.isRaw = true;
        panelInfo.display.rawNavigatorSampling = {
            enabled: true,
            sampleCount: 0.05,
        };

        const mainQuery = buildPanelSeriesQuery(
            'main',
            panelInfo,
            { start: 0, end: 100 },
            300,
            {},
        );
        const navigatorQuery = buildPanelSeriesQuery(
            'navigator',
            panelInfo,
            { start: 0, end: 100 },
            300,
            {},
        );

        expect(mainQuery.kind).toBe('raw');
        expect(navigatorQuery.kind).toBe('sampled-raw');
        expect(mainQuery.seriesList[0].calculationMode).toBe(
            PanelSeriesCalculationMode.Maximum,
        );
        if (navigatorQuery.kind === 'sampled-raw') {
            expect(navigatorQuery.sampleCount).toBe(0.05);
            expect(navigatorQuery.seriesList[0].calculationMode).toBe(
                PanelSeriesCalculationMode.Maximum,
            );
        }
    });

    it('calculates the navigator when raw navigator sampling is disabled', () => {
        const panelInfo = createPanelConfig({
            ...TIME_SERIES,
            calculationMode: PanelSeriesCalculationMode.Maximum,
        });
        panelInfo.mode.isRaw = true;
        panelInfo.display.rawNavigatorSampling.enabled = false;
        panelInfo.display.pixelsPerTick.calculated = 3;
        panelInfo.display.pixelsPerTick.calculatedNavigator = 6;

        const query = buildPanelSeriesQuery(
            'navigator',
            panelInfo,
            { start: 0, end: 3_600_000 },
            300,
            {},
        );

        expect(query.kind).toBe('calculated');
        if (query.kind === 'calculated') {
            expect(query.rowLimit).toBe(50);
            expect(query.seriesList[0].calculationMode).toBe(
                PanelSeriesCalculationMode.Average,
            );
        }
    });

    it('rejects invalid request geometry before building API arguments', () => {
        const panelInfo = createPanelConfig();

        expect(() =>
            buildPanelSeriesQuery(
                'main',
                panelInfo,
                { start: 10, end: 10 },
                300,
                {},
            ),
        ).toThrow('valid range');
        expect(() =>
            buildPanelSeriesQuery(
                'main',
                panelInfo,
                { start: 0, end: 10 },
                0,
                {},
            ),
        ).toThrow('positive chart width');
    });
});

describe('createSeriesRowsQueryKeys', () => {
    function createCalculatedQuery(): Extract<
        SeriesRowsQuery,
        { kind: 'calculated' }
    > {
        const query = buildPanelSeriesQuery(
            'main',
            createPanelConfig(),
            { start: 0, end: 3_600_000 },
            300,
            {},
        );
        if (query.kind !== 'calculated') {
            throw new Error('Expected a calculated test query.');
        }
        return query;
    }

    it('ignores presentation-only series fields', () => {
        const query = createCalculatedQuery();
        const presentationChange: typeof query = {
            ...query,
            seriesList: query.seriesList.map((series) => ({
                ...series,
                alias: 'Different label',
                color: '#ff0000',
                useSecondaryAxis: !series.useSecondaryAxis,
                id: 'different-id',
            })),
        };

        expect(createSeriesRowsQueryKeys(presentationChange)).toEqual(
            createSeriesRowsQueryKeys(query),
        );
    });

    it('includes SQL-affecting series and family options', () => {
        const query = createCalculatedQuery();
        const tableChange: typeof query = {
            ...query,
            seriesList: query.seriesList.map((series) => ({
                ...series,
                table: `${series.table}_OTHER`,
            })),
        };
        const calculationChange: typeof query = {
            ...query,
            seriesList: query.seriesList.map((series) => ({
                ...series,
                calculationMode: PanelSeriesCalculationMode.Maximum,
            })),
        };
        const rollupChange: typeof query = {
            ...query,
            rollupTables: {
                SYS: {
                    TAG: {
                        VALUE: [
                            { intervalMs: 60_000, supportsFirstLast: true },
                        ],
                    },
                },
            },
        };
        const originalFamily = createSeriesRowsQueryKeys(query).familyKey;

        expect(createSeriesRowsQueryKeys(tableChange).familyKey).not.toBe(
            originalFamily,
        );
        expect(createSeriesRowsQueryKeys(calculationChange).familyKey).not.toBe(
            originalFamily,
        );
        expect(createSeriesRowsQueryKeys(rollupChange).familyKey).not.toBe(
            originalFamily,
        );
    });

    it('adds range and calculated resolution only to the exact key', () => {
        const query = createCalculatedQuery();
        const rangeChange: typeof query = {
            ...query,
            range: { start: 1, end: 3_600_001 },
        };
        const resolutionChange: typeof query = {
            ...query,
            interval: { IntervalType: TimeUnit.Minute, IntervalValue: 2 },
            rowLimit: query.rowLimit + 1,
            numericBucketWidth: 5,
        };
        const originalKeys = createSeriesRowsQueryKeys(query);

        for (const changedQuery of [rangeChange, resolutionChange]) {
            const changedKeys = createSeriesRowsQueryKeys(changedQuery);
            expect(changedKeys.familyKey).toBe(originalKeys.familyKey);
            expect(changedKeys.exactKey).not.toBe(originalKeys.exactKey);
        }
    });
});
