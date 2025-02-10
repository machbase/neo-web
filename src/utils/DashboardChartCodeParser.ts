/** NAME_VALUE func */
const NameValueFunc = (aChartType: string) => {
    const sIsGauge = aChartType === 'gauge';
    const sGaugeNaNFormatter = `if (isNaN(Number.parseFloat(obj.data.rows[0][0].value))) {_chartOption.series[0].detail.formatter = function (value) {return 'No-data'}}`;
    return `(obj) => {
        \t\t${sIsGauge && sGaugeNaNFormatter}
        \t\tsData[aIdx] = obj.data.rows[0][0];
        \t\tsCount += 1;
        \t\t_chartOption.series[0] = { ..._chartOption.series[0], data: sData };
        \t\tif (sCount === sQuery.length) _chart.setOption(_chartOption);
        \t}`;
};
/** TIME_VALUE func */
const TimeValueFunc = () => {
    return `(obj) => {
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
const TextFunc = () => {
    return `(obj) => {
        \t\tif (aIdx === 0){
        \t\t_chartOption.series[aIdx].data[0] = obj?.data?.rows[0][0]?.value ? obj?.data?.rows[0][0]?.value : 'no-data';}
        \t\telse _chartOption.series[aIdx].data = obj?.data?.rows ?? [];
        \t\t_chart.setOption(_chartOption);
        \t}`;
};

export const DashboardChartCodeParser = (aChartOptions: any, aChartType: string, aParsedQuery: any, isSave: boolean = false) => {
    const sDataType = aParsedQuery[0].dataType;
    const sAccToken = localStorage.getItem('accessToken');
    const sXConsoleId = localStorage.getItem('consoleId');
    let sInjectFunc = null;

    if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc();
    if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc(aChartType);
    if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidNameValueFunc(aChartOptions);
    if (aChartType === 'text') sInjectFunc = TextFunc();

    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            query: `${aQuery.query}`,
            idx: aQuery.idx,
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
    const sLoop = `sQuery.forEach((aData) => {\n` + `\t\t\tgetData(aData.query, aData.idx);\n` + `\t\t});`;

    return `{
        let sQuery = ${JSON.stringify(sDynamicVariable)};
        let sData = [];
        let sCount = 0;
        ${sFunction}
        ${sLoop}
    }`;
};
