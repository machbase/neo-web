import { isEmpty, isObjectEmpty } from '.';
import { SqlResDataType } from './DashboardQueryParser';
import { ChartItemTooltipFormatter, ChartAxisTooltipFormatter, ChartSeriesColorList } from './constants';
import { chartTypeConverter } from './eChartHelper';
// structure of chart common option
const StructureOfCommonOption = `{
    "legend": {
        "show": $isLegend$,
        "top": "$legendTop$",
        "left": "$legendLeft$",
        "orient": "$legendOrient$"
    },
    "title": { "text": "$title$", "left": 10, "top": 5 },
    "tooltip": {
        "show": $isTooltip$,
        "trigger": "$tooltipTrigger$",
        "backgroundColor": "$tooltipBgColor$",
        "formatter": null,
        "confine": true,
        "textStyle": {
            "color": "$tooltipTxtColor$"
        }
    },
    "dataZoom": $isDataZoom$,
    "grid": {
        "left": "$gridLeft$",
        "right": "$gridRight$",
        "top": "$gridTop$",
        "bottom": "$gridBottom$",
        "containLabel": true
    }
}`;
// chart structure
const StructureSeriesOption: any = {
    line: `
        "areaStyle": $areaStyle$,
        "smooth": $smooth$,
        "step": $isStep$,
        "stack": $isStack$,
        "connectNulls": $connectNulls$,
        "lineStyle": null,
        "markLine": $markLine$,
        "symbol": "$symbol$",
        "symbolSize": $symbolSize$
    `,
    bar: `
        "coordinateSystem": "cartesian2d",
        "large": $isLarge$,
        "stack": $isStack$
    `,
    scatter: `
        "large": $isLarge$,
        "symbolSize": $symbolSize$,
        "symbol": "$symbol$"
    `,
    pie: `
        "radius": ["$doughnutRatio$", "70%"],
        "avoidLabelOverlap": true,
        "roseType": $roseType$,
        "itemStyle": {
            "borderRadius": 10,
            "borderColor": "#fff",
            "borderWidth": 2
        },
        "label": { "show": true },
        "emphasis": {
            "label": { "show": true, "fontSize": 20, "fontWeight": "bold" }
        },
        "labelLine": {
            "show": true
        }
    `,
    gauge: `
        "min": $min$,
        "max": $max$,
        "title": {
            "show": false
        },
        "axisLine": $isAxisLineStyleColor$,
        "pointer": {
            "itemStyle": {
                "color": "auto"
            }
        },
        "progress": {
            "show": false
        },
        "axisTick": {
            "show": $isAxisTick$
        },
        "axisLabel": {
            "distance": $axisLabelDistance$,
            "color": "#999",
            "fontSize": 16
        },
        "splitLine": {
            "length": 10,
            "distance": -10,
            "lineStyle": {
                "width": 2,
                "color": "#fff"
            }
        },
        "anchor": {
            "show": $isAnchor$,
            "showAbove": true,
            "size": $anchorSize$,
            "itemStyle": {
                "borderWidth": 10
            }
        },
        "detail": {
            "fontSize": $valueFontSize$,
            "valueAnimation": $valueAnimation$,
            "formatter": "function (params) { return params.toFixed($gaugeValueLimit$) }",
            "offsetCenter": [0, "$alignCenter$%"]
        },
        "itemStyle": {
            "color": "#5470C6"
        }
    `,
    liquidFill: `
        "shape": "$shape$",
        "amplitude": $amplitude$,
        "waveAnimation": $waveAnimation$,
        "outline": {
            "show": $isOutline$
        },
        "label": {
            "fontSize": $fontSize$
        },
        "backgroundStyle": {
            "color": "$backgroundColor$"
        },
        "data": []
    `,
    text: `
        "series": [
            {
                "areaStyle":{
                    "opacity": "$fillOpacity$"
                },
                "smooth":false,
                "step":false,
                "stack":false,
                "connectNulls":true,
                "lineStyle":null,
                "symbolSize":"$symbolSize$",
                "sampling":"lttb",
                "type": "$chartType$",
                "name":"vib-z(avg)",
                "color":"$chartColor$",
                "xAxisIndex":0,
                "yAxisIndex":0
            }
        ]
    `,
    geomap: `
        "tooltipTime": $tooltipTime$,
        "tooltipCoor": $tooltipCoor$,
        "intervalType": "$intervalType$",
        "intervalValue": "$intervalValue$",
        "coorLat": "$coorLat$",
        "coorLon": "$coorLon$"
    `,
};
// Polar structure
const PolarOption: any = {
    structure: `{
        "polar": {"radius": ["$polarRadius$%", "$polarSize$%"]},
        "angleAxis": {"max": $maxValue$, "startAngle": $startAngle$},
        "radiusAxis": {"type": "$polarAxis$"}
    }`,
    list: ['polarRadius', 'polarSize', 'maxValue', 'startAngle', 'polarAxis'],
};
// VisualMap structure
const VisualMapOption = {
    structure: `{
        "visualMap": {
            "type": "piecewise",
            "show": false,
            "dimension": 0,
            "seriesIndex": $seriesIndex$,
            "pieces": $pieces$
        }
    }`,
    list: ['seriesIndex', 'pieces'],
};
/** replace type opt */
const ReplaceTypeOpt = (aChartType: string, aDataType: string, aTagList: any, aChartOption: any, aXAxis: any, aYAxis: any, aTime: { startTime: number; endTime: number }) => {
    let sChartSeriesStructure: any = StructureSeriesOption[aChartType];
    let sChartOptList: string[] = Object.keys(aChartOption);
    let sPolarStructure: any = `{}`;
    let sVisualMapStructure: any = `{}`;
    let sXAxis: any = `{}`;
    let sYAxis: any = `{}`;

    // Set polar
    if (aChartOption['isPolar']) {
        sPolarStructure = PolarOption['structure'];
        sChartOptList = sChartOptList.filter((aChartOpt: string) => !PolarOption['list'].includes(aChartOpt));
        PolarOption['list'].map((aPolarOpt: string) => {
            sPolarStructure = sPolarStructure.replace(`$${aPolarOpt}$`, aChartOption[aPolarOpt]);
        });
    }
    // Set xAxis | yAxis
    if (aDataType === 'TIME_VALUE' && !aChartOption['isPolar'] && aChartType !== 'text') {
        // Set min max time
        const sTempXAxis: any = JSON.parse(JSON.stringify(aXAxis[0]));
        sTempXAxis.min = aTime.startTime;
        sTempXAxis.max = aTime.endTime;
        sXAxis = JSON.stringify({ xAxis: [sTempXAxis] });
        sYAxis = JSON.stringify({ yAxis: aYAxis });
    }
    if ((aDataType === 'NAME_VALUE' || (aDataType === 'TIME_VALUE' && aChartOption['isPolar'])) && aChartType !== 'text') {
        sXAxis = `{}`;
        sYAxis = `{}`;
    }
    if (aChartType === 'text') {
        sXAxis = JSON.stringify({
            xAxis: [
                {
                    ...aXAxis[0],
                    min: aTime.startTime,
                    max: aTime.endTime,
                    show: false,
                },
            ],
        });
        sYAxis = JSON.stringify({
            yAxis: [
                {
                    ...aYAxis[0],
                    show: false,
                },
            ],
        });
    }
    // Set opt
    sChartOptList.map((aOpt: string) => {
        if (aOpt === 'markLine') sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, JSON.stringify(aChartOption[aOpt]));
        else if (aOpt === 'areaStyle')
            sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, aChartOption[aOpt] ? `{"opacity": ${aChartOption['fillOpacity']}}` : 'null');
        else if (aOpt === 'isPolar' && aChartOption[aOpt]) sChartSeriesStructure = sChartSeriesStructure + `, "coordinateSystem": "polar"`;
        else if (aOpt === 'isSampling' && !aChartOption[aOpt]) sChartSeriesStructure = sChartSeriesStructure + `, "sampling": "lttb"`;
        else if (aOpt === 'symbol')
            sChartSeriesStructure = sChartSeriesStructure.replaceAll(
                `$${aOpt}$`,
                aChartOption['isSymbol'] ? aChartOption[aOpt] : aChartType === 'scatter' ? aChartOption['symbol'] : 'none'
            );
        else if (aOpt == 'isLarge') {
            if (aChartOption[aOpt]) sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, false);
            else sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, true) + `, "largeThreshold": 2000`;
        } else if (aOpt === 'isAxisLineStyleColor')
            sChartSeriesStructure = aChartOption[aOpt]
                ? sChartSeriesStructure.replaceAll(`$${aOpt}$`, JSON.stringify({ lineStyle: { width: 10, color: aChartOption['axisLineStyleColor'] } }))
                : sChartSeriesStructure.replaceAll(`$${aOpt}$`, JSON.stringify({ lineStyle: { width: 10, color: [[1, '#c2c2c2']] } }));
        else if (aOpt === 'coorLat' || aOpt === 'coorLon') sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, JSON.stringify(aChartOption[aOpt]));
        else sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, aChartOption[aOpt]);
    });

    // Set visualMap only use line chart
    if (aChartOption['markLine'] && !isEmpty(aChartOption['markLine'].data)) {
        sVisualMapStructure = VisualMapOption['structure'];
        const sSeriesIndexArray = Array.from(aTagList, (_, aIndex) => aIndex);
        const sPieces = aChartOption['markLine'].data.reduce((aAcc: any, aCurrent: any, aIndex: number, aArr: any) => {
            if (aIndex % 2 === 0 && aIndex < aArr.length - 1) {
                aAcc.push({ min: aCurrent.xAxis, max: aArr[aIndex + 1].xAxis, color: ChartSeriesColorList[0] });
            }
            return aAcc;
        }, []);
        sVisualMapStructure = sVisualMapStructure.replace(`$seriesIndex$`, JSON.stringify(sSeriesIndexArray));
        sVisualMapStructure = sVisualMapStructure.replace(`$pieces$`, JSON.stringify(sPieces));
    }

    const sParsedSeries = JSON.parse('{' + sChartSeriesStructure + '}');
    const sParsedPolar = JSON.parse(sPolarStructure);
    const sParsedVisualMap = JSON.parse(sVisualMapStructure);
    const sParsedX = JSON.parse(sXAxis);
    const sParsedY = JSON.parse(sYAxis);
    return { series: sParsedSeries, polar: sParsedPolar, visualMap: sParsedVisualMap, xAxis: sParsedX, yAxis: sParsedY };
};

/** replace common opt */
const ReplaceCommonOpt = (aCommonOpt: any, aPanelType: string) => {
    const sCommOptList: string[] = Object.keys(aCommonOpt);
    const sDataType = SqlResDataType(aPanelType);
    let sParsedOpt: any = StructureOfCommonOption;
    sCommOptList.map((aOpt: string) => {
        if (aOpt === 'isDataZoom') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isDataZoom ? JSON.stringify([{ type: 'slider' }]) : false);
        else if (aOpt === 'title') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isInsideTitle ? aCommonOpt[aOpt] : '');
        else sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt[aOpt]);
    });

    const sResult = JSON.parse(sParsedOpt);
    if (sResult.tooltip.show && sResult.tooltip.trigger === 'axis' && sDataType === 'TIME_VALUE')
        sResult.tooltip.formatter = ChartAxisTooltipFormatter(aCommonOpt['tooltipUnit'], aCommonOpt['tooltipDecimals']);
    if (sResult.tooltip.show && sResult.tooltip.trigger === 'item' && sDataType === 'TIME_VALUE')
        sResult.tooltip.formatter = ChartItemTooltipFormatter(aCommonOpt['tooltipUnit'], aCommonOpt['tooltipDecimals']);
    if (sResult.legend.left !== 'center') sResult.legend.padding = [30, 0, 0, 0];
    if (aPanelType === 'text') {
        sResult.legend = { show: false };
        sResult.tooltip = { show: false };
        sResult.grid = { bottom: '0', left: '0', right: '0', top: '50' };
    }
    return sResult;
};

const ParseOpt = (aChartType: string, aDataType: string, aTagList: any, aCommonOpt: any, aTypeOpt: any, sUseDualYAxis: number[]) => {
    const sResultOpt: any = { ...aCommonOpt, ...aTypeOpt.polar, ...aTypeOpt.visualMap, ...aTypeOpt.xAxis, ...aTypeOpt.yAxis };
    const sIsVisualMap = !isObjectEmpty(aTypeOpt?.visualMap ?? {});

    // Return Text chart
    if (aChartType === 'text') return { ...sResultOpt, ...aTypeOpt.series };

    if (aDataType === 'TIME_VALUE') {
        sResultOpt.series = aTagList.map((aTag: { name: string; color: string }, aIdx: number) => {
            return {
                ...aTypeOpt.series,
                type: aChartType,
                name: aTag.name,
                color: aTag.color,
                xAxisIndex: 0,
                yAxisIndex: sUseDualYAxis.length > 0 && sUseDualYAxis.includes(aIdx) ? 1 : 0,
                lineStyle: sIsVisualMap ? { color: ChartSeriesColorList[aIdx] } : null,
            };
        });
    } else if (aDataType === 'NAME_VALUE') {
        sResultOpt.series = [
            {
                ...aTypeOpt.series,
                type: aChartType,
                color: aTagList.map((aTagInfo: any, aIdx: number) => (aTagInfo.color !== '' ? aTagInfo.color : ChartSeriesColorList[aIdx])),
            },
        ];
    }
    return sResultOpt;
};

const CheckYAxisMinMax = (yAxisOptions: any) => {
    const sResult = yAxisOptions.map((aYAxis: any) => {
        const sReturn: any = JSON.parse(JSON.stringify(aYAxis));
        if (sReturn?.title !== '') sReturn.name = aYAxis?.label?.title;
        else delete sReturn.name;
        if (sReturn?.label) {
            if (aYAxis.label.name === 'byte') {
                // SI
                aYAxis.label.key.includes('SI') &&
                    (sReturn['axisLabel'] = {
                        formatter:
                            `function (params) {` +
                            `const sSquared =  Math.abs(Math.trunc(params)).toString().length - 1;` +
                            `const sOverflow = params.toString().includes('+');` +
                            `if (sOverflow || sSquared >= 15) return (params / Math.pow(1000, 5))${
                                aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''
                            } + ' PB';` +
                            `if (params === 0) return (params);` +
                            `if (sSquared === 0) return (params) + ' B';` +
                            `if (sSquared < 3) return (params)${aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''} + ' B';` +
                            `if (sSquared < 6) return (params / 1000)${aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''} + ' kB';` +
                            `if (sSquared < 9) return (params / Math.pow(1000, 2))${aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''} + ' MB';` +
                            `if (sSquared < 12) return (params / Math.pow(1000, 3))${aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''} + ' GB';` +
                            `if (sSquared < 15) return (params / Math.pow(1000, 4))${aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''} + ' TB';` +
                            `}`,
                    });
                // IEC
                aYAxis.label.key.includes('IEC') &&
                    (sReturn['axisLabel'] = {
                        formatter:
                            `function (params) {` +
                            `if (!+params) return 0;` +
                            `const k = 1024;` +
                            `const sign = Math.sign(params) === -1 ? '-' : '';` +
                            `const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];` +
                            `const abs = Math.abs(params);` +
                            `const i = Math.floor(Math.log(abs) / Math.log(k));` +
                            `return ('' + sign + (parseFloat((abs / Math.pow(k, (i > 5 ? 5 : i < 0 ? 0 : i))))${
                                aYAxis?.label?.decimals ? '.toFixed(' + aYAxis?.label?.decimals + ')' : ''
                            }).toString() + sizes[(i > 5 ? 5 : i < 0 ? 0 : i)]);` +
                            `}`,
                    });
            } else {
                const sSign = Math.sign(aYAxis.label.squared) === -1 ? '*' : '/';
                sReturn['axisLabel'] = {
                    formatter: `function (params) { return (params ${sSign} ${Math.pow(10, Math.abs(aYAxis.label.squared))})${
                        aYAxis?.label?.decimals ? `.toFixed(${aYAxis?.label?.decimals})` : ''
                    }${aYAxis?.label?.unit ? " + '" + aYAxis?.label?.unit.replaceAll("'", '"') + "'" : ''}}`,
                };
            }
            delete sReturn.label;
        }
        if (sReturn?.offset !== '') sReturn.offset = Number(sReturn.offset) ?? 0;
        if (sReturn.useMinMax) return sReturn;
        else {
            delete sReturn.useMinMax;
            delete sReturn.min;
            delete sReturn.max;
            return sReturn;
        }
    });
    return sResult;
};

export const DashboardChartOptionParser = (aOptionInfo: any, aTagList: any, aTime: { startTime: number; endTime: number }) => {
    const sConvertedChartType = chartTypeConverter(aOptionInfo.type);
    const sCommonOpt = ReplaceCommonOpt(aOptionInfo.commonOptions, sConvertedChartType);
    const sUseDualYAxis = aOptionInfo.yAxisOptions.length === 2;
    // Animation false (TIME_VALUE TYPE)
    if (SqlResDataType(sConvertedChartType) === 'TIME_VALUE') sCommonOpt.animation = false;
    const sTypeOpt = ReplaceTypeOpt(
        sConvertedChartType,
        SqlResDataType(sConvertedChartType),
        aTagList.map((aTagInfo: any) => aTagInfo.name),
        aOptionInfo.chartOptions,
        aOptionInfo.xAxisOptions,
        CheckYAxisMinMax(aOptionInfo.yAxisOptions),
        aTime
    );
    const sParsedOpt = ParseOpt(
        sConvertedChartType,
        SqlResDataType(sConvertedChartType),
        aTagList,
        sCommonOpt,
        sTypeOpt,
        sUseDualYAxis ? aOptionInfo.yAxisOptions[1].useBlockList : []
    );
    return sParsedOpt;
};
