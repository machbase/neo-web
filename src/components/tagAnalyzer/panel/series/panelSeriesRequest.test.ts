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
    it('converts the automatic duration into the configured interval unit', () => {
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

    it('uses the sampling setting for the requested chart target', () => {
        const panelInfo = createPanelConfig();
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
        if (navigatorQuery.kind === 'sampled-raw') {
            expect(navigatorQuery.sampleCount).toBe(0.05);
        }
    });

    it('calculates the navigator when raw navigator sampling is disabled', () => {
        const panelInfo = createPanelConfig();
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
