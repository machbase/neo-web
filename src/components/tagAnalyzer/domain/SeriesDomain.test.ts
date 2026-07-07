import { hasSeriesWithoutRollup } from './SeriesDomain';

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
