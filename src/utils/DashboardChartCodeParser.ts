import { unitFormatter } from './Chart/formatters';
import { compareVersions } from './version/utils';

const ERR_COLOR = '#fa6464';
const ERR_FONT_SIZE = '16';
const ERR_FONT_FAMILY = 'Pretendard';
/** SYNTAX_ERR */
const SYNTAX_ERR = (trigger: string, position: 'top' | 'center' | 'bottom') => {
    return `if (${trigger}) {
        const isDuplicateError = sErr?.some((err) => err === obj?.reason);
        const sTknRegex = /token is expired by/i;
        const isTknExpired = sErr?.some((err) => err === sTknRegex(obj?.reason));
        if (!isDuplicateError && !isTknExpired) sErr?.push(obj?.reason);
        \t_chartOption.graphic = [{
        \t\ttype: 'text',
        \t\tleft: 'center',
        \t\ttop: '${position}',
        \t\tz: 100,
        \t\tstyle: {
        \t\t\ttext: sErr?.join('\\n'),
        \t\t\tfontSize: ${ERR_FONT_SIZE},
        \t\t\tfontWeight: 'normal',
        \t\t\tfontFamily: '${ERR_FONT_FAMILY}',
        \t\t\tfill: '${ERR_COLOR}',
        \t\t\twidth: _chart.getWidth() * 0.9,
        \t\t\toverflow: 'break'
        \t\t}
        \t}];
        \t_chartOption.series[aIdx].data = [];
        \t_chart.setOption(_chartOption)
        \treturn;
    } else {
        sErr = [];
        _chartOption.graphic = [{
        \t\ttype: 'text',
        \t\tleft: 'center',
        \t\ttop: '${position}',
        \t\tstyle: {
        \t\t\ttext: '',
        \t\t\tfontSize: ${ERR_FONT_SIZE},
        \t\t\tfontWeight: 'normal',
        \t\t\tfontFamily: '${ERR_FONT_FAMILY}',
        \t\t\tfill: '${ERR_COLOR}',
        \t\t\twidth: _chart.getWidth() * 0.9,
        \t\t\toverflow: 'break'
        \t\t}
        \t}];
        \t_chart.setOption(_chartOption);
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
/** NO DATA */
const NO_DATA = (trigger: string, position: 'top' | 'center' | 'bottom', aTime: { start: string; end: string }) => {
    return `
    if (${trigger}) {
        \t_chartOption.graphic = [{
        \t\ttype: 'text',
        \t\tleft: 'center',
        \t\ttop: '${position}',
        \t\tstyle: {
        \t\t\ttext: 'No data available\\n' + new Date(${aTime.start}).toLocaleString('en-GB') + ' ~ ' + new Date(${aTime.end}).toLocaleString('en-GB'),
        \t\t\tfontSize: ${ERR_FONT_SIZE},
        \t\t\tfontWeight: 'normal',
        \t\t\tfontFamily: '${ERR_FONT_FAMILY}',
        \t\t\ttextAlign: 'center',
        \t\t\tfill: '${ERR_COLOR}',
        \t\t\twidth: _chart.getWidth() * 0.9,
        \t\t\toverflow: 'break'
        \t\t}
        \t}];
        \t_chartOption.series[aIdx].data = [];
        \t_chart.setOption(_chartOption)
        \treturn;
    } else {
        sErr = [];
        _chartOption.graphic = [{
        \t\ttype: 'text',
        \t\tleft: 'center',
        \t\ttop: '${position}',
        \t\tstyle: {
        \t\t\ttext: '',
        \t\t\tfontSize: ${ERR_FONT_SIZE},
        \t\t\tfontWeight: 'normal',
        \t\t\tfontFamily: '${ERR_FONT_FAMILY}',
        \t\t\tfill: '${ERR_COLOR}',
        \t\t\twidth: _chart.getWidth() * 0.9,
        \t\t\toverflow: 'break'
        \t\t}
        \t}];
        \t_chart.setOption(_chartOption);
    };`;
};
/** NAME_VALUE func */
const NameValueFunc = (aChartType: string, aChartOptions: any, aVersion: string, aTime: { start: string; end: string }) => {
    const sIsGauge = aChartType === 'gauge';
    const sPosition = sIsGauge || aChartType === 'pie' ? 'bottom' : 'center';
    const sVersion = compareVersions(aVersion, '1.0.1');
    let sUnit = aChartOptions?.unit;
    let sDigit = aChartOptions?.digit;
    let sAxis = `{ ..._chartOption.series[0], data: sData }`;
    if (sVersion < 0) {
        sUnit = { suffix: aChartOptions?.unit ?? '' };
        if (sIsGauge) sDigit = aChartOptions?.gaugeValueLimit;
    }
    const sFormatter = unitFormatter(sUnit, sDigit);
    if (sVersion >= 0 && sIsGauge) sAxis = `{ ..._chartOption.series[0], axisLabel: {..._chartOption.series[0], formatter: ${sFormatter.formatter}}, data: sData }`;
    const sGaugeNaNFormatter = `if (isNaN(Number.parseFloat(obj?.data?.rows?.[0]?.[0].value))) {_chartOption.series[0].detail.formatter = function (value) {return 'No-data'}} else {_chartOption.series[0].detail.formatter = ${sFormatter.formatter}}`;
    return `(obj) => {
        \t${SYNTAX_ERR('!obj.success', sPosition)}
        \t${NO_DATA('!(obj?.data?.rows?.[0]?.[0]?.value)', sPosition, aTime)}
        \t\t${sIsGauge && sGaugeNaNFormatter}
        \t\tsData[aIdx] = obj?.data?.rows?.[0]?.[0] ?? 0;
        \t\tsCount += 1;
        \t\t_chartOption.series[0] = ${sAxis};
        \t\tif (sCount === sQuery.length) _chart.setOption(_chartOption);
        \t}`;
};

enum E_THRESHOLD_POSITION {
    left = 0,
    right = 1,
}
/** TIME_VALUE func */
const TimeValueFunc = (aTime: { start: string; end: string }, aYAxisOptions: any) => {
    const sThresholdList: { value: number; color: string; yIdx: number }[] = [];

    aYAxisOptions?.forEach((yOpt: any) => {
        if (yOpt?.thresholds) {
            yOpt.thresholds.forEach((threshold: any) => {
                sThresholdList.push({ ...threshold, yIdx: E_THRESHOLD_POSITION[yOpt.position] });
            });
        }
    });

    const sThresholdCode =
        sThresholdList.length > 0
            ? `
        sCount++;
        if (sCount >= sQuery.length) {
            var sThresholds = ${JSON.stringify(sThresholdList)};
            var gridRect = _chart.getModel().getComponent('grid').coordinateSystem.getRect();
            var sGraphics = [];
            sThresholds.forEach(function(t, idx) {
                var yPixel = _chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: t.yIdx }, [0, t.value])[1];
                sGraphics.push({
                    id: 'threshold-line-' + idx,
                    type: "line",
                    shape: { x1: gridRect.x, y1: yPixel, x2: gridRect.x + gridRect.width, y2: yPixel },
                    style: { stroke: t.color, lineWidth: 1.5, lineDash: [5] }
                });
            });
            _chart.setOption({ graphic: sGraphics });
        }`
            : '';

    return `(obj) => {
       \t${SYNTAX_ERR('!obj.success', 'center')}
       \t\tif (sQuery?.[aIdx]?.alias === '') _chartOption.series[aIdx].name = obj?.data?.columns?.[1];
       \t${NO_DATA('obj?.data?.rows?.length <= 0', 'center', aTime)}
        \t\t_chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t\t${sThresholdCode}
        \t}`;
};
/** LIQUIDFILL NAME_VALUE func */
const LiquidNameValueFunc = (aChartOptions: any, aVersion: string, aTime: { start: string; end: string }) => {
    let sUnit = aChartOptions?.unit;
    if (compareVersions(aVersion, '1.0.1') < 0) sUnit = { suffix: aChartOptions?.unit ?? '' };
    const sFormatter = unitFormatter(sUnit, aChartOptions?.digit);
    return `(obj) => {
        \t${SYNTAX_ERR('!obj.success', 'bottom')}
        \t\tconst unitFormatter = ${sFormatter.formatter};
        \t\t${NO_DATA('!(obj?.data?.rows?.[0]?.[0]?.value)', 'bottom', aTime)}
        \t\tlet sValue = obj?.data?.rows?.[0]?.[0]?.value;
        \t\t_chartOption.series[aIdx].data = sValue ? [ (sValue - ${aChartOptions.minData}) / ( ${aChartOptions.maxData} -  ${aChartOptions.minData}) ] : 'No-data';
        \t\t_chartOption.series[aIdx].label.formatter = function() {
        \t\t\tif (isNaN(Number.parseFloat(sValue))) return 'No-data';
        \t\t\telse return unitFormatter(sValue)
        \t\t}
        \t\t_chart.setOption(_chartOption)}`;
};
/** TEXT func */
const TextFunc = (aChartOptions: any, aVersion: string, aTime: { start: string; end: string }, aPanelId?: string) => {
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
        var sTime = {start: ${aTime.start}, end: ${aTime.end}};
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
        \t\t\t\tvar sValue = obj?.data?.rows?.[0]?.[0]?.value ? unitFormatter(obj?.data?.rows?.[0]?.[0]?.value) : '';
        \t\t\t\tvar sColor = setColor(sValue);
        \t\t\t\tif (!obj?.data?.rows?.[0]?.[0]?.value) {sValue = 'No data available\\n' + new Date(${aTime.start}).toLocaleString('en-GB') + ' ~ ' + new Date(${
        aTime.end
    }).toLocaleString('en-GB'); 
    sFontSize = ${ERR_FONT_SIZE}; 
    sColor = '${ERR_COLOR}'; 
    sDOM.style.textAlign = 'center';
    } else sDOM.style.textAlign = 'start';
        \t\t\t\tsDOM.style.fontSize = sFontSize + 'px';
        \t\t\t\tsDOM.style.color = sColor;
        \t\t\t\tsDOM.innerText = sValue ?? 'no-data';
        \t\t\t};
        \t\t}
        \t}`;
};
/** GEOMAP func */
const Geomapfunc = (aChartOptions: any, aTime: { start: string; end: string }) => {
    const sTooltipContents =
        aChartOptions.tooltipTime || aChartOptions.tooltipCoor
            ? `tooltip: {
        content: ${aChartOptions.tooltipTime ? `'<b>' + new Date(row[0]).toLocaleString('en-GB') + '</b>' + '<br/>'` : ''}${
                  aChartOptions.tooltipTime && aChartOptions.tooltipCoor ? ` + ` : ''
              }${aChartOptions.tooltipCoor ? `'<b>' + 'lat: ' + row[columnIdxList[idx][0] + 1] + '</b>' + '<br/>' + '<b>' + 'lon: ' + row[columnIdxList[idx][1] + 1] + '</b>'` : ''}
    },`
            : undefined;
    // marker | circleMarker | circle | polyline | polygon
    return `var hasData = false;
    var sTime = {start: ${aTime.start}, end: ${aTime.end}};

    function finalize() {
        queryList.forEach(function (query, idx) {
            var rows = $.db().query(query.sql);
            
            if (rows) {
                rows.forEach(function (row) {
                    hasData = true;
                    var tmpCoordinates = [];
                    if (row) tmpCoordinates = [row[columnIdxList[idx][0] + 1], row[columnIdxList[idx][1] + 1]];

                    $.yield({
                        type: shapeList[idx],
                        coordinates: tmpCoordinates,
                        properties: {
                             ${sTooltipContents ?? ''}
                            color: colorList[idx],
                            radius: radiusList[idx]
                        }
                    });
                });
            }

            if (!hasData) {
                $.yield({
                    type: "marker",
                    coordinates: [37.4856729, 126.8954779],
                    properties: {
                        tooltip: {
                            content: '<div style="background:#fff; padding: 4px 14px; border-radius:4px; text-align:center; max-width:90vw; word-break:break-word;">' +
                                    '<span style="color:${ERR_COLOR}; font-size:${ERR_FONT_SIZE}px; font-family:${ERR_FONT_FAMILY};">No data available</span><br/>' +
                                    '<span style="color:#64748b; font-size:${ERR_FONT_SIZE}px; font-family:${ERR_FONT_FAMILY}; display:inline-block; max-width:100%;">' + new Date(sTime.start).toLocaleString('en-GB') + ' ~ ' + new Date(sTime.end).toLocaleString('en-GB') + '</span>' +
                                    '</div>',
                            permanent: true,
                            direction: 'center'
                        },
                        color: 'transparent',
                        fillOpacity: 0,
                        radius: 0
                    }
                });
            }
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

export const DashboardChartCodeParser = (
    aChartOptions: any,
    aChartType: string,
    aParsedQuery: any,
    aPanelVersion: string,
    isSave: boolean = false,
    aPanelId?: string,
    aYAxisOptions?: any
) => {
    const sDataType = aParsedQuery[0]?.dataType ?? 'TIME_VALUE';
    const sAccToken = localStorage.getItem('accessToken');
    const sXConsoleId = localStorage.getItem('consoleId');
    let sInjectFunc = null;

    if (aChartType === 'geomap') return Geomapfunc(aChartOptions, aParsedQuery[0]?.time);
    else if (aChartType === 'text') sInjectFunc = TextFunc(aChartOptions, aPanelVersion, aParsedQuery[0]?.time, aPanelId);
    else if (aChartType === 'advScatter') sInjectFunc = AdvScatterFunc();
    else {
        if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc(aParsedQuery[0]?.time, aYAxisOptions);
        if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc(aChartType, aChartOptions, aPanelVersion, aParsedQuery[0]?.time);
        if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidNameValueFunc(aChartOptions, aPanelVersion, aParsedQuery[0]?.time);
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
