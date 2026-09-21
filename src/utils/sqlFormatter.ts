import { fixedEncodeURIComponent } from './utils';

export const SQL_BASE_LIMIT = 50;

export interface STATEMENT_TYPE {
    beginLine: number;
    endLine: number;
    env: {
        bridge?: string;
        use?: string;
        /** `-- env: named.<key>=<value>` pairs, bound as query parameters. Values are text. */
        named?: Record<string, string>;
        /** `-- env: timeformat=<value>` — overrides the toolbar's time format for this statement. */
        timeformat?: string;
        /** `-- env: tz=<value>` — overrides the toolbar's time zone for this statement. */
        tz?: string;
        /** `-- env: binaryformat=<value>` — no toolbar equivalent, so it is written only when set. */
        binaryformat?: string;
        error?: string;
    };
    isComment: boolean;
    text: string;
}

/**
 * The one `env` type, for every consumer.
 *
 * The builders below used to declare an inline `{ bridge?, use?, named? }` each, four copies of the
 * same shape, and `sqlTargetDatabase` a fifth. That is precisely why `timeformat`, `tz` and
 * `binaryformat` could be parsed by the splitter and then vanish on the way to the sink (#1532):
 * nothing tied the copies together, so widening one taught the compiler nothing about the others.
 * One exported alias means a field added here has to be answered for everywhere it flows.
 */
export type SqlStatementEnv = STATEMENT_TYPE['env'];

/** envDirectiveWarning
 * The splitter (`sql.split`) reports every `-- env:` directive it could not apply through
 * `env.error` — an older server that does not know `use=` answers `unknown env: use`.
 * The statement itself still runs (only the directive is dropped), so this is a warning,
 * never a reason to block execution.
 * @argument aStatements  statements returned by the splitter
 * @returns one line joining the distinct errors, or null when every directive was applied
 */
export const envDirectiveWarning = (aStatements?: readonly { env?: { error?: string } | null }[] | null): string | null => {
    if (!aStatements || aStatements.length === 0) return null;
    const sReasons: string[] = [];
    aStatements.forEach((aStatement) => {
        const sReason = aStatement?.env?.error;
        if (sReason && !sReasons.includes(sReason)) sReasons.push(sReason);
    });
    return sReasons.length === 0 ? null : `env directive ignored: ${sReasons.join(', ')}`;
};

/**
 * A TQL string literal, single-quoted with backslash escapes.
 *
 * That combination is not a style choice, it is the only one that works. Measured against the
 * engine: doubling the quote SQL-style (`'a''b'`) is rejected outright — *cannot transition
 * token types from STRING to STRING* — and a double-quoted literal escaping its own quote
 * (`"a\""`) is worse than rejected, it binds NULL with no error at all. `'a\'b'` is the form
 * that round-trips, and it matches how `bridge()` and `use()` are already written.
 */
const tqlSingleQuoted = (aValue: string) => `'${String(aValue ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * `named()` arguments, which unlike `bridge()` and `use()` follow the statement rather than
 * precede it — `SQL(use('db'), \`… :tag …\`, named('tag', 'x'))`.
 *
 * Values are always quoted, even numeric ones. The splitter reports every value as text and the
 * engine accepts text where a number is wanted: measured, `limit :one` bound to `'1'` returns
 * the same single row as `1`. So there is nothing to infer, and inferring would only risk
 * turning a tag named `007` into the number 7.
 *
 * A key lands in argument position rather than inside a literal, so anything that is not a
 * plain identifier is dropped rather than quoted — the same rule `use()` follows.
 */
const namedArguments = (aNamed?: Record<string, string>) =>
    Object.entries(aNamed ?? {})
        .filter(([aKey, aValue]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(aKey) && aValue !== undefined && aValue !== null)
        .map(([aKey, aValue]) => `, named('${aKey}', ${tqlSingleQuoted(aValue)})`)
        .join('');

// ns/us timestamps exceed Number.MAX_SAFE_INTEGER; '.str' makes the backend emit them as strings to preserve precision through JSON.parse.
const toJsonSinkTimeFormat = (aFormat: string) => (aFormat === 'ns' || aFormat === 'us' ? `${aFormat}.str` : aFormat);

/**
 * Which output settings a sink is written with: the statement's own `-- env:` first, the toolbar
 * next, and for `binaryformat` nothing at all.
 *
 * Resolved per option rather than as a block — `-- env: tz=Asia/Seoul` alone must not drag the
 * statement back to some default time format, it only moves the zone. An empty value counts as
 * absent, the same truthiness `bridge` and `use` are already read with, so `-- env: reset` falls
 * back to the toolbar instead of writing `tz('')`.
 *
 * `binaryformat` has no toolbar control, so it is returned undefined when the statement does not
 * ask for one and the callers leave the argument out entirely. That is what keeps the TQL
 * byte-identical for every statement without these directives — the regression the tests pin.
 */
const resolveOutputOptions = (env: SqlStatementEnv | undefined, aTimeFormat: string, aTimeZone: string): { timeformat: string; tz: string; binaryformat?: string } => ({
    timeformat: env?.timeformat || aTimeFormat,
    tz: env?.tz || aTimeZone,
    binaryformat: env?.binaryformat || undefined,
});

/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 * @argument env        SqlStatementEnv; // the `-- env:` directives the splitter parsed
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string, aTake: number | undefined = SQL_BASE_LIMIT, env?: SqlStatementEnv) => {
    const bridgeText = env?.bridge ? `bridge('${env.bridge}'),` : '';
    const useText = env?.use ? `use('${env.use}'),` : '';
    // The resolved format still goes through `toJsonSinkTimeFormat` below, not just the toolbar's:
    // a statement asking for `-- env: timeformat=ns` needs `ns.str` for exactly the reason the
    // toolbar does. Skipping it would not misformat the timestamps, it would silently round them.
    const sOutput = resolveOutputOptions(env, aFormat, aTimezone);
    const sBinaryFormat = sOutput.binaryformat ? `, binaryformat(${tqlSingleQuoted(sOutput.binaryformat)})` : '';
    return (
        'SQL(' +
        bridgeText +
        useText +
        '`' +
        aSql +
        '`' +
        namedArguments(env?.named) +
        ')\n' +
        'DROP(' +
        (aLimit * SQL_BASE_LIMIT - SQL_BASE_LIMIT) +
        `)\nTAKE(${aTake})\nJSON(timeformat(` +
        tqlSingleQuoted(toJsonSinkTimeFormat(sOutput.timeformat)) +
        `), tz(` +
        tqlSingleQuoted(sOutput.tz) +
        `)` +
        sBinaryFormat +
        `)`
    );
};

export const sqlSheetFormatter = ({
    aSql,
    aBrief,
    env,
    aTimeFormat,
    aTimeZone,
}: {
    aSql: string;
    aBrief: boolean;
    env?: SqlStatementEnv;
    aTimeFormat: string;
    aTimeZone: string;
}) => {
    const bridgeText = env?.bridge ? `bridge('${env.bridge}'),` : '';
    const useText = env?.use ? `use('${env.use}'),` : '';
    const sOutput = resolveOutputOptions(env, aTimeFormat, aTimeZone);
    // No `.str` rewrite here: that trick exists because JSON.parse rounds a number past
    // Number.MAX_SAFE_INTEGER, and MARKDOWN renders text.
    const sBinaryFormat = sOutput.binaryformat ? `, binaryformat(${tqlSingleQuoted(sOutput.binaryformat)})` : '';
    return (
        'SQL(' +
        bridgeText +
        useText +
        '`' +
        aSql +
        '`' +
        namedArguments(env?.named) +
        ')\n' +
        `MARKDOWN(html(true), rownum(true), heading(true), brief(${aBrief}), timeformat(${tqlSingleQuoted(sOutput.timeformat)}), tz(${tqlSingleQuoted(sOutput.tz)})${sBinaryFormat})`
    );
};

/**
 * A value about to be interpolated into a double-quoted TQL literal in the CSV url.
 *
 * The note on `tqlSingleQuoted` measured what happens to a double-quoted literal that tries to
 * escape its own quote: `"a\""` is not rejected, it binds NULL with no error at all. Silence is
 * worse than a parse failure here, so a quote is *removed* rather than escaped — a time format or
 * zone has no use for one, and dropping it keeps the download working instead of returning a file
 * full of nulls. Control characters go the same way: the whole TQL travels as one URL query value.
 *
 * The other literals in this url (`bridge`, `use`, `named`) are percent-encoded values that the
 * server decodes, which is why they need no such treatment; these three are spliced into the
 * template before `encodeURI` sees them.
 */
const tqlDoubleQuotedValue = (aValue: string) =>
    String(aValue ?? '')
        .split('')
        .filter((aChar) => aChar !== '"' && aChar.charCodeAt(0) >= 0x20 && aChar.charCodeAt(0) !== 0x7f)
        .join('');

/** sqlCsvDownloadUrl
 * Builds the `/web/api/tql-exec` CSV download URL used by the SQL editor.
 * Unlike the formatters above this path assembles the TQL inside a URL, so every
 * segment is percent-encoded and the TQL string literals use double quotes.
 * @argument aUrl         string;  // endpoint origin + path
 * @argument aSql         string;  // raw sql statement (encoded here)
 * @argument aTimeFormat  string;
 * @argument aTimeZone    string;
 * @argument aToken       string | null;
 * @argument env          SqlStatementEnv; // the `-- env:` directives the splitter parsed
 */
export const sqlCsvDownloadUrl = ({
    aUrl,
    aSql,
    aTimeFormat,
    aTimeZone,
    aToken,
    env,
}: {
    aUrl: string;
    aSql: string;
    aTimeFormat: string;
    aTimeZone: string;
    aToken: string | null;
    env?: SqlStatementEnv;
}) => {
    const bridgeText = env?.bridge ? encodeURI(`bridge("`) + fixedEncodeURIComponent(env.bridge) + encodeURI(`"),`) : '';
    const useText = env?.use ? encodeURI(`use("`) + fixedEncodeURIComponent(env.use) + encodeURI(`"),`) : '';
    // Single quotes here too. This path writes its other literals with double quotes, but a
    // double-quoted value cannot escape a quote of its own without binding NULL, so the named
    // arguments keep the form that round-trips.
    const sNamedText = Object.entries(env?.named ?? {})
        .filter(([aKey, aValue]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(aKey) && aValue !== undefined && aValue !== null)
        .map(([aKey, aValue]) => encodeURI(`, named('${aKey}', '`) + fixedEncodeURIComponent(String(aValue).replace(/\\/g, '\\\\').replace(/'/g, "\\'")) + encodeURI(`')`))
        .join('');
    const sEncodedText = fixedEncodeURIComponent(aSql);
    const sOutput = resolveOutputOptions(env, aTimeFormat, aTimeZone);
    const sTimeFormat = tqlDoubleQuotedValue(sOutput.timeformat);
    const sTimeZone = tqlDoubleQuotedValue(sOutput.tz);
    const sBinaryFormat = sOutput.binaryformat ? `, binaryformat("${tqlDoubleQuotedValue(sOutput.binaryformat)}")` : '';
    // These three stay inside the `encodeURI` template rather than moving to
    // `fixedEncodeURIComponent` like the values above: the default format is
    // `2006-01-02 15:04:05`, and component-encoding it would turn its colons into `%3A` and
    // rewrite every url the tests pin, for no gain the server asked for.
    return (
        encodeURI(`${aUrl}?$=SQL(`) +
        bridgeText +
        useText +
        encodeURI(`\u0060`) +
        sEncodedText +
        encodeURI(`\u0060`) +
        sNamedText +
        encodeURI(`)\u000ACSV(timeformat("${sTimeFormat}"), tz("${sTimeZone}"), httpHeader("Content-Disposition", "attachment"), heading(true)${sBinaryFormat})\u0026$token=${aToken}`)
    );
};

const Animation = `"animation": false`;
const DataZoom = `"dataZoom": [{"type": "slider","end": 100}]`;
const Color = `"color": ["#5470c6","#91cc75","#fac858","#ee6666","#73c0de","#3ba272","#fc8452","#9a60b4","#ea7ccc"]`;
const Legend = `"legend": {"show": true,"type": ""}`;
const Title = `"title": {}`;
const Tooltip = `"tooltip": {"show": true,"trigger": "axis","axisPointer": {"type": "cross","show": false}}`;

/** sqlBasicChartFormatter
 *
 * This one writes no `timeformat`, `tz` or `binaryformat`, and that is deliberate — do not "fix"
 * it by adding them.
 *
 * Measured, not assumed. Two runs of the CHART tab differing only in `tz` came back as
 * byte-identical JS assets carrying raw epoch millis (`_column_0=[1704164645000]`), and the server
 * binary confirms why: the CHART exporter implements none of the three setters. The only
 * `SetTimeformat` in that neighbourhood belongs to the legacy ChartW compatibility path. Writing
 * the arguments anyway would produce dead TQL — no effect on the drawing, and a shifted CHART
 * string for the regression tests to trip over.
 *
 * What does matter on this path is the source of the rows, `bridge`/`use`/`named`, and those are
 * SQL() arguments handled below. The chart is fed the merged `env` all the same, so the day the
 * exporter grows these setters the value is already here.
 *
 * @argument aSql   string;
 * @argument aAxis  { x, y, xIndex, yIndex, list };
 * @argument env    SqlStatementEnv; // the `-- env:` directives the splitter parsed
 */
export const sqlBasicChartFormatter = (aSql: string, aAxis?: { x: string; y: string; xIndex: number; yIndex: number; list: string[] }, env?: SqlStatementEnv) => {
    const sSeries = aAxis?.list
        .map((colName: string, aIdx: number) => {
            if (colName !== aAxis?.x) return `{"name": "${colName}", "type": "line", "data": column(${aIdx})}`;
        })
        .filter((aItem: any) => aItem);

    const bridgeText = env?.bridge ? `bridge('${env.bridge}'),` : '';
    const useText = env?.use ? `use('${env.use}'),` : '';

    return (
        'SQL(' +
        bridgeText +
        useText +
        '`' +
        aSql +
        '`' +
        namedArguments(env?.named) +
        ')\n' +
        'TAKE(5000)\n' +
        `CHART(
            theme("dark"),
            chartOption({
                backgroundColor: "#252525",
                ${Animation},
                ${DataZoom},
                ${Color},
                ${Legend},
                ${Title},
                ${Tooltip},
                "xAxis": {"name": "${aAxis?.x}", "type": "category", "data": column(${aAxis?.xIndex})}, 
                "yAxis": {"name": "${aAxis?.y}", "type": "value"},
                "series": [${sSeries}],
            })
        )`
    );
};
