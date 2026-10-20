import { buildCalculatedSeriesSql, buildRawSeriesSql } from './seriesSql';
import { PanelSeriesCalculationMode, validatePanelSeriesSourceColumns } from '../seriesModel';
import type { IntervalOption } from '../rangeExpression/intervalResolver';

const columns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'TIME', value: 'VALUE' });
const range = { start: 1000, end: 2000 };
const interval = { IntervalType: 'sec', IntervalValue: 1 } as IntervalOption;
const rawSql = (aTable: string, aTag: string, aColumns = columns) => buildRawSeriesSql(aTable, aTag, aColumns, range, true);

describe('series SQL query text', () => {
    it('keeps an ordinary statement unchanged', () => {
        expect(rawSql('MACHBASEDB.SYS.TAG', 'sensor').split('\nUNION ALL\n')[0]).toBe([
            'SELECT /*+ SCAN_BACKWARD(TAG) */ TO_TIMESTAMP(TIME) / 1000000.0 AS mTime,',
            '    VALUE AS mValue',
            'FROM MACHBASEDB.SYS.TAG',
            "WHERE NAME = 'sensor'",
            '  AND TIME < FROM_TIMESTAMP(1000000000)',
            'LIMIT 1',
        ].join('\n'));
    });

    it.each([
        ["o'brien", "'o''brien'"],
        ['tail\\', String.raw`('tail' || RTRIM('\\ '))`],
        ['q"t', `'q"t'`],
    ])('writes the tag %s as a SQL value', (aTag, aLiteral) => {
        expect(rawSql('MACHBASEDB.SYS.TAG', aTag)).toContain(`WHERE NAME = ${aLiteral}`);
        expect(buildCalculatedSeriesSql('MACHBASEDB.SYS.TAG', aTag, columns, range, PanelSeriesCalculationMode.Average, interval, 100))
            .toContain(`WHERE NAME = ${aLiteral}`);
    });

    it('double-quotes a non-plain table and its columns', () => {
        const sColumns = validatePanelSeriesSourceColumns({ name: 'tag name', time: 'TIME', value: 'my-value' });
        const sql = rawSql('MACHBASEDB.SYS.Q-1545', 'p_0', sColumns);
        expect(sql).toContain('SCAN_BACKWARD("Q-1545")');
        expect(sql).toContain('    "my-value" AS mValue\nFROM MACHBASEDB.SYS."Q-1545"\nWHERE "tag name" = \'p_0\'');
    });
});
