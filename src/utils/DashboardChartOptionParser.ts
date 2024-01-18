import { SqlResDataType } from './DashboardQueryParser';
import { ChartLineStackTooltipFormatter } from './constants';
// structure of chart common option
const StructureOfCommonOption = `{
    "legend": { "show": $isLegend$ },
    "tooltip": {
        "show": $isTooltip$,
        "trigger": "$tooltipTrigger$",
        "formatter": null
    },
    "dataZoom": $isDataZoom$
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
        "data": []
    `,
    bar: `
        "coordinateSystem": "cartesian2d",
        "large": false,
        "stack": $isStack$
    `,
    scatter: `
        "large": false,
        "symbolSize": 10
    `,
    pie: `
        "radius": ["$doughnutRatio$", "70%"],
        "avoidLabelOverlap": false,
        "roseType": $roseType$,
        "itemStyle": {
            "borderRadius": 10,
            "borderColor": "#fff",
            "borderWidth": 2
        },
        "label": { "show": false, "position": "center" },
        "emphasis": {
            "label": { "show": true, "fontSize": 40, "fontWeight": "bold" }
        },
        "labelLine": {
            "show": false
        },
        "data": []
    `,
    gauge: `
        "min": $min$,
        "max": $max$,
        "progress": {
            "show": true
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
            "formatter": "{value}",
            "offsetCenter": [0, "$alignCenter$%"]
        },
        "itemStyle": {
            "color": "#5470C6"
        },
        "data": []
    `,
};
// Polar structure
const PolarOption: any = {
    structure: `{
        "polar": {"reaidus": ["$polarRadius$%", "$polarSize$%"]},
        "angleAxis": {"max": $maxValue$, "startAngle": $startAngle$},
        "radiusAxis": {"type": "category"}
    }`,
    list: ['polarRadius', 'polarSize', 'maxValue', 'startAngle'],
};
/** replace type opt */
const ReplaceTypeOpt = (aChartType: string, aDataType: string, aChartOption: any, aXAxis: any, aYAxis: any) => {
    let sChartSeriesStructure: any = StructureSeriesOption[aChartType];
    let sChartOptList: string[] = Object.keys(aChartOption);
    let sPolarStructure: any = `{}`;
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
        if (aOpt === 'markLine') sChartSeriesStructure = sChartSeriesStructure.replace(`$${aOpt}$`, JSON.stringify(aChartOption[aOpt]));
        if (aOpt === 'areaStyle') sChartSeriesStructure = sChartSeriesStructure.replace(`$${aOpt}$`, !aChartOption[aOpt] && 'null');
        if (aOpt === 'isPolar' && aChartOption[aOpt]) sChartSeriesStructure = sChartSeriesStructure + `, "coordinateSystem": "polar"`;
        else sChartSeriesStructure = sChartSeriesStructure.replace(`$${aOpt}$`, aChartOption[aOpt]);
    });

    const sParsedSeries = JSON.parse('{' + sChartSeriesStructure + '}');
    const sParsedPolar = JSON.parse(sPolarStructure);
    const sParsedX = JSON.parse(sXAxis);
    const sParsedY = JSON.parse(sYAxis);
    return { series: sParsedSeries, polar: sParsedPolar, xAxis: sParsedX, yAxis: sParsedY };
};

/** replace common opt */
const ReplaceCommonOpt = (aCommonOpt: any) => {
    const sCommOptList: string[] = Object.keys(aCommonOpt);
    let sParsedOpt: any = StructureOfCommonOption;
    sCommOptList.map((aOpt: string) => {
        if (aOpt === 'isDataZoom') sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt.isDataZoom ? JSON.stringify([{ type: 'slider' }]) : false);
        else sParsedOpt = sParsedOpt.replace(`$${aOpt}$`, aCommonOpt[aOpt]);
    });
    const sResult = JSON.parse(sParsedOpt);
    if (sResult.tooltip.show && sResult.tooltip.trigger === 'axis') sResult.tooltip.formatter = ChartLineStackTooltipFormatter;
    return sResult;
};

const ParseOpt = (aChartType: string, aDataType: string, aTagList: any, aCommonOpt: any, aTypeOpt: any) => {
    const sResultOpt: any = { ...aCommonOpt, ...aTypeOpt.polar, ...aTypeOpt.xAxis, ...aTypeOpt.yAxis };
    const sXLen: number = sResultOpt.xAxis && sResultOpt.xAxis.length;
    const sYLen: number = sResultOpt.yAxis && sResultOpt.yAxis.length;

    if (aDataType === 'TIME_VALUE') {
        sResultOpt.series = aTagList.map((aTag: string, aIdx: number) => {
            return {
                ...aTypeOpt.series,
                type: aChartType,
                data: [],
                name: aTag,
                xAxisIndex: sXLen > aIdx ? aIdx : 0,
                yAxisIndex: sYLen > aIdx ? aIdx : 0,
            };
        });
    } else if (aDataType === 'NAME_VALUE') {
        sResultOpt.series = [
            {
                ...aTypeOpt.series,
                type: aChartType,
                data: [],
            },
        ];
        sResultOpt.dataset = { dataset: [] };
    }
    return sResultOpt;
};

export const DashboardChartOptionParser = async (aOptionInfo: any, aTagList: any) => {
    const sCommonOpt = ReplaceCommonOpt(aOptionInfo.commonOptions);
    const sTypeOpt = ReplaceTypeOpt(aOptionInfo.type, SqlResDataType(aOptionInfo.type), aOptionInfo.chartOptions, aOptionInfo.xAxisOptions, aOptionInfo.yAxisOptions);
    const sParsedOpt = ParseOpt(aOptionInfo.type, SqlResDataType(aOptionInfo.type), aTagList, sCommonOpt, sTypeOpt);
    return sParsedOpt;
};
