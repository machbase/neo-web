import { getTimeZoneValue } from '@/utils/utils';

export function buildChartConfig(pPanelInfo: any, pAreaChart: any, pIsUpdate: any, pViewMinMaxPopup: any, pChartWrap: any) {
    return {
        spacing: pPanelInfo.show_legend === 'Y' ? [10, 10, 15, 10] : [10, 10, 30, 10],
        height: 300,
        backgroundColor: '#252525',
        fill: 'red',
        type: pPanelInfo.fill > 0 ? 'area' : 'line',
        zoomType: 'x',
        lineWidth: 1,
        width: pAreaChart?.current?.clientWidth,
        events: {
            selection: pIsUpdate ? pViewMinMaxPopup : false,
            render() {
                pChartWrap &&
                    pChartWrap?.current?.container?.current
                        ?.getElementsByClassName('highcharts-series-group')[0]
                        ?.setAttribute('clip-path', 'none');
                pAreaChart && pAreaChart?.current && pAreaChart?.current?.setAttribute('data-processed', true);
            },
        },
        zooming: {
            mouseWheel: {
                enabled: false,
            },
        },
    };
}

export function buildPlotOptionsConfig(pPanelInfo: any) {
    return {
        boost: {
            useGPUTranslations: true,
            seriesThreshold: 5,
        },
        series: {
            boostThreshold: 5000,
            showInNavigator: false,
            lineWidth: pPanelInfo.stroke,
            fillOpacity: pPanelInfo.fill,
            cursor: 'pointer',
            marker: {
                enabled: pPanelInfo.show_point === 'Y',
                radius: pPanelInfo.point_radius,
            },
            states: {
                hover: {
                    enabled: true,
                    lineWidthPlus: 0,
                    lineWidth: 0,
                },
            },
            dataGrouping: {
                enabled: false,
            },
            point: {},
        },
    };
}

export function buildNavigatorConfig(pNavigatorData: any, pAreaChart: any, pNavigatorRange: any, pSetNavigatorExtremes: any) {
    return {
        enabled: true,
        adaptToUpdatedData: false,
        handles: {
            opacity: 0,
            height: 26,
            width: 7,
        },
        height: 24,
        maskFill: 'rgba(119, 119, 119, .3)',
        series:
            pNavigatorData && pNavigatorData?.datasets
                ? pNavigatorData?.datasets.map((i: any) => {
                      return {
                          data: i.data,
                          marker: i.marker,
                          type: 'line',
                          fillOpacity: 1,
                          lineWidth: 1,
                          dataGrouping: { enabled: false },
                          animation: false,
                      };
                  })
                : [],
        outlineWidth: 1,
        outlineColor: '#323333',
        xAxis: {
            width: pAreaChart?.current?.clientWidth - 55,
            left: 28,
            type: 'datetime',
            min: pNavigatorRange.startTime,
            max: pNavigatorRange.endTime,
            labels: {
                align: 'center',
                style: {
                    color: '#afb5bc',
                    fontSize: '10px',
                },
                y: 20,
            },
            events: { setExtremes: pSetNavigatorExtremes },
            gridLineColor: '#323333',
        },
        yAxis: {
            gridLineColor: '#323333',
            gridLineWidth: 1,
        },
        margin: 45,
    };
}

export function buildXAxisConfig(pPanelInfo: any, pSetExtremes: any, pPanelRange: any) {
    return {
        zoomEnabled: pPanelInfo.use_zoom === 'Y',
        type: 'datetime',
        ordinal: false,
        gridLineWidth: pPanelInfo.show_x_tickline === 'Y' ? 1 : 0,
        gridLineColor: '#323333',
        lineColor: '#323333',
        events: {
            setExtremes: pSetExtremes,
        },
        labels: {
            align: 'center',
            style: {
                color: '#f8f8f8',
                fontSize: '10px',
            },
            y: 35,
        },
        minorTickColor: 'red',
        min: pPanelRange.startTime,
        max: pPanelRange.endTime,
        crosshair: {
            snap: false,
            width: 0.5,
            color: 'red',
        },
        tickColor: '#323333',
    };
}

function buildPlotLine(useFlag: string, color: string, value: any) {
    return {
        color: useFlag === 'Y' ? color : 'transparent',
        dashStyle: 'solid',
        value,
        width: 1,
        zIndex: 7,
    };
}

const yAxisLable = {
    align: 'center',
    style: {
        color: '#afb5bc',
        fontSize: '10px',
    },
    x: -5,
    y: 3,
};

export function buildYAxisConfig(pPanelInfo: any, pIsRaw: any, updateYaxis: any, newMinMax: any) {
    return [
        {
            tickAmount: 5,
            tickPositions: updateYaxis().left[0] === updateYaxis().left[1] && [updateYaxis().left[0]],
            min: newMinMax.min,
            max: newMinMax.max,
            showLastLabel: pPanelInfo.use_normalize === 'N',
            gridLineWidth: pPanelInfo.show_y_tickline === 'Y' ? 1 : 0,
            startOnTick: true,
            endOnTick: true,
            gridLineColor: '#323333',
            lineColor: '#323333',
            labels: yAxisLable,
            opposite: false,
            plotLines: [
                buildPlotLine(pPanelInfo.use_ucl, '#ec7676', pPanelInfo.ucl_value),
                buildPlotLine(pPanelInfo.use_lcl, 'orange', pPanelInfo.lcl_value),
            ],
        },
        {
            tickAmount: 5,
            tickPositions: updateYaxis().right[0] === updateYaxis().right[1] && [updateYaxis().right[0]],
            min: !pIsRaw
                ? Number(pPanelInfo.custom_min2) === 0 && Number(pPanelInfo.custom_max2) === 0
                    ? pPanelInfo.use_normalize === 'Y'
                        ? 0
                        : updateYaxis().right[0]
                    : Number(pPanelInfo.custom_min2)
                : Number(pPanelInfo.custom_drilldown_min2) === 0 && Number(pPanelInfo.custom_drilldown_max2) === 0
                  ? pPanelInfo.use_normalize === 'Y'
                      ? 0
                      : updateYaxis().right[0]
                  : Number(pPanelInfo.custom_drilldown_min2),
            max: !pIsRaw
                ? Number(pPanelInfo.custom_min2) === 0 && Number(pPanelInfo.custom_max2) === 0
                    ? pPanelInfo.use_normalize === 'Y'
                        ? 100
                        : updateYaxis().right[1]
                    : Number(pPanelInfo.custom_max2)
                : Number(pPanelInfo.custom_drilldown_min2) === 0 && Number(pPanelInfo.custom_drilldown_max2) === 0
                  ? pPanelInfo.use_normalize === 'Y'
                      ? 100
                      : updateYaxis().right[1]
                  : Number(pPanelInfo.custom_drilldown_max2),
            showLastLabel: pPanelInfo.use_normalize === 'N',
            gridLineWidth: pPanelInfo.show_y_tickline2 === 'Y' ? 1 : 0,
            gridLineColor: '#323333',
            lineColor: '#323333',
            startOnTick: true,
            endOnTick: true,
            labels: yAxisLable,
            opposite: pPanelInfo.use_right_y2 === 'Y',
            plotLines: [
                buildPlotLine(pPanelInfo.use_ucl2, '#ec7676', pPanelInfo.ucl2_value),
                buildPlotLine(pPanelInfo.use_lcl2, 'orange', pPanelInfo.lcl2_value),
            ],
        },
    ];
}

export function buildTooltipConfig() {
    return {
        split: false,
        shared: true,
        followPointer: true,
        backgroundColor: '#1f1d1d',
        borderColor: '#292929',
        borderWidth: 1,
        xDateFormat: '%Y-%m-%d %H:%M:%S',
        formatter: function (this: any) {
            return `<div>
                <div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">${
                    String(this.x).includes('.')
                        ? new Date(this.x - getTimeZoneValue() * 60000)
                              .toISOString()
                              .replace('T', ' ')
                              .replace('Z', '') +
                          '.' +
                          String(this.x).split('.')[1]
                        : new Date(this.x - getTimeZoneValue() * 60000)
                              .toISOString()
                              .replace('T', ' ')
                              .replace('Z', '')
                }</div></div>
                <br/>
                ${this?.points.map((aPoint: any) => {
                    return `<p style="color: ${aPoint.color}; margin:0px; padding:0px;">${aPoint.series.name}</p>  <p style="color: ${aPoint.color}">${aPoint.y}</p><br />`;
                })}</div>`;
        },
    };
}

export function buildLegendConfig(pPanelInfo: any, pAreaChart: any) {
    return {
        enabled: pPanelInfo.show_legend === 'Y',
        align: 'left',
        itemDistance: 15,
        itemWidth: pAreaChart?.current?.clientWidth / 6.2,
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
}

export const scrollbarConfig = {
    liveRedraw: false,
    enabled: false,
};

export const rangeSelectorConfig = {
    buttons: [],
    allButtonsEnabled: false,
    selected: 1,
    inputEnabled: false,
};

export const accessibilityConfig = {
    enabled: false,
};

export const langConfig = {
    noData: 'No data',
};

export const noDataConfig = {
    style: {
        fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
        fontSize: '24px',
        color: '#9ca2ab',
        fontStyle: 'italic',
        fontWeight: 'normal',
    },
};

export const creditsConfig = {
    enabled: false,
};
