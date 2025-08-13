/** NAME_VALUE func */
const NameValueFunc = (aChartType: string) => {
    const sIsGauge = aChartType === 'gauge';
    const sGaugeNaNFormatter = `if (isNaN(Number.parseFloat(obj.data.rows[0][0].value))) {_chartOption.series[0].detail.formatter = function (value) {return 'No-data'}}`;
    return `(obj) => {
        \t\t${sIsGauge && sGaugeNaNFormatter}
        \t\tsData[aIdx] = obj.data.rows?.[0]?.[0] ?? 0;
        \t\tsCount += 1;
        \t\t_chartOption.series[0] = { ..._chartOption.series[0], data: sData };
        \t\tif (sCount === sQuery.length) _chart.setOption(_chartOption);
        \t}`;
};
/** TIME_VALUE func */
const TimeValueFunc = () => {
    return `(obj) => {
        \t\tif (sQuery?.[aIdx]?.alias === '') _chartOption.series[aIdx].name = obj?.data?.columns?.[1];
        \t\t_chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t}`;
};
/** LIQUIDFILL NAME_VALUE func */
const LiquidNameValueFunc = (aChartOptions: any) => {
    return `(obj) => {
        \t\tlet sValue = obj.data.rows[0][0].value;
        \t\t_chartOption.series[aIdx].data = [ (sValue - ${aChartOptions.minData}) / ( ${aChartOptions.maxData} -  ${aChartOptions.minData}) ]
        \t\t_chartOption.series[aIdx].label.formatter = function() {
        \t\t\tif (isNaN(Number.parseFloat(sValue))) return 'No-data';
        \t\t\telse return Number.parseFloat(sValue).toFixed(${aChartOptions.digit}) + "${aChartOptions.unit}";
        \t\t}
        \t\t_chart.setOption(_chartOption)}`;
};
/** TEXT func */
const TextFunc = (aChartOptions: any, aPanelId?: string) => {
    const tmpColorSet = JSON.parse(JSON.stringify(aChartOptions.color));
    const tmpPop = tmpColorSet.shift();
    tmpColorSet.sort((a: any, b: any) => parseFloat(b[0]) - parseFloat(a[0]));
    tmpColorSet.push(tmpPop);
    const colorInjectTxt = tmpColorSet.map((aChartOption: any, aIdx: number) => {
        if (aChartOption[0] === 'default') return `${aIdx === 0 ? '' : 'else '}return '${aChartOption[1]}';`;
        if (aIdx === 0) return `if (aValue > ${parseInt(aChartOption[0])}) return '${aChartOption[1]}';`;
        else return `else if (aValue > ${parseInt(aChartOption[0])}) return '${aChartOption[1]}';`;
    });
    return `(obj) => {
        \t\tconst setColor = (aValue) => {
        \t\t\t${colorInjectTxt.join('')}
        \t\t}
        \t\tif (aIdx === 1) {
        \t\t\t_chartOption.series[0].data = obj?.data?.rows ?? [];
        \t\t\t_chart.setOption(_chartOption);
        \t\t} else {
        \t\t\tconst sDOM = document.getElementById('${aPanelId}-text');
        \t\t\tif (sDOM) {
        \t\t\t\tvar sFontSize = ${aChartOptions?.fontSize ?? 100};
        \t\t\t\tconst sValue = obj?.data?.rows[0]?.[0]?.value ? obj?.data?.rows[0]?.[0]?.value.toFixed(${aChartOptions?.digit ?? ''}) : '';
        \t\t\t\tconst sColor = setColor(sValue);
        \t\t\t\tsDOM.style.color = sColor;
        \t\t\t\tsDOM.style.fontSize = sFontSize + 'px';
        \t\t\t\tsDOM.innerText = isNaN(sValue) ? 'no-data' : sValue${aChartOptions?.unit ? ' +"' + aChartOptions.unit + '"' : ''};
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
        \t\tif (sQuery?.[aIdx]?.alias === '') _chartOption.series[aIdx].name = obj?.data?.columns?.[1];
        \t\t_chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t}`;
};

export const DashboardChartCodeParser = (aChartOptions: any, aChartType: string, aParsedQuery: any, isSave: boolean = false, aPanelId?: string) => {
    const sDataType = aParsedQuery[0]?.dataType ?? 'TIME_VALUE';
    const sAccToken = localStorage.getItem('accessToken');
    const sXConsoleId = localStorage.getItem('consoleId');
    let sInjectFunc = null;

    if (aChartType === 'geomap') return Geomapfunc(aChartOptions);
    else if (aChartType === 'text') sInjectFunc = TextFunc(aChartOptions, aPanelId);
    else if (aChartType === 'advScatter') sInjectFunc = AdvScatterFunc();
    else {
        if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc();
        if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc(aChartType);
        if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidNameValueFunc(aChartOptions);
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
        let sCount = 0;
        ${sFunction}
        ${sLoop}
    }`;
};
