import {
    buildAggregateOuterSql,
    buildAggregateSubSql,
    buildAverageOuterSql,
    buildAverageSubSql,
    buildNonRollupTimeGroupKeySqlInfo,
    buildCountOuterSql,
    buildCountSubSql,
    buildFirstLastOuterSql,
    buildFirstLastSubSql,
    buildNonRollupScaledTimeGroupKeySql,
    buildRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlPart,
    buildTruncatedTimeGroupKeySqlPart,
} from './parts/BuildSqlParts';

describe('CalculationSqlParts', () => {
    it('builds rollup and non-rollup time-bucket contexts separately', () => {
        expect(buildRollupTimeGroupKeySqlInfo('day', 2)).toEqual({
            outerTimeExpressionSql:
                'to_char(mTime / 172800000000000  * 172800000000000)',
            nonRollupBucketIntervalSeconds: 1,
        });
        expect(buildNonRollupTimeGroupKeySqlInfo('hour')).toEqual({
            outerTimeExpressionSql: 'mTime',
            nonRollupBucketIntervalSeconds: 3600,
        });
    });

    it('builds direct rollup and non-rollup truncated time buckets separately', () => {
        expect(buildRollupTimeGroupKeySqlPart('TIME', 'min', 5)).toBe(
            "ROLLUP('MIN', 5, TIME)",
        );
        expect(buildTruncatedTimeGroupKeySqlPart('TIME', 'min', 5)).toBe(
            "DATE_TRUNC('min', TIME, 5)",
        );
    });

    it('builds direct rollup and non-rollup scaled time buckets separately', () => {
        expect(buildRollupTimeGroupKeySqlPart('TIME', 'hour', 2)).toBe(
            "ROLLUP('HOUR', 2, TIME)",
        );
        expect(buildNonRollupScaledTimeGroupKeySql('TIME', 2, 3600)).toBe(
            'TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000)',
        );
    });

    it('builds aggregate sub-SQL separately from the outer aggregate SQL', () => {
        const sSubSql = buildAggregateSubSql(
            'sum',
            'APP.TAG_TABLE',
            'VALUE',
            "WHERE NAME in ('TAG_1') and TIME between 10 and 20",
            "DATE_TRUNC('min', TIME, 5)",
        );

        expect(sSubSql).toBe(
            "SELECT DATE_TRUNC('min', TIME, 5) AS mTime, sum(VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime",
        );
        expect(buildAggregateOuterSql('sum', sSubSql, 'mTime', 25)).toBe(
            "SELECT to_timestamp(mTime) / 1000000.0 AS time, sum(mValue) AS value FROM (SELECT DATE_TRUNC('min', TIME, 5) AS mTime, sum(VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime) GROUP BY TIME ORDER BY TIME LIMIT 25",
        );
    });

    it('builds average sub-SQL separately from the outer average SQL', () => {
        const sSubSql = buildAverageSubSql(
            'APP.TAG_TABLE',
            'VALUE',
            "WHERE NAME in ('TAG_1') and TIME between 10 and 20",
            'TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000)',
        );

        expect(sSubSql).toBe(
            "SELECT TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000) AS mTime, sum(VALUE) AS SUMMVAL, count(VALUE) AS CNTMVAL FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime",
        );
        expect(buildAverageOuterSql(sSubSql, 'mTime', 10)).toBe(
            "SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE FROM (SELECT TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000) AS mTime, sum(VALUE) AS SUMMVAL, count(VALUE) AS CNTMVAL FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime) GROUP BY TIME ORDER BY TIME LIMIT 10",
        );
    });

    it('builds count sub-SQL separately from the outer count SQL', () => {
        const sSubSql = buildCountSubSql(
            'APP.TAG_TABLE',
            'VALUE',
            "WHERE NAME in ('TAG_1') and TIME between 10 and 20",
            "ROLLUP('MIN', 5, TIME)",
        );

        expect(sSubSql).toBe(
            "SELECT ROLLUP('MIN', 5, TIME) AS mTime, count(VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime",
        );
        expect(buildCountOuterSql(sSubSql, 'mTime', 15)).toBe(
            "SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(mValue) AS VALUE FROM (SELECT ROLLUP('MIN', 5, TIME) AS mTime, count(VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime) GROUP BY TIME ORDER BY TIME LIMIT 15",
        );
    });

    it('builds first and last sub-SQL separately from the outer first/last SQL', () => {
        const sSubSql = buildFirstLastSubSql(
            'last',
            'APP.TAG_TABLE',
            'VALUE',
            "WHERE NAME in ('TAG_1') and TIME between 10 and 20",
            "DATE_TRUNC('hour', TIME, 1)",
        );

        expect(sSubSql).toBe(
            "SELECT DATE_TRUNC('hour', TIME, 1) AS mTime, last(TIME, VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime ORDER BY mTime",
        );
        expect(buildFirstLastOuterSql('last', sSubSql, 'mTime', 5)).toBe(
            "SELECT to_timestamp(mTime) / 1000000.0 AS time, last(mTime, mValue) AS value FROM (SELECT DATE_TRUNC('hour', TIME, 1) AS mTime, last(TIME, VALUE) AS mValue FROM APP.TAG_TABLE WHERE NAME in ('TAG_1') and TIME between 10 and 20 GROUP BY mTime ORDER BY mTime) GROUP BY TIME ORDER BY TIME LIMIT 5",
        );
    });
});
