import { buildStatzCountQuery, buildStatzTableQuery, StatzModalInfo } from './statzTableQuery';

const table = ['CODEX_INDEX_AUDIT', 'SYS', 1, 'SENSOR_TABLE'];
const modalInfo = (filter: string, filterMode: StatzModalInfo['filterMode']): StatzModalInfo => ({ state: true, filter, filterMode, table, recordCnt: 1 });

describe('buildStatzTableQuery', () => {
    test('uses an exact NAME match for a row Info button', () => {
        expect(buildStatzTableQuery(modalInfo('sensor1', 'exact'), 0, 10)).toBe(
            "SELECT * FROM CODEX_INDEX_AUDIT.SYS.V$SENSOR_TABLE_STAT WHERE NAME = 'sensor1' LIMIT 0, 10"
        );
    });

    test.each(['sensor_1', 'sensor%1'])("does not treat '%s' as a LIKE pattern for a row", (tagName) => {
        const query = buildStatzTableQuery(modalInfo(tagName, 'exact'), 0, 10);
        expect(query).toContain(`WHERE NAME = '${tagName}'`);
        expect(query).not.toContain('LIKE');
    });

    test('escapes a quote in an exact tag name', () => {
        expect(buildStatzTableQuery(modalInfo("sensor'1", 'exact'), 0, 10)).toContain("WHERE NAME = 'sensor''1'");
    });

    test('keeps the top Info button search and full-list behavior', () => {
        expect(buildStatzTableQuery(modalInfo('sensor1', 'search'), 10, 10)).toContain("WHERE NAME LIKE '%sensor1%' LIMIT 10, 10");
        expect(buildStatzTableQuery(modalInfo('', 'search'), 0, 10)).not.toContain(' WHERE ');
    });

    test('escapes a quote in a top Info search', () => {
        expect(buildStatzTableQuery(modalInfo("sensor'1", 'search'), 0, 10)).toContain("WHERE NAME LIKE '%sensor''1%'");
    });

    test.each([
        ['p_0', String.raw`('%p' || RTRIM('\\ ') || '_0%')`],
        ['100%', String.raw`('%100' || RTRIM('\\ ') || '%%')`],
        ['tail\\', String.raw`('%tail' || RTRIM('\\\\ ') || '%')`],
    ])('a top Info search for %p matches the text as typed', (aFilter, aPattern) => {
        expect(buildStatzTableQuery(modalInfo(aFilter, 'search'), 0, 10)).toContain(`WHERE NAME LIKE ${aPattern} LIMIT`);
    });

    test('a table name the catalogue quotes stays one identifier', () => {
        const sTable = ['MACHBASEDB', 'SYS', 1, 'Q-1545'];
        expect(buildStatzTableQuery({ ...modalInfo('', 'search'), table: sTable }, 0, 10)).toBe('SELECT * FROM MACHBASEDB.SYS."V$Q-1545_STAT" LIMIT 0, 10');
    });
});

describe('buildStatzCountQuery', () => {
    test('counts the rows the list pages through, under the same filter', () => {
        expect(buildStatzCountQuery(modalInfo('sensor1', 'search'))).toBe("SELECT COUNT(*) FROM CODEX_INDEX_AUDIT.SYS.V$SENSOR_TABLE_STAT WHERE NAME LIKE '%sensor1%'");
        expect(buildStatzCountQuery(modalInfo("sensor'1", 'exact'))).toBe("SELECT COUNT(*) FROM CODEX_INDEX_AUDIT.SYS.V$SENSOR_TABLE_STAT WHERE NAME = 'sensor''1'");
    });
});
