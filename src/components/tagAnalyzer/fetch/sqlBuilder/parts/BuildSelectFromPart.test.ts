import {
    buildLimitSqlPart,
    buildQuerySql,
    buildSelectSqlPart,
    buildSubSqlTargetSqlPart,
    buildTableTargetSqlPart,
} from './BuildSqlParts';

describe('BuildSqlParts', () => {
    it('builds query SQL for a table target', () => {
        expect(buildQuerySql(
            buildSelectSqlPart('TIME, VALUE'),
            buildTableTargetSqlPart('APP.TAG_TABLE'),
        )).toBe('SELECT TIME, VALUE FROM APP.TAG_TABLE');
    });

    it('builds query SQL for a sub-SQL target with a select prefix', () => {
        expect(buildQuerySql(
            buildSelectSqlPart('TIME', '/*+ SAMPLING(10) */'),
            buildSubSqlTargetSqlPart('SELECT TIME FROM APP.TAG_TABLE'),
        )).toBe(
            'SELECT /*+ SAMPLING(10) */ TIME FROM (SELECT TIME FROM APP.TAG_TABLE)',
        );
    });

    it('builds query SQL with an explicit condition part', () => {
        expect(buildQuerySql(
            buildSelectSqlPart('TIME'),
            buildTableTargetSqlPart('APP.TAG_TABLE'),
            "WHERE NAME = 'TAG_1'",
            '',
            '',
            buildLimitSqlPart(1),
        )).toBe(
            "SELECT TIME FROM APP.TAG_TABLE WHERE NAME = 'TAG_1' LIMIT 1",
        );
    });
});
