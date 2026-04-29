import { SortOrderEnum } from '../FetchTypes';
import { buildRawSeriesSql } from './BuildRawSeriesSql';

describe('RawSeriesSql', () => {
    it('builds raw-series SQL with a table target and sort order', () => {
        expect(buildRawSeriesSql(
            'APP.TAG_TABLE',
            'TAG_1',
            {
                startTime: 10,
                endTime: 20,
            },
            25,
            {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
            },
            {
                kind: 'disabled',
            },
            SortOrderEnum.Descending,
        )).toBe(
            "SELECT to_timestamp(TIME) / 1000000.0 AS date, VALUE AS value FROM APP.TAG_TABLE WHERE NAME = 'TAG_1' AND TIME BETWEEN 10 AND 20 ORDER BY 1 DESC LIMIT 25",
        );
    });

    it('builds raw-series SQL with a sampling prefix', () => {
        expect(buildRawSeriesSql(
            'APP.TAG_TABLE',
            'TAG_1',
            {
                startTime: 10,
                endTime: 20,
            },
            0,
            {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
            },
            {
                kind: 'enabled',
                value: 10,
            },
        )).toBe(
            "SELECT * FROM (SELECT /*+ SAMPLING(10) */ to_timestamp(TIME) / 1000000.0 AS date, VALUE AS value FROM APP.TAG_TABLE WHERE NAME = 'TAG_1' AND TIME BETWEEN 10 AND 20) LIMIT 200000",
        );
    });
});
