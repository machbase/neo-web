import {
    createPanelSeriesDefinition,
    formatRollupIntervalList,
    formatRollupRangeLabel,
    getPanelSeriesRollupInfo,
    getPanelSeriesValueSummaryLabel,
} from './CreateNewPanelSeries';

describe('createPanelSeriesDefinition', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('uses rollup table when rollup metadata matches', () => {
        const series = createPanelSeriesDefinition({
            key: 'series-1',
            table: 'sys.EXAMPLE',
            tagName: 'MYTAG',
            calculationMode: 'avg',
            columns: {
                name: 'NAME',
                time: 'ODOMETER',
                value: 'VALUE',
                timeType: 20,
                timeBaseTime: true,
            },
            rollupMetadata: {
                SYS: {
                    'MACHBASEDB.EXAMPLE': {
                        VALUE: [1000],
                        EXT_TYPE: [0],
                    },
                },
            },
        });

        expect(series.useRollupTable).toBe(true);
        expect(series.alias).toBe('MYTAG / VALUE (sys.EXAMPLE)');
    });

    test('uses rollup table for non-basetime columns when rollup metadata matches', () => {
        const series = createPanelSeriesDefinition({
            key: 'series-1',
            table: 'sys.EXAMPLE',
            tagName: 'MYTAG',
            calculationMode: 'avg',
            columns: {
                name: 'NAME',
                time: 'ODOMETER',
                value: 'VALUE',
                timeType: 20,
                timeBaseTime: false,
            },
            rollupMetadata: {
                SYS: {
                    'MACHBASEDB.EXAMPLE': {
                        VALUE: [1000],
                        EXT_TYPE: [0],
                    },
                },
            },
        });

        expect(series.useRollupTable).toBe(true);
    });

    test('does not use rollup table when rollup metadata is missing', () => {
        const series = createPanelSeriesDefinition({
            key: 'series-1',
            table: 'sys.EXAMPLE',
            tagName: 'MYTAG',
            calculationMode: 'avg',
            columns: {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
                timeType: 6,
                timeBaseTime: true,
            },
            rollupMetadata: {
                SYS: {
                    'MACHBASEDB.EXAMPLE': {
                        OTHER_VALUE: [1000],
                        EXT_TYPE: [0],
                    },
                },
            },
        });

        expect(series.useRollupTable).toBe(false);
    });

    test('reports current-format rollup intervals for the create chart value hint', () => {
        const rollupMetadata = {
            SYS: {
                'MACHBASEDB.STOCK_TICK': {
                    VALUE: ['1000'],
                    EXT_TYPE: ['0'],
                },
            },
        };

        expect(
            getPanelSeriesValueSummaryLabel(
                rollupMetadata,
                'SYS.STOCK_TICK',
                'VALUE',
            ),
        ).toBe('Has Rollup');
        expect(
            getPanelSeriesRollupInfo(
                rollupMetadata,
                'SYS.STOCK_TICK',
                'VALUE',
            ),
        ).toEqual({
            columnName: 'VALUE',
            intervals: [1000],
            minimumInterval: 1000,
            maximumInterval: 1000,
        });
        expect(formatRollupIntervalList([1000, 60000])).toBe('1s, 1min');
    });

    test('formats minimum and maximum rollup range', () => {
        const rollupInfo = getPanelSeriesRollupInfo(
            {
                SYS: {
                    'MACHBASEDB.STOCK_TICK': {
                        VALUE: ['31536000000', '1000', '60000'],
                        EXT_TYPE: ['0', '0', '0'],
                    },
                },
            },
            'SYS.STOCK_TICK',
            'VALUE',
        );

        expect(rollupInfo).toEqual({
            columnName: 'VALUE',
            intervals: [1000, 60000, 31536000000],
            minimumInterval: 1000,
            maximumInterval: 31536000000,
        });
        expect(rollupInfo && formatRollupRangeLabel(rollupInfo)).toBe('1s - 1y');
    });
});
