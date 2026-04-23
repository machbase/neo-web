import { buildSeriesSummaryRows } from './SeriesSummaryUtils';

describe('SeriesSummaryUtils', () => {
    describe('buildSeriesSummaryRows', () => {
        it('calculates min, max, and avg for values within the selected range', () => {
            const sResult = buildSeriesSummaryRows(
                [
                    {
                        data: [
                            [10, 1],
                            [20, 3],
                            [30, 5],
                        ],
                    },
                ],
                [
                    {
                        table: 'APP.table',
                        sourceTagName: 'sensor',
                        alias: 'Sensor A',
                        sourceColumns: {
                            name: 'name',
                            time: 'time',
                            value: 'value',
                        },
                    },
                ],
                15,
                35,
            );

            expect(sResult).toEqual([
                {
                    seriesIndex: 0,
                    table: 'APP.table',
                    name: 'sensor',
                    alias: 'Sensor A',
                    sourceColumns: {
                        name: 'name',
                        time: 'time',
                        value: 'value',
                    },
                    min: '3.00000',
                    max: '5.00000',
                    avg: '4.00000',
                },
            ]);
        });
    });
});
