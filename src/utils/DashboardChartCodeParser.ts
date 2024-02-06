/** NAME_VALUE func */
const NameValueFunc = () => {
    return `(obj) => {
        \t\tsData[aIdx] = obj.data.rows[0][0];
        \t\tsCount += 1;
        \t\t_chartOption.series[0] = { ..._chartOption.series[0], data: sData };
        \t\tif (sCount === sQuery.length) _chart.setOption(_chartOption);
        \t}`;
};
/** TIME_VALUE func */
const TimeValueFunc = () => {
    return `(obj) => {
        \t\t_chartOption.series[aIdx].data = obj.data.rows;
        \t\t_chart.setOption(_chartOption);
        \t}`;
};
/** LIQUIDFILL NAME_VALUE func */
const LiquidNameValueFunc = (aChartOptions: any) => {
    return `(obj) => {
        \t\tlet sValue = obj.data.rows[0][0].value;
        \t\t_chartOption.series[aIdx].data = [ (sValue - ${aChartOptions.minData}) / ( ${aChartOptions.maxData} -  ${aChartOptions.minData}) ]
        \t\t_chartOption.series[aIdx].label.formatter = function() {
        \t\t\treturn Number.parseFloat(sValue).toFixed(${aChartOptions.digit}) + "${aChartOptions.unit}";
        \t\t}
        \t\t_chart.setOption(_chartOption)}`;
};

export const DashboardChartCodeParser = async (aChartOptions: any, aChartType: string, aParsedQuery: any) => {
    const sDataType = aParsedQuery[0].dataType;
    let sInjectFunc = null;

    if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc();
    if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc();
    if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidNameValueFunc(aChartOptions);

    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            query: `${aQuery.query}`,
            idx: aQuery.idx,
        };
    });

    // GEN func
    const sFunction = `function getData(aTql, aIdx) {
        \tfetch("http://${window.location.hostname}:5654/db/tql", {
            \tmethod: "POST",
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
