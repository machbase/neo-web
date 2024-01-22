export const DashboardChartCodeParser = async (aParsedQuery: any) => {
    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            query: `${aQuery.query}`,
            idx: aQuery.idx,
            type: aQuery.dataType,
        };
    });
    // GEN func
    const sFunction = `function getData(aTql, aIdx, aType) {
        fetch("http://${window.location.hostname}:5654/db/tql", {
            method: "POST",
            body: aTql
        })
        .then((rsp) => rsp.json())
        .then((obj) => {
            if (aType === 'TIME_VALUE') {
                _chartOption.series[aIdx].data = obj.data.rows;
            } else if (aType === 'NAME_VALUE') {
                // let aDatas = [];
                obj.data.rows.forEach((aData)=>{
                    // aDatas.push(aData[0])
                    sTmpDatas[aIdx] = (aData[0]);
                });
                // _chartOption.series[0].data = [..._chartOption.series[0].data, ...aDatas];
                _chartOption.series[0].data = sTmpDatas;
            }
            _chart.setOption(_chartOption);
        }).catch((err) => console.warn("data fetch error", err));
    };`;
    // GEN loop
    const sLoop = `sDatas.forEach((aData)=>{
        getData(aData.query, aData.idx, aData.type);
    })`;

    return `{
        let sDatas = ${JSON.stringify(sDynamicVariable)};
        let sTmpDatas = [];
        ${sFunction}
        ${sLoop}
    }`;
};
