import { envDirectiveWarning, SQL_BASE_LIMIT, sqlBasicChartFormatter, sqlBasicFormatter, sqlCsvDownloadUrl, sqlSheetFormatter } from './sqlFormatter';

const BASIC_TAIL = "\nDROP(0)\nTAKE(50)\nJSON(timeformat('ns.str'), tz('UTC'))";
const SHEET_TAIL = "\nMARKDOWN(html(true), rownum(true), heading(true), brief(false), timeformat('ns'), tz('UTC'))";

const basic = (env?: { bridge?: string; use?: string }) => sqlBasicFormatter('select * from example', 1, 'ns', 'UTC', SQL_BASE_LIMIT, env);

const sheet = (env?: { bridge?: string; use?: string }) =>
    sqlSheetFormatter({ aSql: 'select * from example', aBrief: false, bridge: env?.bridge, use: env?.use, aTimeFormat: 'ns', aTimeZone: 'UTC' });

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
    const csv = (env?: { bridge?: string; use?: string }, token: string | null = 'tok-123') =>
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
    const chart = (env?: { bridge?: string; use?: string }) => sqlBasicChartFormatter('select * from example', CHART_AXIS, env);

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
