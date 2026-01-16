import { E_CHART_TYPE } from '@/type/eChart';
import { isEmpty, isObjectEmpty } from '.';
import { SqlResDataType } from './DashboardQueryParser';
import { ChartSeriesColorList } from './constants';
import { chartTypeConverter } from './eChartHelper';
import { CHART_AXIS_UNITS } from './Chart/AxisConstants';
import { E_BLOCK_TYPE } from './Chart/TransformDataParser';
import { unitFormatter } from './Chart/formatters';
import { compareVersions } from './version/utils';
// import { generateTooltipAxisFunction } from './Chart/formatters/tooltipFormatter';
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
        "stack": $isStack$,
        "barMaxWidth": 50
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
    advScatter: `
        "large": $isLarge$,
        "symbolSize": $symbolSize$,
        "symbol": "$symbol$"
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
        if (aChartType === E_CHART_TYPE.ADV_SCATTER) sTempXAxis.type = 'value';
        else {
            sTempXAxis.min = aTime.startTime;
            sTempXAxis.max = aTime.endTime;
        }
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
                aChartOption['isSymbol'] ? aChartOption[aOpt] : aChartType === E_CHART_TYPE.SCATTER || aChartType === E_CHART_TYPE.ADV_SCATTER ? aChartOption['symbol'] : 'none'
            );
        else if (aOpt == 'isLarge') {
            if (aChartOption[aOpt] && aChartType !== E_CHART_TYPE.ADV_SCATTER) sChartSeriesStructure = sChartSeriesStructure.replaceAll(`$${aOpt}$`, false);
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
const ReplaceCommonOpt = (aOpt: any, aPanelType: string) => {
    const aCommonOpt = aOpt.commonOptions;
    const sCommOptList: string[] = Object.keys(aCommonOpt);
    const sDataType = SqlResDataType(aPanelType);
    let sParsedOpt: any = StructureOfCommonOption;
    sCommOptList.map((aOpt: string) => {
        if (aOpt === 'isDataZoom') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isDataZoom ? JSON.stringify([{ type: 'slider' }]) : false);
        else if (aOpt === 'title') sParsedOpt = sParsedOpt.replace(`"$${aOpt}$"`, aCommonOpt.isInsideTitle ? JSON.stringify(aCommonOpt[aOpt]) : '""');
        else sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt[aOpt]);
    });

    const sResult = JSON.parse(sParsedOpt);
    if (sResult.tooltip.show && sDataType === 'TIME_VALUE') {
        let sUnit = aCommonOpt['tooltipUnit'];
        if (compareVersions(aOpt.version, '1.0.1') < 0) {
            sUnit = { suffix: aOpt?.commonOptions?.tooltipUnit ?? '' };
        }
        sResult.tooltip.formatter = unitFormatter(sUnit, aCommonOpt['tooltipDecimals'], 'TOOLTIP', {
            type: sResult.tooltip.trigger,
            opt: aOpt,
            panelType: aPanelType === E_CHART_TYPE.ADV_SCATTER ? 'VALUE' : 'TIME',
        });
    }

    if (sResult.legend.left !== 'center') sResult.legend.padding = [30, 0, 0, 0];
    if (aPanelType === 'text') {
        sResult.legend = { show: false };
        sResult.tooltip = { show: false };
        sResult.grid = { bottom: '0', left: '0', right: '0', top: '50' };
    }

    // Set background color based on theme
    if (aOpt.theme === 'dark') {
        sResult.backgroundColor = '#252525';
    }

    return sResult;
};

const ParseOpt = (aChartType: string, aDataType: string, aTagList: any, aCommonOpt: any, aTypeOpt: any, sUseDualYAxis: number[]) => {
    const sResultOpt: any = { ...aCommonOpt, ...aTypeOpt.polar, ...aTypeOpt.visualMap, ...aTypeOpt.xAxis, ...aTypeOpt.yAxis };
    const sIsVisualMap = !isObjectEmpty(aTypeOpt?.visualMap ?? {});

    // Return Text chart
    if (aChartType === 'text') return { ...sResultOpt, ...aTypeOpt.series };
    if (aDataType === 'TIME_VALUE') {
        const sTag = aTagList.filter((aTag: { name: string; color: string; useQuery: boolean; type: E_BLOCK_TYPE }) => aTag?.type === E_BLOCK_TYPE.STD);
        const sTrxTag = aTagList.filter((aTag: { name: string; color: string; useQuery: boolean; type: E_BLOCK_TYPE }) => aTag?.type === E_BLOCK_TYPE.TRX);

        const rBlock = sTag.map((aTag: { name: string; color: string; useQuery: boolean; type: E_BLOCK_TYPE }, aIdx: number) => {
            if (!aTag.useQuery && aChartType === E_CHART_TYPE.ADV_SCATTER) return {};
            return {
                ...aTypeOpt.series,
                type: aChartType === E_CHART_TYPE.ADV_SCATTER ? 'scatter' : aChartType,
                name: aTag.name,
                color: aTag.color,
                xAxisIndex: 0,
                yAxisIndex: sUseDualYAxis.length > 0 && sUseDualYAxis.includes(aIdx) ? 1 : 0,
                lineStyle: sIsVisualMap ? { color: ChartSeriesColorList[aIdx] } : null,
            };
        });

        const rTrxBlock = sTrxTag.map((aTag: { name: string; color: string; useQuery: boolean; type: E_BLOCK_TYPE }, aIdx: number) => {
            if (!aTag.useQuery && aChartType === E_CHART_TYPE.ADV_SCATTER) return {};
            return {
                ...aTypeOpt.series,
                type: aChartType === E_CHART_TYPE.ADV_SCATTER ? 'scatter' : aChartType,
                name: aTag.name,
                color: aTag.color,
                xAxisIndex: 0,
                yAxisIndex: sUseDualYAxis.length > 0 && sUseDualYAxis.includes(aIdx + 100) ? 1 : 0,
                lineStyle: sIsVisualMap ? { color: ChartSeriesColorList[aIdx] } : null,
            };
        });

        sResultOpt.series = rBlock.concat(rTrxBlock);
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
const LabelFormatter = (aLabel: CHART_AXIS_UNITS) => {
    if (aLabel?.name === 'byte') {
        // SI
        if (aLabel?.key?.includes('SI')) {
            return {
                formatter:
                    `function (params) {` +
                    `const sSquared =  Math.abs(Math.trunc(params)).toString().length - 1;` +
                    `const sOverflow = params.toString().includes('+');` +
                    `if (sOverflow || sSquared >= 15) return (params / Math.pow(1000, 5))${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' PB';` +
                    `if (params === 0) return (params);` +
                    `if (sSquared === 0) return (params) + ' B';` +
                    `if (sSquared < 3) return (params)${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' B';` +
                    `if (sSquared < 6) return (params / 1000)${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' kB';` +
                    `if (sSquared < 9) return (params / Math.pow(1000, 2))${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' MB';` +
                    `if (sSquared < 12) return (params / Math.pow(1000, 3))${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' GB';` +
                    `if (sSquared < 15) return (params / Math.pow(1000, 4))${aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''} + ' TB';` +
                    `}`,
            };
        }
        // IEC
        if (aLabel?.key?.includes('IEC')) {
            return {
                formatter:
                    `function (params) {` +
                    `if (!+params) return 0;` +
                    `const k = 1024;` +
                    `const sign = Math.sign(params) === -1 ? '-' : '';` +
                    `const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];` +
                    `const abs = Math.abs(params);` +
                    `const i = Math.floor(Math.log(abs) / Math.log(k));` +
                    `return ('' + sign + (parseFloat((abs / Math.pow(k, (i > 5 ? 5 : i < 0 ? 0 : i))))${
                        aLabel?.decimals ? '.toFixed(' + aLabel?.decimals + ')' : ''
                    }).toString() + sizes[(i > 5 ? 5 : i < 0 ? 0 : i)]);` +
                    `}`,
            };
        }
    } else {
        const sSign = Math.sign(aLabel?.squared) === -1 ? '*' : '/';
        return {
            formatter: `function (params) { return (params ${sSign} ${Math.pow(10, Math.abs(aLabel?.squared))})${aLabel?.decimals ? `.toFixed(${aLabel?.decimals})` : ''}${
                aLabel?.unit ? " + '" + aLabel?.unit.replaceAll("'", '"') + "'" : ''
            }}`,
        };
    }
};

const CheckYAxis = (yAxisOptions: any, panelVersion: string) => {
    const sResult = yAxisOptions.map((aYAxis: any) => {
        const sReturn: any = JSON.parse(JSON.stringify(aYAxis));
        if (sReturn?.title !== '') sReturn.name = aYAxis?.label?.title;
        else delete sReturn.name;
        if (sReturn?.label) {
            // version > '1.0.1'
            if (compareVersions(panelVersion, '1.0.1') < 0) sReturn['axisLabel'] = LabelFormatter(aYAxis.label);
            else sReturn['axisLabel'] = unitFormatter(aYAxis?.unit, aYAxis?.label?.decimals);
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
const CheckXAxis = (xAxisOptions: any, aChartType: string, panelVersion: string) => {
    const sResult = xAxisOptions.map((aAxis: any) => {
        const sReturn: any = JSON.parse(JSON.stringify(aAxis));
        if (aChartType !== E_CHART_TYPE.ADV_SCATTER) {
            delete sReturn.min;
            delete sReturn.max;
            delete sReturn.useBlockList;
            delete sReturn.scale;
            delete sReturn.label;
            return sReturn;
        }
        if (sReturn?.label) {
            // version > '1.0.1'
            if (compareVersions(panelVersion, '1.0.1') < 0) sReturn['axisLabel'] = LabelFormatter(aAxis.label);
            else sReturn['axisLabel'] = unitFormatter(aAxis?.unit, aAxis?.label?.decimals);
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
    const sCommonOpt = ReplaceCommonOpt(aOptionInfo, sConvertedChartType);
    const sUseDualYAxis = aOptionInfo.yAxisOptions.length === 2;
    const sTagList = aTagList.filter(Boolean);
    // Animation false (TIME_VALUE TYPE)
    if (SqlResDataType(sConvertedChartType) === 'TIME_VALUE') sCommonOpt.animation = false;
    const sTypeOpt = ReplaceTypeOpt(
        sConvertedChartType,
        SqlResDataType(sConvertedChartType),
        sTagList.map((aTagInfo: any) => aTagInfo?.name),
        aOptionInfo.chartOptions,
        CheckXAxis(aOptionInfo.xAxisOptions, sConvertedChartType, aOptionInfo.version),
        CheckYAxis(aOptionInfo.yAxisOptions, aOptionInfo.version),
        aTime
    );
    const sParsedOpt = ParseOpt(
        sConvertedChartType,
        SqlResDataType(sConvertedChartType),
        sTagList,
        sCommonOpt,
        sTypeOpt,
        sUseDualYAxis ? aOptionInfo.yAxisOptions[1].useBlockList : []
    );

    // if (SqlResDataType(sConvertedChartType) === 'TIME_VALUE' && sConvertedChartType !== E_CHART_TYPE.ADV_SCATTER && sConvertedChartType !== E_CHART_TYPE.GEOMAP) {
    //     const sUnitFormatterList = sParsedOpt.yAxis.map((aOpt: any) => {
    //         return aOpt?.axisLabel?.formatter;
    //     });
    //     const sAliasList = sParsedOpt.series.map((aSeries: any, idx: number) => ({
    //         seriesIndex: idx,
    //         yAxisIdx: aSeries.yAxisIndex ?? 0,
    //     }));
    //     sParsedOpt.tooltip.formatter = generateTooltipAxisFunction(aOptionInfo, 'TIME', sUnitFormatterList, sAliasList);
    // }
    return sParsedOpt;
};
