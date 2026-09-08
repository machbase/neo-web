import { envDirectiveWarning, SQL_BASE_LIMIT, sqlBasicChartFormatter, sqlBasicFormatter, sqlCsvDownloadUrl, sqlSheetFormatter } from './sqlFormatter';

const BASIC_TAIL = "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('UTC'))";
const SHEET_TAIL = "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('ns'), tz('UTC'))";

type ENV = { bridge?: string; use?: string; named?: Record<string, string> };

const basic = (env?: ENV) => sqlBasicFormatter('select * from example', 1, 'ns', 'UTC', SQL_BASE_LIMIT, env);

const sheet = (env?: ENV) => sqlSheetFormatter({ aSql: 'select * from example', aBrief: false, env, aTimeFormat: 'ns', aTimeZone: 'UTC' });

describe('sqlBasicFormatter', () => {
    // REGRESSION: must stay byte-identical to the pre-`use` output.
    test('no env', () => {
        expect(basic()).toEqual('SQL(`select * from example`)' + BASIC_TAIL);
    });
    // REGRESSION: must stay byte-identical to the pre-`use` output.
    test('bridge only', () => {
        expect(basic({ bridge: 'my-bridge' })).toEqual("SQL(bridge('my-bridge'),`select * from example`)" + BASIC_TAIL);
    });
    test('use only', () => {
        expect(basic({ use: 'my-db' })).toEqual("SQL(use('my-db'),`select * from example`)" + BASIC_TAIL);
    });
    test('bridge + use emits bridge first', () => {
        expect(basic({ bridge: 'my-bridge', use: 'my-db' })).toEqual("SQL(bridge('my-bridge'),use('my-db'),`select * from example`)" + BASIC_TAIL);
    });
    test('empty env values are ignored', () => {
        expect(basic({ bridge: '', use: '' })).toEqual('SQL(`select * from example`)' + BASIC_TAIL);
    });
});

describe('sqlSheetFormatter', () => {
    // REGRESSION: must stay byte-identical to the pre-`use` output.
    test('no env', () => {
        expect(sheet()).toEqual('SQL(`select * from example`)' + SHEET_TAIL);
    });
    // REGRESSION: must stay byte-identical to the pre-`use` output.
    test('bridge only', () => {
        expect(sheet({ bridge: 'my-bridge' })).toEqual("SQL(bridge('my-bridge'),`select * from example`)" + SHEET_TAIL);
    });
    test('use only', () => {
        expect(sheet({ use: 'my-db' })).toEqual("SQL(use('my-db'),`select * from example`)" + SHEET_TAIL);
    });
    test('bridge + use emits bridge first', () => {
        expect(sheet({ bridge: 'my-bridge', use: 'my-db' })).toEqual("SQL(bridge('my-bridge'),use('my-db'),`select * from example`)" + SHEET_TAIL);
    });
    test('empty env values are ignored', () => {
        expect(sheet({ bridge: '', use: '' })).toEqual('SQL(`select * from example`)' + SHEET_TAIL);
    });
});

describe('sqlCsvDownloadUrl', () => {
    const URL_BASE = 'https://neo.example/web/api/tql-exec';
    const SQL_TEXT = "select * from example where name = 'a b'";
    const csv = (env?: ENV, token: string | null = 'tok-123') =>
        sqlCsvDownloadUrl({ aUrl: URL_BASE, aSql: SQL_TEXT, aTimeFormat: '2006-01-02 15:04:05', aTimeZone: 'UTC', aToken: token, env });

    // REGRESSION: byte-identical to the pre-`use` inline builder in src/components/sql/index.tsx.
    test('no env', () => {
        expect(csv()).toEqual(
            'https://neo.example/web/api/tql-exec?$=SQL(%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true))&$token=tok-123'
        );
    });
    // REGRESSION: byte-identical to the pre-`use` inline builder in src/components/sql/index.tsx.
    test('bridge only', () => {
        expect(csv({ bridge: 'my bridge' })).toEqual(
            'https://neo.example/web/api/tql-exec?$=SQL(bridge(%22my%20bridge%22),%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true))&$token=tok-123'
        );
    });
    test('use only', () => {
        expect(csv({ use: 'my db' })).toEqual(
            'https://neo.example/web/api/tql-exec?$=SQL(use(%22my%20db%22),%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true))&$token=tok-123'
        );
    });
    test('bridge + use emits bridge first', () => {
        expect(csv({ bridge: 'my bridge', use: 'my db' })).toEqual(
            'https://neo.example/web/api/tql-exec?$=SQL(bridge(%22my%20bridge%22),use(%22my%20db%22),%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true))&$token=tok-123'
        );
    });
    // REGRESSION: an empty env (what `-- env: reset` yields) must fall back to the plain URL.
    test('empty env values are ignored', () => {
        expect(csv({ bridge: '', use: '' })).toEqual(csv());
    });
    // REGRESSION: a missing accessToken interpolated as the literal 'null', same as before.
    test('null token', () => {
        expect(csv(undefined, null)).toEqual(
            'https://neo.example/web/api/tql-exec?$=SQL(%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true))&$token=null'
        );
    });
});

describe('sqlBasicChartFormatter', () => {
    // Captured by running the pre-`env` implementation (`git show HEAD:src/utils/sqlFormatter.ts`); do not hand-edit.
    const CHART_SINK = 'CHART(\n            theme("dark"),\n            chartOption({\n                backgroundColor: "#252525",\n                "animation": false,\n                "dataZoom": [{"type": "slider","end": 100}],\n                "color": ["#5470c6","#91cc75","#fac858","#ee6666","#73c0de","#3ba272","#fc8452","#9a60b4","#ea7ccc"],\n                "legend": {"show": true,"type": ""},\n                "title": {},\n                "tooltip": {"show": true,"trigger": "axis","axisPointer": {"type": "cross","show": false}},\n                "xAxis": {"name": "TIME", "type": "category", "data": column(0)}, \n                "yAxis": {"name": "VALUE", "type": "value"},\n                "series": [{"name": "VALUE", "type": "line", "data": column(1)}],\n            })\n        )';
    const CHART_AXIS = { x: 'TIME', y: 'VALUE', xIndex: 0, yIndex: 1, list: ['TIME', 'VALUE'] };
    const chart = (env?: ENV) => sqlBasicChartFormatter('select * from example', CHART_AXIS, env);

    // REGRESSION: must stay byte-identical to the pre-`env` output.
    test('no env', () => {
        expect(chart()).toEqual('SQL(`select * from example`)\nTAKE(5000)\n' + CHART_SINK);
    });
    test('bridge only', () => {
        expect(chart({ bridge: 'my-bridge' })).toEqual("SQL(bridge('my-bridge'),`select * from example`)\nTAKE(5000)\n" + CHART_SINK);
    });
    test('use only', () => {
        expect(chart({ use: 'my-db' })).toEqual("SQL(use('my-db'),`select * from example`)\nTAKE(5000)\n" + CHART_SINK);
    });
    test('bridge + use emits bridge first', () => {
        expect(chart({ bridge: 'my-bridge', use: 'my-db' })).toEqual("SQL(bridge('my-bridge'),use('my-db'),`select * from example`)\nTAKE(5000)\n" + CHART_SINK);
    });
    test('empty env values are ignored', () => {
        expect(chart({ bridge: '', use: '' })).toEqual(chart());
    });
});

describe('envDirectiveWarning', () => {
    const stmt = (error?: string) => ({ beginLine: 1, endLine: 1, env: error ? { error } : {}, isComment: false, text: 'select 1' });

    test('no statements', () => {
        expect(envDirectiveWarning([])).toBeNull();
        expect(envDirectiveWarning(undefined)).toBeNull();
        expect(envDirectiveWarning(null)).toBeNull();
    });
    test('statements without env.error', () => {
        expect(envDirectiveWarning([stmt(), stmt()])).toBeNull();
    });
    test('an empty env.error is not a warning', () => {
        expect(envDirectiveWarning([stmt('')])).toBeNull();
    });
    // The concrete case: an older server that does not know `use=` answers this for `-- env: use=x`.
    test('single error', () => {
        expect(envDirectiveWarning([stmt('unknown env: use')])).toEqual('env directive ignored: unknown env: use');
    });
    test('the same error twice is reported once', () => {
        expect(envDirectiveWarning([stmt('unknown env: use'), stmt('unknown env: use')])).toEqual('env directive ignored: unknown env: use');
    });
    test('distinct errors are joined', () => {
        expect(envDirectiveWarning([stmt('unknown env: use'), stmt('invalid env syntax'), stmt('unknown env: use')])).toEqual(
            'env directive ignored: unknown env: use, invalid env syntax'
        );
    });
    test('statements with and without errors', () => {
        expect(envDirectiveWarning([stmt(), stmt('unknown env: use'), stmt()])).toEqual('env directive ignored: unknown env: use');
    });
    test('a missing env object is tolerated', () => {
        expect(envDirectiveWarning([{ env: undefined }, { env: null }, { env: { error: 'unknown env: use' } }])).toEqual('env directive ignored: unknown env: use');
    });
});

/**
 * `named()` is the third `-- env:` directive, and the only one that follows the statement
 * instead of preceding it: `SQL(use('db'), \`… :tag …\`, named('tag', 'x'))`.
 *
 * The shapes below are pinned to what the engine actually accepts, measured against a running
 * server: a trailing `named()` parses after a backtick literal, it coexists with `use()`, and a
 * value bound as text satisfies a numeric position (`limit :one` with `'1'` returns the same
 * single row as `1`). That last one is why nothing here tries to infer a type — the splitter
 * reports every value as text, and guessing would turn a tag named `007` into 7.
 */
describe('named parameters', () => {
    // The other blocks keep these helpers to themselves, so this one builds its own.
    const CSV_URL = 'https://neo.example/web/api/tql-exec';
    const csv = (env?: ENV) =>
        sqlCsvDownloadUrl({ aUrl: CSV_URL, aSql: 'select * from example', aTimeFormat: 'ns', aTimeZone: 'UTC', aToken: 'tok', env });
    const chart = (env?: ENV) => sqlBasicChartFormatter('select * from example', undefined, env);

    test('a named argument follows the statement, not precedes it', () => {
        expect(basic({ named: { tag: 'x' } })).toEqual("SQL(`select * from example`, named('tag', 'x'))" + BASIC_TAIL);
    });

    test('each key becomes its own argument, in declaration order', () => {
        expect(basic({ named: { name: 'temp.line1', from: '2026-01-01', to: '2026-09-01' } })).toEqual(
            "SQL(`select * from example`, named('name', 'temp.line1'), named('from', '2026-01-01'), named('to', '2026-09-01'))" + BASIC_TAIL
        );
    });

    test('use comes before the statement and named after it', () => {
        expect(basic({ use: 'my-db', named: { tag: 'x' } })).toEqual("SQL(use('my-db'),`select * from example`, named('tag', 'x'))" + BASIC_TAIL);
    });

    test('a numeric value is still quoted', () => {
        // The engine accepts text in a numeric position, so quoting is safe and inferring is not.
        expect(basic({ named: { one: '1' } })).toEqual("SQL(`select * from example`, named('one', '1'))" + BASIC_TAIL);
    });

    test("a quote in the value is backslash-escaped, never doubled", () => {
        // `'a''b'` is rejected by the parser: cannot transition token types from STRING to STRING.
        expect(basic({ named: { k: "a'b" } })).toEqual("SQL(`select * from example`, named('k', 'a\\'b'))" + BASIC_TAIL);
        expect(basic({ named: { k: "a'b" } })).not.toContain("''");
    });

    test('a backslash in the value is escaped', () => {
        expect(basic({ named: { k: 'a\\b' } })).toEqual("SQL(`select * from example`, named('k', 'a\\\\b'))" + BASIC_TAIL);
    });

    test('a double quote needs no escaping inside a single-quoted literal', () => {
        expect(basic({ named: { k: 'a"b' } })).toEqual('SQL(`select * from example`, named(\'k\', \'a"b\'))' + BASIC_TAIL);
    });

    test('a key that is not an identifier is dropped rather than quoted', () => {
        // The key lands in argument position, where there is nothing to quote it with.
        expect(basic({ named: { "x') , drop": 'v', '1bad': 'v', ok: 'v' } })).toEqual("SQL(`select * from example`, named('ok', 'v'))" + BASIC_TAIL);
    });

    test('an empty named map changes nothing', () => {
        expect(basic({ named: {} })).toEqual(basic());
    });

    test('the markdown sheet carries them too', () => {
        expect(sheet({ use: 'my-db', named: { tag: 'x' } })).toEqual("SQL(use('my-db'),`select * from example`, named('tag', 'x'))" + SHEET_TAIL);
    });

    test('the chart formatter carries them too', () => {
        expect(chart({ named: { tag: 'x' } })).toContain("SQL(`select * from example`, named('tag', 'x'))");
    });

    test('the CSV url carries them, percent-encoded and single-quoted', () => {
        // `encodeURI` leaves `'` alone (it is a URL sub-delimiter), so the delimiters stay
        // literal while the escaped quote inside the value is encoded. Decoding the query
        // string yields `named('tag', 'a\\'b c')`, which is the form the engine accepts.
        const sUrl = csv({ named: { tag: "a'b c" } });
        expect(sUrl).toContain("%60,%20named('tag',%20'a%5C%27b%20c')");
        expect(decodeURIComponent(sUrl.split('?$=')[1].split('&$token')[0])).toContain("named('tag', 'a\\'b c')");
        expect(sUrl).toContain(')%0ACSV(');
    });

    test('a statement without named is byte-identical to before', () => {
        // REGRESSION: the three existing directives must not shift by a character.
        expect(basic({ bridge: 'b', use: 'u' })).toEqual("SQL(bridge('b'),use('u'),`select * from example`)" + BASIC_TAIL);
        expect(csv({ use: 'my db' })).toEqual(csv({ use: 'my db', named: {} }));
    });
});
