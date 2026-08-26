import { fixedEncodeURIComponent } from './utils';

export const SQL_BASE_LIMIT = 50;

export interface STATEMENT_TYPE {
    beginLine: number;
    endLine: number;
    env: {
        bridge?: string;
        use?: string;
        error?: string;
    };
    isComment: boolean;
    text: string;
}

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

// ns/us timestamps exceed Number.MAX_SAFE_INTEGER; '.str' makes the backend emit them as strings to preserve precision through JSON.parse.
const toJsonSinkTimeFormat = (aFormat: string) => (aFormat === 'ns' || aFormat === 'us' ? `${aFormat}.str` : aFormat);

/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 * @argument env        { bridge?: string; use?: string }; // `-- env:` directive parsed by the splitter
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string, aTake: number | undefined = SQL_BASE_LIMIT, env?: { bridge?: string; use?: string }) => {
    const bridgeText = env?.bridge ? `bridge('${env.bridge}'),` : '';
    const useText = env?.use ? `use('${env.use}'),` : '';
    return (
        'SQL(' +
        bridgeText +
        useText +
        '`' +
        aSql +
        '`)\n' +
        'DROP(' +
        (aLimit * SQL_BASE_LIMIT - SQL_BASE_LIMIT) +
        `)\nTAKE(${aTake})\nJSON(timeformat('` +
        toJsonSinkTimeFormat(aFormat) +
        `'), tz('` +
        aTimezone +
        `'))`
    );
};

export const sqlSheetFormatter = ({ aSql, aBrief, bridge, use, aTimeFormat, aTimeZone }: { aSql: string; aBrief: boolean; bridge?: string; use?: string; aTimeFormat: string; aTimeZone: string }) => {
    const bridgeText = bridge ? `bridge('${bridge}'),` : '';
    const useText = use ? `use('${use}'),` : '';
    return 'SQL(' + bridgeText + useText + '`' + aSql + '`)\n' + `MARKDOWN(html(true), rownum(true), heading(true), brief(${aBrief}), timeformat('${aTimeFormat}'), tz('${aTimeZone}'))`;
};

/** sqlCsvDownloadUrl
 * Builds the `/web/api/tql-exec` CSV download URL used by the SQL editor.
 * Unlike the formatters above this path assembles the TQL inside a URL, so every
 * segment is percent-encoded and the TQL string literals use double quotes.
 * @argument aUrl         string;  // endpoint origin + path
 * @argument aSql         string;  // raw sql statement (encoded here)
 * @argument aTimeFormat  string;
 * @argument aTimeZone    string;
 * @argument aToken       string | null;
 * @argument env          { bridge?: string; use?: string }; // `-- env:` directive parsed by the splitter
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
    env?: { bridge?: string; use?: string };
}) => {
    const bridgeText = env?.bridge ? encodeURI(`bridge("`) + fixedEncodeURIComponent(env.bridge) + encodeURI(`"),`) : '';
    const useText = env?.use ? encodeURI(`use("`) + fixedEncodeURIComponent(env.use) + encodeURI(`"),`) : '';
    const sEncodedText = fixedEncodeURIComponent(aSql);
    return (
        encodeURI(`${aUrl}?$=SQL(`) +
        bridgeText +
        useText +
        encodeURI(`\u0060`) +
        sEncodedText +
        encodeURI(`\u0060)\u000ACSV(timeformat("${aTimeFormat}"), tz("${aTimeZone}"), httpHeader("Content-Disposition", "attachment"), heading(true))\u0026$token=${aToken}`)
    );
};

const Animation = `"animation": false`;
const DataZoom = `"dataZoom": [{"type": "slider","end": 100}]`;
const Color = `"color": ["#5470c6","#91cc75","#fac858","#ee6666","#73c0de","#3ba272","#fc8452","#9a60b4","#ea7ccc"]`;
const Legend = `"legend": {"show": true,"type": ""}`;
const Title = `"title": {}`;
const Tooltip = `"tooltip": {"show": true,"trigger": "axis","axisPointer": {"type": "cross","show": false}}`;

/** sqlBasicChartFormatter
 * @argument aSql   string;
 * @argument aAxis  { x, y, xIndex, yIndex, list };
 * @argument env    { bridge?: string; use?: string }; // `-- env:` directive parsed by the splitter
 */
export const sqlBasicChartFormatter = (aSql: string, aAxis?: { x: string; y: string; xIndex: number; yIndex: number; list: string[] }, env?: { bridge?: string; use?: string }) => {
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
        '`)\n' +
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
