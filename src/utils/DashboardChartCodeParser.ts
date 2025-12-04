import { unitFormatter } from './Chart/formatters';
import { compareVersions } from './version/utils';

const ERR_COLOR = '#fa6464';
const ERR_FONT_SIZE = '18';
/** SYNTAX_ERR */
const SYNTAX_ERR = (trigger: string, position: 'top' | 'center' | 'bottom') => {
    return `if (${trigger}) {
        const isDuplicateError = sErr?.some((err) => err === obj?.reason);
        if (!isDuplicateError) sErr?.push(obj?.reason)
        \t_chartOption.graphic = [{
        \t\ttype: 'text',
        \t\tleft: 'center',
        \t\ttop: '${position}',
        \t\tstyle: {
        \t\t\ttext: sErr?.join('\\n'),
        \t\t\tfontSize: ${ERR_FONT_SIZE},
        \t\t\tfontWeight: 'normal',
        \t\t\tfill: '${ERR_COLOR}',
        \t\t\twidth: _chart.getWidth() * 0.9,
        \t\t\toverflow: 'break'
        \t\t}
        \t}];
        \t_chart.setOption(_chartOption)
        \treturn;
    }`;
};
/** SYNTAX_ERR_TEXT */
const SYNTAX_ERR_TEXT = (aPanelId?: string) => {
    return `\t\t\t\tif (!obj?.success) {
        \t\t\t\t\tconst sDOM = document.getElementById('${aPanelId}-text');
        \t\t\t\t\tif (sDOM) {
        \t\t\t\t\t\tsDOM.innerText = obj?.reason ?? '';
        \t\t\t\t\t\tsDOM.style.color = '${ERR_COLOR}';
        \t\t\t\t\t\tsDOM.style.fontSize = ${ERR_FONT_SIZE} + 'px';
        \t\t\t\t\t\treturn;
        \t\t\t\t\t}
        \t\t\t\t}`;
};

/** NAME_VALUE func */
const NameValueFunc = (aChartType: string, aChartOptions: any, aVersion: string) => {
    const sIsGauge = aChartType === 'gauge';
    const sPosition = sIsGauge || aChartType === 'pie' ? 'bottom' : 'center';
    let sUnit = aChartOptions?.unit;
    let sDigit = aChartOptions?.digit;
    if (compareVersions(aVersion, '1.0.1') < 0) {
        sUnit = { suffix: aChartOptions?.unit ?? '' };
        if (sIsGauge) sDigit = aChartOptions?.gaugeValueLimit;
    }
    const sFormatter = unitFormatter(sUnit, sDigit);
    const sGaugeNaNFormatter = `if (isNaN(Number.parseFloat(obj?.data?.rows?.[0]?.[0].value))) {_chartOption.series[0].detail.formatter = function (value) {return 'No-data'}} else {_chartOption.series[0].detail.formatter = ${sFormatter.formatter}}`;
    return `(obj) => {
        \t${SYNTAX_ERR('!obj.success', sPosition)}
        \t\t${sIsGauge && sGaugeNaNFormatter}
        \t\tsData[aIdx] = obj?.data?.rows?.[0]?.[0] ?? 0;
        \t\tsCount += 1;
        \t\t_chartOption.series[0] = { ..._chartOption.series[0], data: sData };
        \t\tif (sCount === sQuery.length) _chart.setOption(_chartOption);
        \t}`;
};
/** TIME_VALUE func */
const TimeValueFunc = () => {
    return `(obj) => {
       \t${SYNTAX_ERR('!obj.success', 'center')}
        \t\tif (sQuery?.[aIdx]?.alias === '') _chartOption.series[aIdx].name = obj?.data?.columns?.[1];
        \t\t_chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t}`;
};
/** LIQUIDFILL NAME_VALUE func */
const LiquidNameValueFunc = (aChartOptions: any, aVersion: string) => {
    let sUnit = aChartOptions?.unit;
    if (compareVersions(aVersion, '1.0.1') < 0) sUnit = { suffix: aChartOptions?.unit ?? '' };
    const sFormatter = unitFormatter(sUnit, aChartOptions?.digit);
    return `(obj) => {
        \t${SYNTAX_ERR('!obj.success', 'bottom')}
        \t\tconst unitFormatter = ${sFormatter.formatter};
        \t\tlet sValue = obj?.data?.rows?.[0]?.[0]?.value;
        \t\t_chartOption.series[aIdx].data = [ (sValue - ${aChartOptions.minData}) / ( ${aChartOptions.maxData} -  ${aChartOptions.minData}) ]
        \t\t_chartOption.series[aIdx].label.formatter = function() {
        \t\t\tif (isNaN(Number.parseFloat(sValue))) return 'No-data';
        \t\t\telse return unitFormatter(sValue)
        \t\t}
        \t\t_chart.setOption(_chartOption)}`;
};
/** TEXT func */
const TextFunc = (aChartOptions: any, aVersion: string, aPanelId?: string) => {
    const tmpColorSet = JSON.parse(JSON.stringify(aChartOptions.color));
    const tmpPop = tmpColorSet.shift();
    tmpColorSet.sort((a: any, b: any) => parseFloat(b[0]) - parseFloat(a[0]));
    tmpColorSet.push(tmpPop);
    const colorInjectTxt = tmpColorSet.map((aChartOption: any, aIdx: number) => {
        if (aChartOption[0] === 'default') return `${aIdx === 0 ? '' : 'else '}return '${aChartOption[1]}';`;
        if (aIdx === 0) return `if (aValue > ${parseInt(aChartOption[0])}) return '${aChartOption[1]}';`;
        else return `else if (aValue > ${parseInt(aChartOption[0])}) return '${aChartOption[1]}';`;
    });
    let sUnit = aChartOptions?.unit;
    if (compareVersions(aVersion, '1.0.1') < 0) sUnit = { suffix: aChartOptions?.unit ?? '' };
    const sFormatter = unitFormatter(sUnit, aChartOptions?.digit);
    return `(obj) => {
        \t\tconst setColor = (aValue) => {
        \t\t\t${colorInjectTxt.join('')}
        \t\t}
        \t\tconst unitFormatter = ${sFormatter.formatter};
        \t\t${SYNTAX_ERR_TEXT(aPanelId)}
        \t\tif (aIdx === 1) {
        \t\t\t_chartOption.series[0].data = obj?.data?.rows ?? [];
        \t\t\t_chart.setOption(_chartOption);
        \t\t} else {
        \t\t\tconst sDOM = document.getElementById('${aPanelId}-text');
        \t\t\tif (sDOM) {
        \t\t\t\tvar sFontSize = ${aChartOptions?.fontSize ?? 100};
        \t\t\t\tconst sValue = obj?.data?.rows[0]?.[0]?.value ? unitFormatter(obj?.data?.rows[0]?.[0]?.value) : '';
        \t\t\t\tconst sColor = setColor(sValue);
        \t\t\t\tsDOM.style.color = sColor;
        \t\t\t\tsDOM.style.fontSize = sFontSize + 'px';
        \t\t\t\tsDOM.innerText = sValue ?? 'no-data';
        \t\t\t};
        \t\t}
        \t}`;
};
/** GEOMAP func */
const Geomapfunc = (aChartOptions: any) => {
    const sTooltipContents =
        aChartOptions.tooltipTime || aChartOptions.tooltipCoor
            ? `tooltip: {
        content: ${aChartOptions.tooltipTime ? `'<b>' + new Date(row[0]).toLocaleString('en-GB') + '</b>' + '<br/>'` : ''}${
                  aChartOptions.tooltipTime && aChartOptions.tooltipCoor ? ` + ` : ''
              }${aChartOptions.tooltipCoor ? `'<b>' + 'lat: ' + row[columnIdxList[idx][0] + 1] + '</b>' + '<br/>' + '<b>' + 'lon: ' + row[columnIdxList[idx][1] + 1] + '</b>'` : ''}
    },`
            : undefined;
    // marker | circleMarker | circle | polyline | polygon
    return `function finalize() {
        queryList.forEach(function (query, idx) {
            $.db().query(query.sql).forEach( function (row) {
                $.yield({
                    type: shapeList[idx],
                    coordinates: [row[columnIdxList[idx][0] + 1], row[columnIdxList[idx][1] + 1]],
                    properties: {
                        ${sTooltipContents ?? ''}
                        color: colorList[idx],
                        radius: radiusList[idx]
                    }
                });
            })
        })
    }`;
};

/** ADV SCATTER func*/
const AdvScatterFunc = () => {
    return `(obj) => {
        \t\t${SYNTAX_ERR('!obj.success', 'center')}
        \t\tif (sQuery?.[aIdx]?.alias === '') _chartOption.series[aIdx].name = obj?.data?.columns?.[1];
        \t\t_chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t}`;
};

export const DashboardChartCodeParser = (aChartOptions: any, aChartType: string, aParsedQuery: any, aPanelVersion: string, isSave: boolean = false, aPanelId?: string) => {
    const sDataType = aParsedQuery[0]?.dataType ?? 'TIME_VALUE';
    const sAccToken = localStorage.getItem('accessToken');
    const sXConsoleId = localStorage.getItem('consoleId');
    let sInjectFunc = null;

    if (aChartType === 'geomap') return Geomapfunc(aChartOptions);
    else if (aChartType === 'text') sInjectFunc = TextFunc(aChartOptions, aPanelVersion, aPanelId);
    else if (aChartType === 'advScatter') sInjectFunc = AdvScatterFunc();
    else {
        if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc();
        if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc(aChartType, aChartOptions, aPanelVersion);
        if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidNameValueFunc(aChartOptions, aPanelVersion);
    }
    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            query: `${aQuery.query}`,
            idx: aQuery.idx,
            alias: aQuery.alias,
        };
    });

    // GEN func
    const sFunction = `function getData(aTql, aIdx) {
        \tfetch("${window.location.origin}/${isSave ? 'db' : 'web/api'}/tql", {
            \tmethod: "POST",
            \theaders: {"Accept": "application/json, text/plain, */*", "Content-Type": "text/plain" ${
                isSave ? '' : `, "Authorization": "Bearer ${sAccToken}", "X-Console-Id": "${sXConsoleId}, console-log-level=NONE"`
            }},
            \tbody: aTql
        \t})
        \t.then((rsp) => rsp.json())
        \t.then(${sInjectFunc})
        \t.catch((err) => console.warn("data fetch error", err));
        };`;
    // GEN loop
    const sLoop = `sQuery.forEach((aData, idx) => {\n` + `\t\t\tgetData(aData.query, idx);\n` + `\t\t});`;

    return `{
        let sQuery = ${JSON.stringify(sDynamicVariable)};
        let sData = [];
        let sErr = [];
        let sCount = 0;
        ${sFunction}
        ${sLoop}
    }`;
};
