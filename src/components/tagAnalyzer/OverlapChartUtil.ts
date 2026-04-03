import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';

export const OVERLAP_CHART_COLORS = ['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'];

export const overlapChartAccessibilityConfig = {
    enabled: false,
};

export const overlapChartTitleConfig = {
    text: '',
};

export const overlapChartScrollbarConfig = {
    enabled: false,
};

export const overlapChartRangeSelectorConfig = {
    buttons: [],
    allButtonsEnabled: false,
    selected: 1,
    inputEnabled: false,
};

export const overlapChartLangConfig = {
    noData: 'No data',
};

export const overlapChartNoDataConfig = {
    style: {
        fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
        fontSize: '24px',
        color: '#9ca2ab',
        fontStyle: 'italic',
        fontWeight: 'normal',
    },
};

export const overlapChartCreditsConfig = {
    enabled: false,
};

function getMinValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] < result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1],
    );
}

function getMaxValue(array: number[][], zeroBaseCondition: boolean) {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] > result) result = current[1];
            return result;
        },
        zeroBaseCondition ? 0 : array[0]?.[1],
    );
}

function updateYAxis(pChartData: any, pZeroBase: boolean) {
    const yAxis: any = {
        left: [] as number[],
        right: [] as number[],
    };

    const newData = pChartData && JSON.parse(JSON.stringify(pChartData));
    newData?.forEach((item: any) => {
        if (item.yAxis === 0) {
            if (!yAxis.left[0] || yAxis.left[0] > getMinValue(item.data, pZeroBase)) {
                yAxis.left[0] = getMinValue(item.data, pZeroBase);
            }
            if (!yAxis.left[1] || yAxis.left[1] < getMaxValue(item.data, pZeroBase)) {
                yAxis.left[1] = getMaxValue(item.data, pZeroBase);
            }
        }
        if (item.yAxis === 1) {
            if (!yAxis.right[0] || yAxis.right[0] > getMinValue(item.data, pZeroBase)) {
                yAxis.right[0] = getMinValue(item.data, pZeroBase);
            }
            if (!yAxis.right[1] || yAxis.right[1] < getMaxValue(item.data, pZeroBase)) {
                yAxis.right[1] = getMaxValue(item.data, pZeroBase);
            }
        }
    });

    return yAxis;
}

function buildOverlapChartConfig(chartWidth: number) {
    return {
        spacing: [50, 10, 15, 10],
        height: 300,
        backgroundColor: '#2a2a2a',
        type: 'line',
        zoomType: 'x',
        lineWidth: 1,
        width: chartWidth - 10,
    };
}

const overlapPlotOptionsConfig = {
    series: {
        showInNavigator: false,
        lineWidth: 0.5,
        cursor: 'pointer',
        marker: {
            enabled: false,
            radius: 0,
        },
        states: {
            hover: {
                enabled: true,
                lineWidthPlus: 0,
                lineWidth: 0,
            },
        },
        point: {},
    },
};

const overlapXAxisConfig = {
    zoomEnabled: false,
    type: 'datetime',
    ordinal: false,
    gridLineWidth: 1,
    gridLineColor: '#323333',
    lineColor: '#323333',
    labels: {
        align: 'center',
        style: {
            color: '#f8f8f8',
            fontSize: '10px',
        },
        y: 35,
        dateTimeLabelFormats: {
            millisecond: '%H:%M:%S.%L',
            second: '%H:%M:%S',
            minute: '%H:%M',
            hour: '%H:%M',
            day: '%e. %b',
            week: '%e. %b',
            month: '%e. %b',
            year: '',
        },
    },
    minorTickColor: 'red',
    crosshair: {
        snap: false,
        width: 0.5,
        color: 'red',
    },
    tickColor: '#323333',
};

function buildOverlapYAxisConfig(pChartData: any, pZeroBase: boolean) {
    const yAxisRange = updateYAxis(pChartData, pZeroBase);

    return [
        {
            min: yAxisRange.left[0],
            max: yAxisRange.left[1],
            startOnTick: true,
            endOnTick: true,
            gridLineColor: '#323333',
            lineColor: '#323333',
            labels: {
                align: 'center',
                style: {
                    color: '#afb5bc',
                    fontSize: '10px',
                },
                x: -5,
                y: 3,
            },
            opposite: false,
        },
    ];
}

function buildOverlapTooltipConfig(pChartData: any, pStartTimeList: any) {
    return {
        valueDecimals: 2,
        split: false,
        shared: true,
        followPointer: true,
        backgroundColor: '#1f1d1d',
        borderColor: '#292929',
        borderWidth: 1,
        xDateFormat: '%H:%M:%S.%L',
        headerFormat: `<div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">{point.key}</div>`,
        pointFormat:
            '<br/><div style="display: flex; justifyContent: space-between"><p style="color: {series.color}">{series.name}</p><p style="color: {series.color}">{point.y} {point.key} {series.x}</p><' +
            '/div>',
        footerFormat: '<div></div>',
        formatter: function (): any {
            return `<div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">${(this as any).points
                .map((aItem: any) => {
                    return `<div style="color: ${aItem.color}">${
                        pChartData[aItem.colorIndex].name +
                        ' : ' +
                        toDateUtcChart((this as any).x + pStartTimeList[aItem.colorIndex] - 1000 * 60 * getTimeZoneValue(), true) +
                        ' : ' +
                        aItem.y
                    }</div>`;
                })
                .join('<br/>')}</div>`;
        },
    };
}

const overlapLegendConfig = {
    enabled: true,
    align: 'left',
    itemDistance: 15,
    squareSymbol: true,
    symbolRadius: 1,
    itemHoverStyle: {
        color: '#23527c',
        'text-decoration': 'underline',
    },
    itemStyle: {
        color: '#e7e8ea',
        cursor: 'pointer',
        fontSize: '10px',
        fontWeight: 'none',
        'font-family': 'Open Sans,Helvetica,Arial,sans-serif',
        textOverflow: 'ellipsis',
        'text-decoration': 'none',
    },
    margin: 20,
};

export function buildOverlapChartOptions(pChartData: any, pStartTimeList: any, pZeroBase: boolean, pChartWidth: number) {
    return {
        accessibility: overlapChartAccessibilityConfig,
        title: overlapChartTitleConfig,
        colors: OVERLAP_CHART_COLORS,
        chart: buildOverlapChartConfig(pChartWidth),
        series: pChartData,
        plotOptions: overlapPlotOptionsConfig,
        scrollbar: overlapChartScrollbarConfig,
        rangeSelector: overlapChartRangeSelectorConfig,
        xAxis: overlapXAxisConfig,
        yAxis: buildOverlapYAxisConfig(pChartData, pZeroBase),
        tooltip: buildOverlapTooltipConfig(pChartData, pStartTimeList),
        legend: overlapLegendConfig,
        lang: overlapChartLangConfig,
        noData: overlapChartNoDataConfig,
        credits: overlapChartCreditsConfig,
    };
}
