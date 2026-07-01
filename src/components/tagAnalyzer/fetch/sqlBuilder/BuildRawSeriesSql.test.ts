import { SortOrderEnum, type SeriesFetchColumnMap } from '../panelData/PanelDataFetchTypes';
import { buildRawSeriesSql } from './BuildRawSeriesSql';

const sourceColumnMap: SeriesFetchColumnMap = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

const requestedTimeRange = {
    startTime: 0,
    endTime: 1000000,
};

describe('buildRawSeriesSql', () => {
    it('builds sampled raw SQL with the legacy-compatible sampling shape', () => {
        const sql = buildRawSeriesSql(
            'tag_table',
            'tag_a',
            requestedTimeRange,
            15000,
            sourceColumnMap,
            {
                kind: 'enabled',
                value: 0.01,
            },
            SortOrderEnum.Ascending,
        );

        expect(sql).toContain('SELECT/*+ SAMPLING(0.01) */');
        expect(sql).toContain('ORDER BY 1 ASC');
        expect(sql).toContain('LIMIT 200000');
        expect(sql).not.toContain('LIMIT 15000');
    });

    it('keeps the requested row count when raw sampling is disabled', () => {
        const sql = buildRawSeriesSql(
            'tag_table',
            'tag_a',
            requestedTimeRange,
            15000,
            sourceColumnMap,
            {
                kind: 'disabled',
            },
            SortOrderEnum.Ascending,
        );

        expect(sql).not.toContain('SAMPLING');
        expect(sql).toContain('ORDER BY 1 ASC');
        expect(sql).toContain('LIMIT 15000');
    });
});