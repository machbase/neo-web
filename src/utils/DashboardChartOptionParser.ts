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
    "title": { "text": "$title$", "left": 20 },
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
const ReplaceTypeOpt = (aChartType: string, aDataType: string, aTagList: any, aChartOption: any, aXAxis: any, aYAxis: any) => {
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
    if (aDataType === 'TIME_VALUE' && !aChartOption['isPolar']) {
        sXAxis = JSON.stringify({ xAxis: aXAxis });
        sYAxis = JSON.stringify({ yAxis: aYAxis });
    }
    if (aDataType === 'NAME_VALUE' || (aDataType === 'TIME_VALUE' && aChartOption['isPolar'])) {
        sXAxis = `{}`;
        sYAxis = `{}`;
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
const ReplaceCommonOpt = (aCommonOpt: any, aDataType: string) => {
    const sCommOptList: string[] = Object.keys(aCommonOpt);
    let sParsedOpt: any = StructureOfCommonOption;
    sCommOptList.map((aOpt: string) => {
        if (aOpt === 'isDataZoom') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isDataZoom ? JSON.stringify([{ type: 'slider' }]) : false);
        else if (aOpt === 'title') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isInsideTitle ? aCommonOpt[aOpt] : '');
        else sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt[aOpt]);
    });
    const sResult = JSON.parse(sParsedOpt);
    if (sResult.tooltip.show && sResult.tooltip.trigger === 'axis' && aDataType === 'TIME_VALUE') sResult.tooltip.formatter = ChartAxisTooltipFormatter;
    if (sResult.tooltip.show && sResult.tooltip.trigger === 'item' && aDataType === 'TIME_VALUE') sResult.tooltip.formatter = ChartItemTooltipFormatter;
    return sResult;
};

const ParseOpt = (aChartType: string, aDataType: string, aTagList: any, aCommonOpt: any, aTypeOpt: any) => {
    const sResultOpt: any = { ...aCommonOpt, ...aTypeOpt.polar, ...aTypeOpt.visualMap, ...aTypeOpt.xAxis, ...aTypeOpt.yAxis };
    const sXLen: number = sResultOpt.xAxis && sResultOpt.xAxis.length;
    const sYLen: number = sResultOpt.yAxis && sResultOpt.yAxis.length;
    const sIsVisualMap = !isObjectEmpty(aTypeOpt.visualMap);

    if (aDataType === 'TIME_VALUE') {
        sResultOpt.series = aTagList.map((aTag: { name: string; color: string }, aIdx: number) => {
            return {
                ...aTypeOpt.series,
                type: aChartType,
                // data: [],
                name: aTag.name,
                color: aTag.color,
                xAxisIndex: sXLen > aIdx ? aIdx : 0,
                yAxisIndex: sYLen > aIdx ? aIdx : 0,
                lineStyle: sIsVisualMap ? { color: ChartSeriesColorList[aIdx] } : null,
            };
        });
    } else if (aDataType === 'NAME_VALUE') {
        sResultOpt.series = [
            {
                ...aTypeOpt.series,
                type: aChartType,
                color: aTagList.map((aTagInfo: any) => aTagInfo.color),
                // data: [],
            },
        ];
        // sResultOpt.dataset = { dataset: [] };
    }
    return sResultOpt;
};

const CheckYAxisMinMax = (yAxisOptions: any) => {
    const sResult = yAxisOptions.map((aYAxis: any) => {
        if (aYAxis.useMinMax) return aYAxis;
        else {
            const sReturn = JSON.parse(JSON.stringify(aYAxis));
            delete sReturn.useMinMax;
            delete sReturn.min;
            delete sReturn.max;
            return sReturn;
        }
    });
    return sResult;
};

export const DashboardChartOptionParser = async (aOptionInfo: any, aTagList: any) => {
    const sConvertedChartType = chartTypeConverter(aOptionInfo.type);
    const sCommonOpt = ReplaceCommonOpt(aOptionInfo.commonOptions, SqlResDataType(sConvertedChartType));
    const sTypeOpt = ReplaceTypeOpt(
        sConvertedChartType,
        SqlResDataType(sConvertedChartType),
        aTagList.map((aTagInfo: any) => aTagInfo.name),
        aOptionInfo.chartOptions,
        aOptionInfo.xAxisOptions,
        CheckYAxisMinMax(aOptionInfo.yAxisOptions)
    );
    const sParsedOpt = ParseOpt(sConvertedChartType, SqlResDataType(sConvertedChartType), aTagList, sCommonOpt, sTypeOpt);
    return sParsedOpt;
};
