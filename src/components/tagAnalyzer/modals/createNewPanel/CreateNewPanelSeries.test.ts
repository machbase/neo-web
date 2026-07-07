import { createPanelSeriesDefinition } from './CreateNewPanelSeries';

describe('createPanelSeriesDefinition', () => {
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
                    EXAMPLE: {
                        VALUE: [1000],
                        EXT_TYPE: [0],
                    },
                },
            },
        });

        expect(series.useRollupTable).toBe(true);
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
                    EXAMPLE: {
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
                    EXAMPLE: {
                        OTHER_VALUE: [1000],
                        EXT_TYPE: [0],
                    },
                },
            },
        });

        expect(series.useRollupTable).toBe(false);
    });
});
