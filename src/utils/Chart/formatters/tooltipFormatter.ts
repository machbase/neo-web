export const generateTooltipAxisFunction = (
    aOpt: any,
    aXAxsisType?: 'TIME' | 'VALUE',
    aFormatterFn?: string | string[],
    aAliasList?: Array<{ seriesIndex: number; yAxisIdx: number }>
) => {
    let sInjectionOutput =
        `let d = new Date(0);` +
        `d.setUTCSeconds(params[0].name / 1000);` +
        `let output = params[0].name === '' ? params[0].axisValueLabel : d.toLocaleString('en-GB', { timezone: 'UTC' });` +
        `output += '<br/>';`;

    // Build formatter declarations
    let formatterDeclaration = '';
    if (aFormatterFn) {
        if (Array.isArray(aFormatterFn)) {
            aFormatterFn.forEach((fn, idx) => {
                formatterDeclaration += `const formatter${idx} = ${fn};`;
            });
        } else {
            formatterDeclaration = `const formatter = ${aFormatterFn};`;
        }
    }

    if (aXAxsisType === 'VALUE') {
        const targetBlock = aOpt.blockList[aOpt.xAxisOptions[0].useBlockList[0]];
        let name = targetBlock?.useCustom ? targetBlock?.values[0]?.alias : targetBlock?.alias;
        if (!name || name === '') {
            if (targetBlock?.useCustom) name = targetBlock?.values[0]?.value + '(' + targetBlock?.values[0]?.aggregator + ')';
            else name = targetBlock?.tag + '(' + targetBlock?.aggregator + ')';
        }

        // Use formatter if provided, otherwise use raw axisValue
        const xAxisValueExpression = aFormatterFn
            ? `(function() { ${formatterDeclaration} return ${Array.isArray(aFormatterFn) ? 'formatter0' : 'formatter'}(params[0].axisValue); })()`
            : `parseFloat(params[0].axisValue)`;

        sInjectionOutput = `let output = '<div><table><tr><td  style="color: ${targetBlock.color}"><b>X-axis</b>&ensp;:</td><td> ${
            '&ensp;' + JSON.stringify(name).replaceAll("'", '"') + '&ensp;'
        } </td> <td><b>' + ${xAxisValueExpression} + '</b></td></tr></table></div>';`;
    }

    // Build alias map for formatter selection
    let aliasMapCode = '';
    if (aAliasList && aAliasList.length > 0 && Array.isArray(aFormatterFn)) {
        const aliasMap = aAliasList.map((item) => item.yAxisIdx);
        aliasMapCode = `const aliasMap = ${JSON.stringify(aliasMap)};`;
    }

    // Determine formatter selection logic
    let formatterSelectionLogic = '';
    if (Array.isArray(aFormatterFn)) {
        if (aAliasList && aAliasList.length > 0) {
            // Use aliasMap to select formatter based on seriesIndex
            formatterSelectionLogic = 'formattersArray[aliasMap[param.seriesIndex] !== undefined ? aliasMap[param.seriesIndex] : 0]';
        } else {
            // Default to first formatter
            formatterSelectionLogic = 'formattersArray[0]';
        }
    } else {
        formatterSelectionLogic = 'formatter';
    }

    return (
        `function (params) {` +
        sInjectionOutput +
        (aFormatterFn ? `${formatterDeclaration}` : '') +
        (Array.isArray(aFormatterFn) ? `const formattersArray = [${aFormatterFn.map((_, idx) => `formatter${idx}`).join(', ')}];` : '') +
        aliasMapCode +
        `output += '<table>';` +
        `params.reverse().forEach(function (param) {` +
        (aFormatterFn
            ? `const val = param.data[1]; output += '<tr><td>' + param.marker + '</td><td>' + param.seriesName + '&ensp;</td><td><b>' + (val || val === 0 ? ${formatterSelectionLogic}(val) : 'no-data') + '</b></td></tr>';`
            : `output += '<tr><td>' + param.marker + '</td><td>' + param.seriesName + '&ensp;</td><td><b>' + (param.data[1] || param.data[1] === 0? param.data[1] : 'no-data') + '</b></td></tr>';`) +
        `});` +
        `return output + '</table>';` +
        `}`
    );
};
export const generateTooltipItemFunction = (aOpt: any, aXAxsisType?: 'TIME' | 'VALUE', aFormatterFn?: string) => {
    let sInjectionOutput = `let d = new Date(0);` + `d.setUTCSeconds(params.data[0] / 1000);` + `let output = d.toLocaleString('en-GB', { timezone: 'UTC' }); output += '<br/>';`;
    if (aXAxsisType === 'VALUE') {
        const targetBlock = aOpt.blockList[aOpt.xAxisOptions[0].useBlockList[0]];
        let name = targetBlock?.useCustom ? targetBlock?.values[0]?.alias : targetBlock?.alias;
        if (!name || name === '') {
            if (targetBlock?.useCustom) name = targetBlock?.values[0]?.value + '(' + targetBlock?.values[0]?.aggregator + ')';
            else name = targetBlock?.tag + '(' + targetBlock?.aggregator + ')';
        }

        // Use formatter if provided, otherwise use raw data
        const xAxisValueExpression = aFormatterFn ? `(function() { const formatter = ${aFormatterFn}; return formatter(params.data[0]); })()` : `params.data[0]`;

        sInjectionOutput = `let output = '<div><table><tr><td  style="color: ${targetBlock.color}"><b>X-axis</b>&ensp;:</td><td> ${
            '&ensp;' + JSON.stringify(name).replaceAll("'", '"') + '&ensp;'
        } </td> <td><b>' + ${xAxisValueExpression} + '</b></td></tr></table></div>';`;
    }
    return (
        `function (params) {` +
        sInjectionOutput +
        `output += '<table>'; ` +
        (aFormatterFn
            ? `const valueFormatter = ${aFormatterFn}; output += '<tr><td>'+params.marker+'</td><td>' + params.seriesName + '&ensp;</td><td><b>' + (params.data[1] || params.data[1] === 0 ? valueFormatter(params.data[1]) : 'no-data') +'&ensp;</b></tr>';`
            : `output += '<tr><td>'+params.marker+'</td><td>' + params.seriesName + '&ensp;</td><td><b>' + (params.data[1] || params.data[1] === 0 ? params.data[1] : 'no-data') +'&ensp;</b></tr>';`) +
        `return output + '</table>';}`
    );
};
