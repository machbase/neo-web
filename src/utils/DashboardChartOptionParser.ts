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
const StructureOption: any = {
    line: `{
            "areaStyle": $areaStyle$,
            "smooth": $smooth$,
            "step": $isStep$,
            "stack": $isStack$,
            "connectNulls": $connectNulls$,
            "lineStyle": null,
            "markLine": $markLine$,
            "data": []
    }`,
    bar: `{
        "coordinateSystem": "cartesian2d",
        "large": false,
        "stack": false
    }`,
    scatter: `{
        "large": false,
        "symbolSize": 10
    }`,
    pie: `{
        "radius": [0, "70%"],
        "avoidLabelOverlap": false,
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
    }`,
    gauge: `{
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
    }`,
};

/** replace type opt */
const ReplaceTypeOpt = (aChartType: string, aChartOption: any) => {
    let sChartStructure: any = StructureOption[aChartType];
    const sChartOptList: string[] = Object.keys(aChartOption);
    sChartOptList.map((aOpt: string) => {
        if (aOpt === 'markLine') sChartStructure = sChartStructure.replace(`$${aOpt}$`, JSON.stringify(aChartOption[aOpt]));
        else sChartStructure = sChartStructure.replace(`$${aOpt}$`, aChartOption[aOpt]);
    });
    const sParsedSeries = JSON.parse(sChartStructure);
    return sParsedSeries;
};

const ParseOpt = (aChartType: string, aDataType: string, aTagList: any, aCommonOpt: any, aTypeOpt: any, aXAxis: any, aYAxis: any) => {
    const sResultOpt: any = { ...aCommonOpt };
    if (aDataType === 'TIME_VALUE') {
        sResultOpt.series = aTagList.map((aTag: string) => {
            return {
                ...aTypeOpt,
                type: aChartType,
                data: [],
                name: aTag,
            };
        });
        sResultOpt.xAxis = aXAxis;
        sResultOpt.yAxis = aYAxis;
    } else if (aDataType === 'NAME_VALUE') {
        sResultOpt.series = [
            {
                ...aTypeOpt,
                type: aChartType,
                data: [],
            },
        ];
        sResultOpt.dataset = { dataset: [] };
    }
    return sResultOpt;
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
    if (sResult.tooltip.show) sResult.tooltip.formatter = ChartLineStackTooltipFormatter;
    return sResult;
};

export const DashboardChartOptionParser = async (aOptionInfo: any, aTagList: any) => {
    const sCommonOpt = ReplaceCommonOpt(aOptionInfo.commonOptions);
    const sTypeOpt = ReplaceTypeOpt(aOptionInfo.type, aOptionInfo.chartOptions);
    const sParsedOpt = ParseOpt(aOptionInfo.type, SqlResDataType(aOptionInfo.type), aTagList, sCommonOpt, sTypeOpt, aOptionInfo.xAxisOptions, aOptionInfo.yAxisOptions);
    return sParsedOpt;
};
