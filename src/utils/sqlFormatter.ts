export const SQL_BASE_LIMIT = 50;

export interface STATEMENT_TYPE {
    beginLine: number;
    endLine: number;
    env: {
        bridge?: string;
        error?: string;
    };
    isComment: boolean;
    text: string;
}

/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string, aTake: number | undefined = SQL_BASE_LIMIT, bridge?: string) => {
    const bridgeText = bridge ? `bridge('${bridge}'),` : '';
    return (
        'SQL(' +
        bridgeText +
        '`' +
        aSql +
        '`)\n' +
        'DROP(' +
        (aLimit * SQL_BASE_LIMIT - SQL_BASE_LIMIT) +
        `)\nTAKE(${aTake})\nJSON(timeformat('` +
        aFormat +
        `'), tz('` +
        aTimezone +
        `'))`
    );
};

export const sqlSheetFormatter = ({ aSql, aBrief, bridge, aTimeFormat, aTimeZone }: { aSql: string; aBrief: boolean; bridge?: string; aTimeFormat: string; aTimeZone: string }) => {
    const bridgeText = bridge ? `bridge('${bridge}'),` : '';
    return 'SQL(' + bridgeText + '`' + aSql + '`)\n' + `MARKDOWN(html(true), rownum(true), heading(true), brief(${aBrief}), timeformat('${aTimeFormat}'), tz('${aTimeZone}'))`;
};

const Animation = `"animation": false`;
const DataZoom = `"dataZoom": [{"type": "slider","end": 100}]`;
const Color = `"color": ["#5470c6","#91cc75","#fac858","#ee6666","#73c0de","#3ba272","#fc8452","#9a60b4","#ea7ccc"]`;
const Legend = `"legend": {"show": true,"type": ""}`;
const Title = `"title": {}`;
const Tooltip = `"tooltip": {"show": true,"trigger": "axis","axisPointer": {"type": "cross","show": false}}`;

export const sqlBasicChartFormatter = (aSql: string, aAxis?: { x: string; y: string; xIndex: number; yIndex: number; list: string[] }) => {
    const sSeries = aAxis?.list
        .map((colName: string, aIdx: number) => {
            if (colName !== aAxis?.x) return `{"name": "${colName}", "type": "line", "data": column(${aIdx})}`;
        })
        .filter((aItem: any) => aItem);

    return (
        'SQL(`' +
        aSql +
        '`)\n' +
        'TAKE(5000)\n' +
        `CHART(
            theme("dark"),
            chartOption({
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
