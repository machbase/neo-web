import { envDirectiveWarning, SQL_BASE_LIMIT, sqlBasicChartFormatter, sqlBasicFormatter, sqlCsvDownloadUrl, sqlSheetFormatter, SqlStatementEnv } from './sqlFormatter';

const BASIC_TAIL = "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('UTC'))";
const SHEET_TAIL = "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('ns'), tz('UTC'))";

/**
 * The splitter's own `env` type, not a local copy of it.
 *
 * A narrowed copy here is exactly how #1532 stayed invisible for as long as it did: the tests
 * could not name `timeformat`, so they could not notice it was being dropped. Aliasing the
 * exported type means the next directive the splitter learns is nameable here the day it lands.
 */
type ENV = SqlStatementEnv;

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

/**
 * `timeformat`, `tz` and `binaryformat` — the three directives of #1532.
 *
 * The bug they fix was not a formatting nicety. `sql.split` had been parsing these for a while and
 * the builders simply dropped them on the floor, so `-- env: timeformat=ns` ran with the toolbar's
 * format and a `binaryformat` request had nowhere to go at all. Everything below is measured
 * against the builders rather than derived from them: the expected TQL is written out literally so
 * a change in how it is assembled shows up as a diff instead of quietly agreeing with itself.
 *
 * Two of these assertions are not about formatting at all:
 *   - the JSON sink rewriting `ns` to `ns.str` is a data-integrity guard. An ns timestamp is past
 *     `Number.MAX_SAFE_INTEGER`, so without the rewrite `JSON.parse` rounds it and the row is
 *     silently wrong. MARKDOWN and CSV render text and must NOT be rewritten, which is why both
 *     sides are pinned here.
 *   - the CSV url strips a quote rather than escaping it. A double-quoted TQL literal that tries
 *     to escape its own quote binds NULL with no error, so a value carrying one has to lose it.
 */
describe('output format env', () => {
    const SQL_TEXT = 'select * from example';
    const CSV_SQL = "select * from example where name = 'a b'";
    const CSV_URL = 'https://neo.example/web/api/tql-exec';

    // Toolbar state, so an `-- env:` value can be told apart from the screen's value.
    const TOOLBAR_FORMAT = '2006-01-02 15:04:05';
    const TOOLBAR_TZ = 'UTC';

    const basicWith = (env?: ENV, aFormat = TOOLBAR_FORMAT, aTimeZone = TOOLBAR_TZ) => sqlBasicFormatter(SQL_TEXT, 1, aFormat, aTimeZone, SQL_BASE_LIMIT, env);
    const sheetWith = (env?: ENV, aFormat = TOOLBAR_FORMAT, aTimeZone = TOOLBAR_TZ) =>
        sqlSheetFormatter({ aSql: SQL_TEXT, aBrief: false, env, aTimeFormat: aFormat, aTimeZone });
    const csvWith = (env?: ENV, aFormat = TOOLBAR_FORMAT, aTimeZone = TOOLBAR_TZ) =>
        sqlCsvDownloadUrl({ aUrl: CSV_URL, aSql: CSV_SQL, aTimeFormat: aFormat, aTimeZone, aToken: 'tok-123', env });
    const CHART_AXIS = { x: 'TIME', y: 'VALUE', xIndex: 0, yIndex: 1, list: ['TIME', 'VALUE'] };
    const chartWith = (env?: ENV) => sqlBasicChartFormatter(SQL_TEXT, CHART_AXIS, env);

    const SQL_HEAD = 'SQL(`select * from example`)';
    const CSV_HEAD = 'https://neo.example/web/api/tql-exec?$=SQL(%60select%20%2a%20from%20example%20where%20name%20%3D%20%27a%20b%27%60)%0ACSV(';
    const CSV_FOOT = '%20httpHeader(%22Content-Disposition%22,%20%22attachment%22),%20heading(true)';

    describe('defaults are untouched', () => {
        // REGRESSION: every statement that asks for none of the three must produce the exact bytes
        // it produced before the three existed. This is the whole safety argument for the change.
        test('an absent env is byte-identical to the pre-#1532 output', () => {
            expect(basicWith()).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('UTC'))");
            expect(sheetWith()).toEqual(SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('2006-01-02 15:04:05'), tz('UTC'))");
            expect(csvWith()).toEqual(CSV_HEAD + 'timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),' + CSV_FOOT + ')&$token=tok-123');
        });

        test('an empty env object changes nothing', () => {
            expect(basicWith({})).toEqual(basicWith());
            expect(sheetWith({})).toEqual(sheetWith());
            expect(csvWith({})).toEqual(csvWith());
            expect(chartWith({})).toEqual(chartWith());
        });

        // `-- env: reset` clears the directive to an empty string rather than removing the key, so
        // the resolution is `||` and not `??`. An empty value means "the toolbar", never `tz('')`.
        test('empty values fall back to the toolbar, never to an empty literal', () => {
            const sEmpty: ENV = { timeformat: '', tz: '', binaryformat: '' };
            expect(basicWith(sEmpty)).toEqual(basicWith());
            expect(sheetWith(sEmpty)).toEqual(sheetWith());
            expect(csvWith(sEmpty)).toEqual(csvWith());
            expect(basicWith(sEmpty)).not.toContain("tz('')");
            expect(csvWith(sEmpty)).not.toContain('binaryformat');
        });

        // An older splitter answers `unknown env: binaryformat` and returns none of the three keys.
        // The builders have to treat that as "no directive", not as a reason to throw.
        test('an older server shape, missing all three keys, still builds', () => {
            const sOldShape = JSON.parse('{"use":"my-db","named":{"tag":"x"}}') as ENV;
            expect(() => basicWith(sOldShape)).not.toThrow();
            expect(basicWith(sOldShape)).toEqual("SQL(use('my-db'),`select * from example`, named('tag', 'x'))\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('UTC'))");
            expect(csvWith(sOldShape)).toEqual(csvWith({ use: 'my-db', named: { tag: 'x' } }));
        });
    });

    describe('each option is resolved on its own', () => {
        // The point of resolving per option rather than as a block: `-- env: tz=` alone must move
        // the zone and leave the format where the toolbar put it.
        test('tz alone does not disturb the time format', () => {
            expect(basicWith({ tz: 'Asia/Seoul' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('Asia/Seoul'))");
            expect(sheetWith({ tz: 'Asia/Seoul' })).toEqual(SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('2006-01-02 15:04:05'), tz('Asia/Seoul'))");
            expect(csvWith({ tz: 'Asia/Seoul' })).toEqual(CSV_HEAD + 'timeformat(%222006-01-02%2015:04:05%22),%20tz(%22Asia/Seoul%22),' + CSV_FOOT + ')&$token=tok-123');
        });

        test('timeformat alone does not disturb the zone', () => {
            expect(basicWith({ timeformat: 'RFC3339' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('RFC3339'), tz('UTC'))");
            expect(sheetWith({ timeformat: 'RFC3339' })).toEqual(SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('RFC3339'), tz('UTC'))");
            expect(csvWith({ timeformat: 'RFC3339' })).toEqual(CSV_HEAD + 'timeformat(%22RFC3339%22),%20tz(%22UTC%22),' + CSV_FOOT + ')&$token=tok-123');
        });

        test('both at once', () => {
            expect(basicWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('RFC3339'), tz('Asia/Seoul'))");
            expect(sheetWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).toEqual(
                SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('RFC3339'), tz('Asia/Seoul'))"
            );
            expect(csvWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).toEqual(CSV_HEAD + 'timeformat(%22RFC3339%22),%20tz(%22Asia/Seoul%22),' + CSV_FOOT + ')&$token=tok-123');
        });
    });

    describe('binaryformat', () => {
        // It has no toolbar control, so its absence has to mean "write nothing" — that is what
        // keeps every statement without the directive byte-identical.
        test('nothing is written when the statement does not ask', () => {
            expect(basicWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).not.toContain('binaryformat');
            expect(sheetWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).not.toContain('binaryformat');
            expect(csvWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul' })).not.toContain('binaryformat');
        });

        test('it is the last argument of the sink', () => {
            expect(basicWith({ binaryformat: 'hex' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('UTC'), binaryformat('hex'))");
            expect(sheetWith({ binaryformat: 'hex' })).toEqual(
                SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('2006-01-02 15:04:05'), tz('UTC'), binaryformat('hex'))"
            );
        });

        // In the CSV url it has to land inside the sink's closing paren and before `&$token=`,
        // which a naive append would get wrong in a way no type checks.
        test('in the CSV url it stays inside the sink, ahead of the token', () => {
            expect(csvWith({ binaryformat: 'hex' })).toEqual(CSV_HEAD + 'timeformat(%222006-01-02%2015:04:05%22),%20tz(%22UTC%22),' + CSV_FOOT + ',%20binaryformat(%22hex%22))&$token=tok-123');
        });

        test('all three together', () => {
            expect(basicWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul', binaryformat: 'hex' })).toEqual(
                SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('RFC3339'), tz('Asia/Seoul'), binaryformat('hex'))"
            );
            expect(csvWith({ timeformat: 'RFC3339', tz: 'Asia/Seoul', binaryformat: 'hex' })).toEqual(
                CSV_HEAD + 'timeformat(%22RFC3339%22),%20tz(%22Asia/Seoul%22),' + CSV_FOOT + ',%20binaryformat(%22hex%22))&$token=tok-123'
            );
        });
    });

    /**
     * The highest-value assertion in this file.
     *
     * `ns` and `us` timestamps run past `Number.MAX_SAFE_INTEGER`. The JSON sink is read back
     * through `JSON.parse`, which rounds them — so the backend is asked for `ns.str` and hands the
     * value over as a string instead. Applying the toolbar's format through that rewrite but not
     * the statement's own would not look broken; it would return rows that are quietly off by a
     * few hundred nanoseconds.
     *
     * MARKDOWN and CSV render text either way and are deliberately left alone, so both halves are
     * pinned: a future "consistency" edit that rewrites all three sinks fails here.
     */
    describe('ns/us precision on the JSON sink', () => {
        test('the JSON sink rewrites an env ns to ns.str', () => {
            expect(basicWith({ timeformat: 'ns' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('UTC'))");
        });

        test('and us to us.str', () => {
            expect(basicWith({ timeformat: 'us' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('us.str'), tz('UTC'))");
        });

        test('only ns and us are rewritten', () => {
            expect(basicWith({ timeformat: 'ms' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ms'), tz('UTC'))");
            expect(basicWith({ timeformat: 's' })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('s'), tz('UTC'))");
        });

        test('the markdown sink is NOT rewritten', () => {
            expect(sheetWith({ timeformat: 'ns' })).toEqual(SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('ns'), tz('UTC'))");
            expect(sheetWith({ timeformat: 'ns' })).not.toContain('ns.str');
        });

        test('the CSV url is NOT rewritten', () => {
            expect(csvWith({ timeformat: 'ns' })).toEqual(CSV_HEAD + 'timeformat(%22ns%22),%20tz(%22UTC%22),' + CSV_FOOT + ')&$token=tok-123');
            expect(csvWith({ timeformat: 'ns' })).not.toContain('ns.str');
        });

        // The rewrite is on the resolved value, so it fires on the toolbar's `ns` too — the case
        // that already worked, kept here so the two sources cannot drift apart.
        test('the toolbar ns is rewritten the same way', () => {
            expect(basicWith(undefined, 'ns')).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('UTC'))");
        });
    });

    describe('a format carrying spaces survives every sink', () => {
        const SPACED = '2006-01-02 15:04:05';

        test('the JSON sink keeps it whole', () => {
            expect(basicWith({ timeformat: SPACED }, 'ns')).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('UTC'))");
        });

        test('the markdown sink keeps it whole', () => {
            expect(sheetWith({ timeformat: SPACED }, 'ns')).toEqual(SQL_HEAD + "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('2006-01-02 15:04:05'), tz('UTC'))");
        });

        // In the url every space is a `%20`, and decoding has to give the format back unchanged —
        // this is the leg where a stray `encodeURIComponent` would turn the colons into `%3A`.
        test('the CSV url percent-encodes it and decodes back to the same string', () => {
            const sUrl = csvWith({ timeformat: SPACED }, 'ns');
            expect(sUrl).toContain('timeformat(%222006-01-02%2015:04:05%22)');
            expect(decodeURIComponent(sUrl.split('?$=')[1].split('&$token')[0])).toContain('timeformat("2006-01-02 15:04:05")');
        });
    });

    /**
     * Quoting, which is two different problems on two different paths.
     *
     * The single-quoted sinks escape with a backslash: doubling the quote SQL-style is rejected by
     * the parser outright. The double-quoted CSV literal cannot escape at all — `"a\""` binds NULL
     * with no error — so the quote is removed instead, along with the control characters that would
     * otherwise be spliced raw into a URL query value.
     */
    describe('hostile env values', () => {
        test("a quote in a single-quoted sink is backslash-escaped, never doubled", () => {
            expect(basicWith({ timeformat: "a'b" })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('a\\'b'), tz('UTC'))");
            expect(basicWith({ timeformat: "a'b" })).not.toContain("''");
            expect(basicWith({ tz: "z'q" })).toEqual(SQL_HEAD + "\nDROP(0)\nTAKE(50)\nJSON(timeformat('2006-01-02 15:04:05'), tz('z\\'q'))");
            expect(sheetWith({ timeformat: "a'b" })).toContain("timeformat('a\\'b')");
            expect(basicWith({ binaryformat: "h'x" })).toContain("binaryformat('h\\'x')");
        });

        // Removed, not escaped: the failure this guards against is a silent NULL bind, which no
        // error would announce.
        test('a quote in the CSV url is dropped, and control characters with it', () => {
            expect(csvWith({ timeformat: 'a"b c\nd' })).toEqual(CSV_HEAD + 'timeformat(%22ab%20cd%22),%20tz(%22UTC%22),' + CSV_FOOT + ')&$token=tok-123');
            expect(csvWith({ timeformat: 'a"b c\nd' })).not.toContain('%5C');
        });

        test('the CSV url strips DEL and the C0 range but keeps the space', () => {
            // 0x20 is legitimate — the default time format is full of spaces — so the filter is
            // `< 0x20` plus 0x7f, not "anything non-alphanumeric".
            expect(csvWith({ tz: 'UTC' })).toEqual(csvWith());
            expect(csvWith({ binaryformat: 'he"x' })).toContain(',%20binaryformat(%22hex%22))');
        });
    });

    /**
     * The directives are per statement, which is the behaviour `-- env: reset` depends on: run a
     * sheet where statement A sets a format and statement B resets it, and B has to come out as if
     * no directive had ever been written — not as A's leftovers.
     */
    describe('applied per statement', () => {
        test('a statement following one with directives is identical to the baseline', () => {
            const sStatementA: ENV = { timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' };
            const sStatementB: ENV = {};

            expect(basicWith(sStatementA)).not.toEqual(basicWith());
            expect(basicWith(sStatementB)).toEqual(basicWith());
            expect(sheetWith(sStatementB)).toEqual(sheetWith());
            expect(csvWith(sStatementB)).toEqual(csvWith());
            expect(chartWith(sStatementB)).toEqual(chartWith());
        });

        test('directives do not leak between the four builders of one statement', () => {
            // The same env reaches run / more-rows / CSV / CHART; each writes what its own sink
            // supports, and the JSON rewrite is not allowed to escape into the other two.
            const sEnv: ENV = { timeformat: 'ns', binaryformat: 'hex' };
            expect(basicWith(sEnv)).toContain("timeformat('ns.str')");
            expect(sheetWith(sEnv)).toContain("timeformat('ns')");
            expect(csvWith(sEnv)).toContain('timeformat(%22ns%22)');
            expect(chartWith(sEnv)).toEqual(chartWith());
        });
    });

    /**
     * CHART writes none of the three, and that is a measured decision rather than an oversight.
     *
     * Two CHART runs differing only in `tz` came back as byte-identical JS assets carrying raw
     * epoch millis, because the server's CHART exporter implements none of these setters. Writing
     * them anyway would be dead TQL. This block is the pin on that decision: if someone adds them
     * "for consistency", these fail and the comment above `sqlBasicChartFormatter` gets read.
     */
    describe('the chart sink ignores all three', () => {
        test('byte-identical with every field set', () => {
            expect(chartWith({ timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' })).toEqual(chartWith());
        });

        test('no trace of them anywhere in the output', () => {
            const sChart = chartWith({ timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' });
            expect(sChart).not.toContain('timeformat');
            expect(sChart).not.toContain('binaryformat');
            expect(sChart).not.toContain('Asia/Seoul');
        });

        // What the chart DOES carry is the source of the rows, and the new fields must not get in
        // the way of it — `bridge`/`use` still precede the statement, `named` still follows it.
        test('bridge, use and named are still written alongside them', () => {
            const sChart = chartWith({ bridge: 'my-bridge', use: 'my-db', named: { tag: 'x' }, timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' });
            expect(sChart).toContain("SQL(bridge('my-bridge'),use('my-db'),`select * from example`, named('tag', 'x'))\nTAKE(5000)\n");
            expect(sChart).toEqual(chartWith({ bridge: 'my-bridge', use: 'my-db', named: { tag: 'x' } }));
        });
    });

    // The three new directives sit next to the three old ones in the same SQL(), so the order of
    // the arguments is worth pinning once end to end rather than per field.
    test('all six directives on one statement', () => {
        expect(basicWith({ bridge: 'my-bridge', use: 'my-db', named: { tag: 'x' }, timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' })).toEqual(
            "SQL(bridge('my-bridge'),use('my-db'),`select * from example`, named('tag', 'x'))\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('Asia/Seoul'), binaryformat('hex'))"
        );
        expect(sheetWith({ bridge: 'my-bridge', use: 'my-db', named: { tag: 'x' }, timeformat: 'ns', tz: 'Asia/Seoul', binaryformat: 'hex' })).toEqual(
            "SQL(bridge('my-bridge'),use('my-db'),`select * from example`, named('tag', 'x'))\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('ns'), tz('Asia/Seoul'), binaryformat('hex'))"
        );
    });
});
