/* eslint-disable @typescript-eslint/no-unused-vars */
/** Declare helper */
const { _chartOption, _chart, aIdx }: any = [null, null, null];
/** NAME_VALUE func */
const NameValueFunc = (obj: any) => {
    _chartOption.series[0].data[aIdx] = obj.data.rows[0][0];
    _chart.setOption(_chartOption);
};
/** TIME_VALUE func */
const TimeValueFunc = (obj: any) => {
    _chartOption.series[aIdx].data = obj.data.rows;
    _chart.setOption(_chartOption);
};
/** LIQUIDFILL TIME_VALUE func */
const LiquidTimeValueFunc = (aChartOption: any) => {
    return `(obj) => {
        const sValue = obj.data.rows[0][0].value;
        _chartOption.series[aIdx].data = [(sValue - ${aChartOption.minData}) / ${aChartOption.maxData - aChartOption.minData}];
        _chartOption.series[aIdx].label.formatter = function () {
            return Number.parseFloat(sValue).toFixed(${aChartOption.digit}) + '${aChartOption.unit}';
        };
        console.log('_chartOption.series[aIdx].data', _chartOption.series[aIdx].data)
        _chart.setOption(_chartOption);
    }`;
};

export const DashboardChartCodeParser = async (aChartOption: any, aChartType: string, aParsedQuery: any) => {
    const sDataType = aParsedQuery[0].dataType;
    let sInjectFunc = null;

    if (sDataType === 'TIME_VALUE') sInjectFunc = TimeValueFunc;
    if (sDataType === 'NAME_VALUE' && aChartType !== 'liquidFill') sInjectFunc = NameValueFunc;
    if (sDataType === 'NAME_VALUE' && aChartType === 'liquidFill') sInjectFunc = LiquidTimeValueFunc(aChartOption);

    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            query: `${aQuery.query}`,
            idx: aQuery.idx,
        };
    });
    // GEN func
    const sFunction = `function getData(aTql, aIdx) {
        fetch("http://${window.location.hostname}:5654/db/tql", {
            method: "POST",
            body: aTql
        })
        .then((rsp) => rsp.json())
        .then(${sInjectFunc})
        .catch((err) => console.warn("data fetch error", err));
    };`;
    // GEN loop
    const sLoop = `sDatas.forEach((aData)=>{
        getData(aData.query, aData.idx);
    });`;

    return `{
        let sDatas = ${JSON.stringify(sDynamicVariable)};
        ${sFunction}
        ${sLoop}
    }`;
};
