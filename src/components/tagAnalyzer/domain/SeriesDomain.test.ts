import {
    PanelSeriesTimeType,
    getDefaultPanelSeriesAlias,
    getPanelSeriesDisplayName,
    getPanelSeriesTimeTypeFromTableColumns,
    hasSeriesWithoutRollup,
} from './SeriesDomain';

const BASETIME_FLAG = 0x01000000;

describe('hasSeriesWithoutRollup', () => {
    test('returns true when any series is not using rollup', () => {
        expect(
            hasSeriesWithoutRollup([
                {
                    useRollupTable: false,
                    sourceColumns: {
                        name: 'NAME',
                        time: 'ODOMETER',
                        value: 'VALUE',
                        timeBaseTime: true,
                        timeType: 20,
                    },
                },
            ]),
        ).toBe(true);
    });

    test('returns false when every series uses rollup', () => {
        expect(
            hasSeriesWithoutRollup([
                {
                    useRollupTable: true,
                    sourceColumns: {
                        name: 'NAME',
                        time: 'ODOMETER',
                        value: 'VALUE',
                        timeBaseTime: true,
                        timeType: 20,
                    },
                },
            ]),
        ).toBe(false);
    });

    test('returns true for datetime series without rollup', () => {
        expect(
            hasSeriesWithoutRollup([
                {
                    useRollupTable: false,
                    sourceColumns: {
                        name: 'NAME',
                        time: 'TIME',
                        value: 'VALUE',
                        timeBaseTime: true,
                        timeType: 6,
                    },
                },
            ]),
        ).toBe(true);
    });
});

describe('getPanelSeriesTimeTypeFromTableColumns', () => {
    test('detects DateTime time columns', () => {
        expect(
            getPanelSeriesTimeTypeFromTableColumns([
                { name: 'NAME', type: 5, flag: 0 },
                { name: 'TIME', type: 6, flag: BASETIME_FLAG },
                { name: 'VALUE', type: 20, flag: 0 },
            ]),
        ).toBe(PanelSeriesTimeType.DateTime);
    });

    test('detects numeric base-time columns', () => {
        expect(
            getPanelSeriesTimeTypeFromTableColumns([
                { name: 'NAME', type: 5, flag: 0 },
                { name: 'ODOMETER', type: 20, flag: BASETIME_FLAG },
                { name: 'VALUE', type: 20, flag: 0 },
            ]),
        ).toBe(PanelSeriesTimeType.Numeric);
    });
});

describe('series display names', () => {
    test('creates the default editable alias from tag, value, and table', () => {
        const series = {
            table: 'SYS.SENSOR_TABLE',
            sourceTagName: 'Sensor_03',
            calculationMode: 'avg',
            sourceColumns: {
                name: 'NAME',
                time: 'TIME',
                value: 'EXT',
                jsonKey: 'vibration',
            },
        };

        expect(getDefaultPanelSeriesAlias(series)).toBe(
            'Sensor_03 / EXT -> vibration (SYS.SENSOR_TABLE)',
        );
        expect(getPanelSeriesDisplayName({ ...series, alias: 'Pump A' })).toBe(
            'Pump A',
        );
    });
});
