export const DashboardChartCodeParser = async (aParsedQuery: any, aTake: number) => {
    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return {
            q: `SQL("${aQuery.sql}")\nTAKE(${aTake})\nJSON()`,
            i: aQuery.idx,
        };
    });
    // GEN func
    const sFunction = `function getData(aTql, aIdx) {
        fetch("http://${window.location.hostname}:5654/db/tql", {
            method: "POST",
            body: aTql
        }).then(function(rsp){
            return rsp.json()
        }).then(function(obj){
            _chartOption.series[aIdx].data = obj.data.rows
            _chart.setOption(_chartOption)
        }).catch(function(err){
            console.warn("data fetch error", err)
        });
    };`;
    // GEN loop
    const sLoop = `sDatas.forEach((aData)=>{
        getData(aData.q, aData.i);
    })`;

    return `{
        let sDatas = ${JSON.stringify(sDynamicVariable)};
        ${sFunction}
        ${sLoop}
    }`;
};
