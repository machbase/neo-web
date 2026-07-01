import { buildAverageCalculationSql } from './BuildCalculationSql';

const TIME_RANGE_NS = {
    startTime: '1656601200000000000',
    endTime: '1719759590000000000',
};

const SOURCE_COLUMNS = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

describe('buildAverageCalculationSql', () => {
    it('uses the rollup bucket directly for multi-day rollup intervals', () => {
        const sql = buildAverageCalculationSql(
            'SYS.MACHROLL',
            'pneumatic',
            TIME_RANGE_NS,
            366,
            'day',
            2,
            true,
            SOURCE_COLUMNS,
        );

        expect(sql).toContain("ROLLUP('DAY', 2, TIME) AS mTime");
        expect(sql).toContain('to_timestamp(mTime) / 1000000.0 AS TIME');
        expect(sql).toContain('SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE');
        expect(sql).not.toContain('to_char(mTime');
        expect(sql).not.toContain('mTime / 172800000000000');
        expect(sql).not.toContain('THEN NULL');
    });
});
