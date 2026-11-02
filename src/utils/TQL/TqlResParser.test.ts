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

// machbase/neo #1553 — the body arrives parsed, and printing it back overflows the call stack when it
// is nested deeply enough (Firefox does so unindented at ~3,770 levels; Node's V8 here at 8,000). The
// body as the server sent it is the same text, so it is used instead of failing.
describe('DetermineTqlResultType — body too deeply nested to print back', () => {
    const jsonHeaders = { 'content-type': 'application/json' };
    const sText = '{"data":{"columns":["column0"],"types":["any"],"rows":[' + '['.repeat(8000) + ']'.repeat(8000) + ']},"success":true}';
    const sData = () => JSON.parse(sText);

    test.each([E_TQL_SCR.TQL, E_TQL_SCR.WRK, E_TQL_SCR.DSH])('%s answers the body as received', (aType) => {
        expect(() => JSON.stringify(sData())).toThrow();
        const { parsedType, parsedData } = DetermineTqlResultType(aType, { status: 200, headers: jsonHeaders, data: sData(), text: sText });
        expect(parsedType).toBe(TqlResType.TEXT);
        expect(parsedData).toBe(sText);
    });

    test('without the body text the failure surfaces as before', () => {
        expect(() => DetermineTqlResultType(E_TQL_SCR.TQL, { status: 200, headers: jsonHeaders, data: sData() })).toThrow();
    });
});
