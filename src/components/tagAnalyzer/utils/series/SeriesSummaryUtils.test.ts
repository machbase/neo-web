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
                    },
                ],
                15,
                35,
            );

            expect(sResult).toEqual([
                {
                    table: 'APP.table',
                    name: 'sensor',
                    alias: 'Sensor A',
                    min: '3.00000',
                    max: '5.00000',
                    avg: '4.00000',
                },
            ]);
        });
    });
});
