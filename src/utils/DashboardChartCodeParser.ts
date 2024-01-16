export const DashboardChartCodeParser = (aParsedQuery: any) => {
    // GEN variable
    const sDynamicVariable = aParsedQuery.map((aQuery: any) => {
        return `{"q": \`SQL(${'"' + aQuery.sql + '"'})
            JSON()\`,
            "i": ${aQuery.idx}
        }`;
    });
    // GEN func
    const sFunction = `function getData(aTql, aIdx) {
        fetch("http://127.0.0.1:5654/db/tql", {
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
        let sDatas = [${sDynamicVariable.join(',')}];
        ${sFunction}
        ${sLoop}
    }`;
};
