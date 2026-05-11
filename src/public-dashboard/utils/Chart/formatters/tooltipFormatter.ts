export const generateTooltipAxisFunction = (
    aOpt: any,
    aXAxsisType?: 'TIME' | 'VALUE',
    aFormatterFn?: string | string[],
    aAliasList?: Array<{ seriesIndex: number; yAxisIdx: number }>,
    aEnabledSeriesMeta?: Array<{ idx: number; name: string; color: string; unit?: string }>
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
        const targetBlock = aOpt.blockList?.[aOpt.xAxisOptions?.[0]?.useBlockList?.[0]];
        if (targetBlock) {
            let name = targetBlock.useCustom ? targetBlock.values[0]?.alias : targetBlock.alias;
            if (!name || name === '') {
                if (targetBlock.useCustom) name = targetBlock.values[0]?.value + '(' + targetBlock.values[0]?.aggregator + ')';
                else name = targetBlock.tag + '(' + targetBlock.aggregator + ')';
            }

            // Use formatter if provided, otherwise use raw axisValue
            const xAxisValueExpression = aFormatterFn
                ? `(function() { ${formatterDeclaration} return ${Array.isArray(aFormatterFn) ? 'formatter0' : 'formatter'}(params[0].axisValue); })()`
                : `parseFloat(params[0].axisValue)`;

            sInjectionOutput = `let output = '<div><table><tr><td  style="color: ${targetBlock.color}"><b>X-axis</b>&ensp;:</td><td> ${
                '&ensp;' + JSON.stringify(name).replaceAll("'", '"') + '&ensp;'
            } </td> <td><b>' + ${xAxisValueExpression} + '</b></td></tr></table></div>';`;
        }
    }

    // Build alias map for formatter selection
    let aliasMapCode = '';
    if (aAliasList && aAliasList.length > 0 && Array.isArray(aFormatterFn)) {
        const aliasMap = aAliasList.map((item) => item.yAxisIdx);
        aliasMapCode = `const aliasMap = ${JSON.stringify(aliasMap)};`;
    }

    // Determine formatter selection logic (uses param.seriesIndex in fallback path)
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

    // Same selection logic but referencing local seriesIdx variable for the meta-driven branch
    let metaFormatterSelectionLogic = '';
    if (Array.isArray(aFormatterFn)) {
        if (aAliasList && aAliasList.length > 0) {
            metaFormatterSelectionLogic = 'formattersArray[aliasMap[seriesIdx] !== undefined ? aliasMap[seriesIdx] : 0]';
        } else {
            metaFormatterSelectionLogic = 'formattersArray[0]';
        }
    } else {
        metaFormatterSelectionLogic = 'formatter';
    }

    // Meta-driven rendering branch (enabled-series forced display + no-data marker + same-series collapse)
    if (aEnabledSeriesMeta && aEnabledSeriesMeta.length > 0) {
        // The whole chart option goes through JSON.stringify (LineChart.tsx:344) before decodeFormatterFunction
        // strips the outer "..." around the function source. Inner " survive as \" — invalid JS outside string
        // literals. We embed the meta as a UTF-8-safe base64 string (only [A-Za-z0-9+/=], no quotes/backslashes)
        // and decode at runtime.
        const metaJson = JSON.stringify(aEnabledSeriesMeta);
        const metaB64 = btoa(unescape(encodeURIComponent(metaJson)));
        return (
            `function (params) {` +
            `if (!params || !params.length) { return ''; }` +
            sInjectionOutput +
            (aFormatterFn ? `${formatterDeclaration}` : '') +
            (Array.isArray(aFormatterFn) ? `const formattersArray = [${aFormatterFn.map((_, idx) => `formatter${idx}`).join(', ')}];` : '') +
            aliasMapCode +
            `const enabledMeta = JSON.parse(decodeURIComponent(escape(atob('${metaB64}'))));` +
            // Group params by seriesIndex (first-only fallback for duplicate seriesIndex at same x)
            `const bySeries = {};` +
            `for (let i = 0; i < params.length; i++) {` +
            `  const p = params[i];` +
            `  const si = p.seriesIndex;` +
            `  if (bySeries[si]) { bySeries[si].count += 1; }` +
            `  else { bySeries[si] = { param: p, count: 1 }; }` +
            `}` +
            `output += '<table>';` +
            `for (let m = 0; m < enabledMeta.length; m++) {` +
            `  const meta = enabledMeta[m];` +
            `  const entry = bySeries[meta.idx];` +
            `  const dotMarker = '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:' + meta.color + ';"></span>';` +
            `  if (!entry) {` +
            `    output += '<tr><td>' + dotMarker + '</td><td style="color:#888">' + meta.name + '&ensp;</td><td style="color:#888"><b>no data</b></td></tr>';` +
            `    continue;` +
            `  }` +
            `  const param = entry.param;` +
            `  const seriesIdx = param.seriesIndex;` +
            `  const rawVal = param.data ? param.data[1] : param.value;` +
            `  const hasVal = (rawVal !== null && rawVal !== undefined && rawVal !== '') || rawVal === 0;` +
            `  const marker = param.marker || dotMarker;` +
            `  const seriesName = meta.name || param.seriesName;` +
            `  const badge = entry.count > 1 ? ' <span style="opacity:0.7">+' + (entry.count - 1) + '</span>' : '';` +
            (aFormatterFn
                ? `  const valStr = hasVal ? ${metaFormatterSelectionLogic}(rawVal) : 'no data';`
                : `  const valStr = hasVal ? rawVal : 'no data';`) +
            `  if (!hasVal) {` +
            `    output += '<tr><td>' + dotMarker + '</td><td style="color:#888">' + seriesName + '&ensp;</td><td style="color:#888"><b>no data</b></td></tr>';` +
            `  } else {` +
            `    output += '<tr><td>' + marker + '</td><td>' + seriesName + '&ensp;</td><td><b>' + valStr + '</b>' + badge + '</td></tr>';` +
            `  }` +
            `}` +
            `return output + '</table>';` +
            `}`
        );
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
        const targetBlock = aOpt.blockList?.[aOpt.xAxisOptions?.[0]?.useBlockList?.[0]];
        if (targetBlock) {
            let name = targetBlock.useCustom ? targetBlock.values[0]?.alias : targetBlock.alias;
            if (!name || name === '') {
                if (targetBlock.useCustom) name = targetBlock.values[0]?.value + '(' + targetBlock.values[0]?.aggregator + ')';
                else name = targetBlock.tag + '(' + targetBlock.aggregator + ')';
            }

            // Use formatter if provided, otherwise use raw data
            const xAxisValueExpression = aFormatterFn ? `(function() { const formatter = ${aFormatterFn}; return formatter(params.data[0]); })()` : `params.data[0]`;

            sInjectionOutput = `let output = '<div><table><tr><td  style="color: ${targetBlock.color}"><b>X-axis</b>&ensp;:</td><td> ${
                '&ensp;' + JSON.stringify(name).replaceAll("'", '"') + '&ensp;'
            } </td> <td><b>' + ${xAxisValueExpression} + '</b></td></tr></table></div>';`;
        }
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
