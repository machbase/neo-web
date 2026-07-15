import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from './TqlResParser';

// machbase/neo #1421 follow-up — worksheet (WRK) TQL queries that return an
// application/json envelope went through WrkJsonParser, which (1) read
// `aData.data.rows` unguarded and threw "Cannot read properties of undefined
// (reading 'rows')" when the envelope had success:true but no `data` object, and
// (2) never returned a value, so `JSON.stringify(WrkJsonParser(...))` was always
// `undefined` and the worksheet showed a blank result.
describe('DetermineTqlResultType — worksheet JSON (WRK)', () => {
    const jsonHeaders = { 'content-type': 'application/json' };
    const wrk = (data: any) => DetermineTqlResultType(E_TQL_SCR.WRK, { status: 200, headers: jsonHeaders, data });

    test('a JSON envelope with success but no data object does not throw', () => {
        expect(() => wrk({ success: true, reason: 'executed' })).not.toThrow();
        const { parsedType, parsedData } = wrk({ success: true, reason: 'executed' });
        expect(parsedType).toBe(TqlResType.TEXT);
        // parsedData must be a defined stringified envelope, not undefined.
        expect(parsedData).toBeDefined();
        expect(JSON.parse(parsedData)).toEqual({ success: true, reason: 'executed' });
    });

    test('a normal JSON result returns the stringified envelope (not undefined)', () => {
        const data = { success: true, data: { columns: ['A'], rows: [[1], [2]] } };
        const { parsedType, parsedData } = wrk(data);
        expect(parsedType).toBe(TqlResType.TEXT);
        expect(parsedData).toBeDefined();
        expect(JSON.parse(parsedData)).toEqual(data);
    });

    test('a JSON result with >10 rows is truncated with a "...." marker', () => {
        const rows = Array.from({ length: 20 }, (_, i) => [i]);
        const { parsedData } = wrk({ success: true, data: { columns: ['A'], rows } });
        const parsed = JSON.parse(parsedData);
        // 6 head rows + '....' + 5 tail rows = 12 entries.
        expect(parsed.data.rows).toContain('....');
        expect(parsed.data.rows.length).toBe(12);
    });

    test("a JSON envelope carrying a 'message' shows the message as text", () => {
        const { parsedType, parsedData } = wrk({ success: true, data: { message: 'done' } });
        expect(parsedType).toBe(TqlResType.TEXT);
        expect(parsedData).toBe('done');
    });
});
