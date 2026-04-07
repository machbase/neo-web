import moment from 'moment';
import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type {
    TagAnalyzerChartData,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerTimeRange,
    TagAnalyzerYN,
} from './TagAnalyzerPanelModelTypes';

type PanelEChartOptionParams = {
    chartData?: TagAnalyzerChartSeriesItem[];
    navigatorData?: TagAnalyzerChartData;
    panelRange: TagAnalyzerTimeRange;
    navigatorRange: TagAnalyzerTimeRange;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    isRaw: boolean;
    useNormalize?: TagAnalyzerYN;
    visibleSeries: Record<string, boolean>;
};

const PANEL_BACKGROUND = '#252525';
const NAVIGATOR_HEIGHT = 48;

const PANEL_AXIS_LABEL_STYLE = {
    color: '#f8f8f8',
    fontSize: 10,
};

const NAVIGATOR_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
};

const Y_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
};

const LEGEND_TEXT_STYLE = {
    color: '#e7e8ea',
    fontSize: 10,
};

const TOOLTIP_TEXT_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
};

const NO_DATA_STYLE = {
    color: '#9ca2ab',
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: 'normal',
};

const buildThresholdLine = (aUseFlag: string, aColor: string, aValue: number) => {
    if (aUseFlag !== 'Y') {
        return undefined;
    }

    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: aColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: aValue }],
    };
};

const getMinValue = (aSeriesData: number[][], aZeroBaseCondition: boolean) => {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] < aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
};

const getMaxValue = (aSeriesData: number[][], aZeroBaseCondition: boolean) => {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] > aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
};

const getYAxisValues = (aChartData: TagAnalyzerChartSeriesItem[] | undefined, aAxes: TagAnalyzerPanelAxes) => {
    const sYAxis = {
        left: [] as number[],
        right: [] as number[],
    };

    aChartData?.forEach((aItem) => {
        if (!aItem.data?.length) {
            return;
        }

        if (aItem.yAxis === 0) {
            const sMin = getMinValue(aItem.data, aAxes.zero_base === 'Y');
            const sMax = getMaxValue(aItem.data, aAxes.zero_base === 'Y');

            if (sYAxis.left[0] === undefined || sYAxis.left[0] > sMin) {
                sYAxis.left[0] = sMin;
            }
            if (sYAxis.left[1] === undefined || sYAxis.left[1] < sMax) {
                sYAxis.left[1] = sMax;
            }
        }

        if (aItem.yAxis === 1) {
            const sMin = getMinValue(aItem.data, aAxes.zero_base2 === 'Y');
            const sMax = getMaxValue(aItem.data, aAxes.zero_base2 === 'Y');

            if (sYAxis.right[0] === undefined || sYAxis.right[0] > sMin) {
                sYAxis.right[0] = sMin;
            }
            if (sYAxis.right[1] === undefined || sYAxis.right[1] < sMax) {
                sYAxis.right[1] = sMax;
            }
        }
    });

    if (sYAxis.left[0] !== undefined) {
        sYAxis.left[0] = Math.floor(sYAxis.left[0] * 1000) / 1000;
        sYAxis.left[1] = Math.ceil(sYAxis.left[1] * 1000) / 1000;
    }
    if (sYAxis.right[0] !== undefined) {
        sYAxis.right[0] = Math.floor(sYAxis.right[0] * 1000) / 1000;
        sYAxis.right[1] = Math.ceil(sYAxis.right[1] * 1000) / 1000;
    }

    return sYAxis;
};

const getLeftAxisRange = (
    aAxes: TagAnalyzerPanelAxes,
    aIsRaw: boolean,
    aYAxisValues: ReturnType<typeof getYAxisValues>,
) => {
    const sMin = aIsRaw ? Number(aAxes.custom_drilldown_min) : Number(aAxes.custom_min);
    const sMax = aIsRaw ? Number(aAxes.custom_drilldown_max) : Number(aAxes.custom_max);

    if (sMin === 0 && sMax === 0) {
        return {
            min: aYAxisValues.left[0],
            max: aYAxisValues.left[1],
        };
    }

    return { min: sMin, max: sMax };
};

const getRightAxisRange = (
    aAxes: TagAnalyzerPanelAxes,
    aIsRaw: boolean,
    aUseNormalize?: TagAnalyzerYN,
    aYAxisValues?: ReturnType<typeof getYAxisValues>,
) => {
    const sDefaultMin = aUseNormalize === 'Y' ? 0 : aYAxisValues?.right[0];
    const sDefaultMax = aUseNormalize === 'Y' ? 100 : aYAxisValues?.right[1];

    if (!aIsRaw) {
        if (Number(aAxes.custom_min2) === 0 && Number(aAxes.custom_max2) === 0) {
            return { min: sDefaultMin, max: sDefaultMax };
        }

        return {
            min: Number(aAxes.custom_min2),
            max: Number(aAxes.custom_max2),
        };
    }

    if (Number(aAxes.custom_drilldown_min2) === 0 && Number(aAxes.custom_drilldown_max2) === 0) {
        return { min: sDefaultMin, max: sDefaultMax };
    }

    return {
        min: Number(aAxes.custom_drilldown_min2),
        max: Number(aAxes.custom_drilldown_max2),
    };
};

const formatTooltipTime = (aValue: number) => {
    const sValueText = String(aValue);
    if (sValueText.includes('.')) {
        return (
            new Date(aValue - getTimeZoneValue() * 60000).toISOString().replace('T', ' ').replace('Z', '') +
            '.' +
            sValueText.split('.')[1]
        );
    }

    return new Date(aValue - getTimeZoneValue() * 60000).toISOString().replace('T', ' ').replace('Z', '');
};

const formatAxisTime = (aValue: number, aRange: TagAnalyzerTimeRange) => {
    const sDiff = aRange.endTime - aRange.startTime;

    if (sDiff <= 60 * 60 * 1000) {
        return moment.utc(aValue).format('HH:mm:ss');
    }

    if (sDiff <= 24 * 60 * 60 * 1000) {
        return moment.utc(aValue).format('HH:mm');
    }

    if (sDiff <= 30 * 24 * 60 * 60 * 1000) {
        return moment.utc(aValue).format('MM-DD HH:mm');
    }

    return moment.utc(aValue).format('YYYY-MM-DD');
};

const buildYAxis = ({
    axes,
    chartData,
    isRaw,
    useNormalize,
}: {
    axes: TagAnalyzerPanelAxes;
    chartData?: TagAnalyzerChartSeriesItem[];
    isRaw: boolean;
    useNormalize?: TagAnalyzerYN;
}) => {
    const sYAxisValues = getYAxisValues(chartData, axes);
    const sLeftAxisRange = getLeftAxisRange(axes, isRaw, sYAxisValues);
    const sRightAxisRange = getRightAxisRange(axes, isRaw, useNormalize, sYAxisValues);

    return [
        {
            type: 'value',
            gridIndex: 0,
            min: sLeftAxisRange.min,
            max: sLeftAxisRange.max,
            axisLine: { lineStyle: { color: '#323333' } },
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: axes.show_y_tickline === 'Y',
                lineStyle: { color: '#323333', width: 1 },
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 0,
            min: sRightAxisRange.min,
            max: sRightAxisRange.max,
            position: axes.use_right_y2 === 'Y' ? 'right' : 'left',
            axisLine: { lineStyle: { color: '#323333' } },
            axisLabel: {
                ...Y_AXIS_LABEL_STYLE,
                show: Boolean(chartData?.some((aItem) => aItem.yAxis === 1)),
            },
            splitLine: {
                show: axes.show_y_tickline2 === 'Y',
                lineStyle: { color: '#323333', width: 1 },
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 1,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            scale: true,
        },
    ];
};

const buildMainSeries = ({
    chartData,
    display,
    axes,
}: {
    chartData?: TagAnalyzerChartSeriesItem[];
    display: TagAnalyzerPanelDisplay;
    axes: TagAnalyzerPanelAxes;
}) => {
    const sLeftThreshold = buildThresholdLine(axes.use_ucl, '#ec7676', axes.ucl_value);
    const sLeftLowerThreshold = buildThresholdLine(axes.use_lcl, 'orange', axes.lcl_value);
    const sRightThreshold = buildThresholdLine(axes.use_ucl2, '#ec7676', axes.ucl2_value);
    const sRightLowerThreshold = buildThresholdLine(axes.use_lcl2, 'orange', axes.lcl2_value);

    return (chartData ?? []).map((aSeries, aIndex) => {
        const sMarkLineData = [];

        if (aSeries.yAxis === 0) {
            if (sLeftThreshold?.data?.[0]) sMarkLineData.push(sLeftThreshold.data[0]);
            if (sLeftLowerThreshold?.data?.[0]) sMarkLineData.push(sLeftLowerThreshold.data[0]);
        } else {
            if (sRightThreshold?.data?.[0]) sMarkLineData.push(sRightThreshold.data[0]);
            if (sRightLowerThreshold?.data?.[0]) sMarkLineData.push(sRightLowerThreshold.data[0]);
        }

        return {
            id: `main-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: aSeries.yAxis ?? 0,
            data: aSeries.data,
            symbol: 'circle',
            showSymbol: display.show_point === 'Y',
            symbolSize: display.point_radius ? display.point_radius * 2 : 0,
            lineStyle: {
                width: display.stroke,
                color: aSeries.color,
            },
            itemStyle: {
                color: aSeries.color,
            },
            areaStyle: display.fill > 0 ? { opacity: display.fill, color: aSeries.color } : undefined,
            connectNulls: false,
            animation: false,
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            emphasis: {
                focus: 'series',
            },
            markLine:
                sMarkLineData.length > 0
                    ? {
                          silent: true,
                          symbol: 'none',
                          lineStyle: {
                              width: 1,
                          },
                          label: { show: false },
                          data: sMarkLineData,
                      }
                    : undefined,
        };
    });
};

const buildNavigatorSeries = ({
    navigatorData,
    display,
}: {
    navigatorData?: TagAnalyzerChartData;
    display: TagAnalyzerPanelDisplay;
}) => {
    return (navigatorData?.datasets ?? []).map((aSeries, aIndex) => ({
        id: `navigator-series-${aIndex}`,
        name: `${aSeries.name}-navigator`,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 2,
        data: aSeries.data,
        lineStyle: {
            width: 1,
            color: aSeries.color ?? '#90949b',
            opacity: 0.9,
        },
        areaStyle: display.fill > 0 ? { opacity: Math.min(display.fill, 0.2), color: aSeries.color } : undefined,
        itemStyle: {
            color: aSeries.color ?? '#90949b',
        },
        showSymbol: false,
        silent: true,
        animation: false,
    }));
};

const buildLegendSelectedMap = (
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
) => {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        aResult[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aResult;
    }, {});
};

export const buildDefaultVisibleSeriesMap = (aChartData?: TagAnalyzerChartSeriesItem[]) => {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        if (aResult[aSeries.name] === undefined) {
            aResult[aSeries.name] = true;
        }
        return aResult;
    }, {});
};

export const buildVisibleSeriesList = (
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
) => {
    return (aChartData ?? []).map((aSeries) => ({
        name: aSeries.name,
        visible: aVisibleSeries[aSeries.name] !== false,
    }));
};

export const extractDataZoomRange = (aParams: any, aCurrentRange: TagAnalyzerTimeRange): TagAnalyzerTimeRange => {
    const sZoomData = aParams?.batch?.[0] ?? aParams ?? {};
    const sStartValue = Array.isArray(sZoomData.startValue) ? sZoomData.startValue[0] : sZoomData.startValue ?? sZoomData.start ?? aCurrentRange.startTime;
    const sEndValue = Array.isArray(sZoomData.endValue) ? sZoomData.endValue[0] : sZoomData.endValue ?? sZoomData.end ?? aCurrentRange.endTime;

    return {
        startTime: Number(sStartValue),
        endTime: Number(sEndValue),
    };
};

export const extractBrushRange = (aParams: any): TagAnalyzerTimeRange | undefined => {
    const sArea = aParams?.areas?.[0] ?? aParams?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    return {
        startTime: Math.floor(Number(sRange[0])),
        endTime: Math.ceil(Number(sRange[1])),
    };
};

export const buildPanelChartOption = ({
    chartData,
    navigatorData,
    panelRange,
    navigatorRange,
    axes,
    display,
    isRaw,
    useNormalize,
    visibleSeries,
}: PanelEChartOptionParams) => {
    return {
        animation: false,
        backgroundColor: PANEL_BACKGROUND,
        textStyle: {
            fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
        },
        grid: [
            {
                left: 35,
                right: 35,
                top: display.show_legend === 'Y' ? 42 : 16,
                height: 208,
            },
            {
                left: 35,
                right: 35,
                bottom: 18,
                height: NAVIGATOR_HEIGHT,
            },
        ],
        legend: {
            show: display.show_legend === 'Y',
            left: 10,
            top: 6,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
            selected: buildLegendSelectedMap(chartData, visibleSeries),
        },
        tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: '#1f1d1d',
            borderColor: '#292929',
            borderWidth: 1,
            textStyle: TOOLTIP_TEXT_STYLE,
            axisPointer: {
                type: 'cross',
                lineStyle: {
                    color: 'red',
                    width: 0.5,
                },
            },
            formatter: (aParams: any) => {
                const sItems = Array.isArray(aParams) ? aParams.filter((aItem: any) => aItem?.seriesId?.startsWith('main-series')) : [aParams];
                if (sItems.length === 0) {
                    return '';
                }

                const sTime = formatTooltipTime(Number(sItems[0].value?.[0] ?? sItems[0].axisValue));

                return `<div>
                    <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
                    <br/>
                    ${sItems
                        .map(
                            (aItem: any) =>
                                `<p style="color:${aItem.color};margin:0;padding:0;">${aItem.seriesName}</p><p style="color:${aItem.color};margin:0;padding:0;">${aItem.value?.[1] ?? ''}</p><br />`,
                        )
                        .join('')}
                </div>`;
            },
        },
        axisPointer: {
            link: [{ xAxisIndex: [0, 1] }],
        },
        xAxis: [
            {
                type: 'time',
                gridIndex: 0,
                min: navigatorRange.startTime,
                max: navigatorRange.endTime,
                axisLine: { lineStyle: { color: '#323333' } },
                axisTick: { lineStyle: { color: '#323333' } },
                axisLabel: {
                    ...PANEL_AXIS_LABEL_STYLE,
                    formatter: (aValue: number) => formatAxisTime(aValue, navigatorRange),
                },
                splitLine: {
                    show: display.use_zoom === 'Y' && axes.show_x_tickline === 'Y',
                    lineStyle: { color: '#323333' },
                },
                axisPointer: {
                    label: {
                        show: false,
                    },
                },
            },
            {
                type: 'time',
                gridIndex: 1,
                min: navigatorRange.startTime,
                max: navigatorRange.endTime,
                axisLine: { lineStyle: { color: '#323333' } },
                axisTick: { show: false },
                axisLabel: {
                    ...NAVIGATOR_AXIS_LABEL_STYLE,
                    formatter: (aValue: number) => formatAxisTime(aValue, navigatorRange),
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: '#323333' },
                },
            },
        ],
        yAxis: buildYAxis({
            axes,
            chartData,
            isRaw,
            useNormalize,
        }),
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: [0],
                filterMode: 'none',
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
                zoomOnMouseWheel: false,
                preventDefaultMouseMove: true,
                startValue: panelRange.startTime,
                endValue: panelRange.endTime,
                disabled: display.use_zoom !== 'Y',
            },
            {
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'none',
                left: 35,
                right: 35,
                bottom: 22,
                height: NAVIGATOR_HEIGHT - 4,
                showDetail: false,
                brushSelect: false,
                startValue: panelRange.startTime,
                endValue: panelRange.endTime,
                backgroundColor: 'rgba(0,0,0,0)',
                borderColor: '#323333',
                fillerColor: 'rgba(119, 119, 119, 0.3)',
                dataBackground: {
                    lineStyle: {
                        opacity: 0,
                    },
                    areaStyle: {
                        opacity: 0,
                    },
                },
                selectedDataBackground: {
                    lineStyle: {
                        opacity: 0,
                    },
                    areaStyle: {
                        opacity: 0,
                    },
                },
                handleSize: 20,
                handleStyle: {
                    color: 'rgba(248,248,248,0.4)',
                    borderColor: '#323333',
                },
                moveHandleStyle: {
                    color: 'rgba(248,248,248,0.15)',
                    opacity: 0.4,
                },
            },
        ],
        brush: {
            toolbox: [],
            xAxisIndex: 0,
            brushMode: 'single',
            throttleType: 'debounce',
            throttleDelay: 150,
            brushStyle: {
                color: 'rgba(68, 170, 213, 0.2)',
                borderColor: 'rgba(68, 170, 213, 0.5)',
            },
        },
        series: [
            ...buildMainSeries({
                chartData,
                display,
                axes,
            }),
            ...buildNavigatorSeries({
                navigatorData,
                display,
            }),
        ],
        toolbox: {
            show: false,
        },
        title: {
            show: false,
        },
        noData: {
            style: NO_DATA_STYLE,
        },
    };
};

export const buildOverlapChartOption = ({
    chartData,
    startTimeList,
    zeroBase,
}: {
    chartData: TagAnalyzerChartSeriesItem[];
    startTimeList: number[];
    zeroBase: boolean;
}) => {
    const sYAxisValues = getYAxisValues(chartData, {
        show_x_tickline: 'Y',
        pixels_per_tick_raw: 0,
        pixels_per_tick: 0,
        use_sampling: false,
        sampling_value: 0,
        zero_base: zeroBase ? 'Y' : 'N',
        show_y_tickline: 'Y',
        custom_min: 0,
        custom_max: 0,
        custom_drilldown_min: 0,
        custom_drilldown_max: 0,
        use_ucl: 'N',
        ucl_value: 0,
        use_lcl: 'N',
        lcl_value: 0,
        use_right_y2: 'N',
        zero_base2: zeroBase ? 'Y' : 'N',
        show_y_tickline2: 'N',
        custom_min2: 0,
        custom_max2: 0,
        custom_drilldown_min2: 0,
        custom_drilldown_max2: 0,
        use_ucl2: 'N',
        ucl2_value: 0,
        use_lcl2: 'N',
        lcl2_value: 0,
    });

    return {
        animation: false,
        backgroundColor: '#2a2a2a',
        color: ['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'],
        legend: {
            show: true,
            left: 10,
            top: 6,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
        },
        grid: {
            left: 35,
            right: 18,
            top: 42,
            bottom: 28,
        },
        tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: '#1f1d1d',
            borderColor: '#292929',
            borderWidth: 1,
            textStyle: TOOLTIP_TEXT_STYLE,
            formatter: (aParams: any) => {
                const sItems = Array.isArray(aParams) ? aParams : [aParams];
                return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sItems
                    .map((aItem: any) => {
                        const sIdx = aItem.seriesIndex;
                        return `<div style="color:${aItem.color}">${
                            chartData[sIdx].name +
                            ' : ' +
                            toDateUtcChart((aItem.value?.[0] ?? 0) + (startTimeList[sIdx] ?? 0) - 1000 * 60 * getTimeZoneValue(), true) +
                            ' : ' +
                            (aItem.value?.[1] ?? '')
                        }</div>`;
                    })
                    .join('<br/>')}</div></div>`;
            },
        },
        xAxis: {
            type: 'time',
            axisLine: { lineStyle: { color: '#323333' } },
            axisTick: { lineStyle: { color: '#323333' } },
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (aValue: number) => moment.utc(aValue).format('HH:mm:ss'),
            },
            splitLine: {
                show: true,
                lineStyle: { color: '#323333' },
            },
        },
        yAxis: {
            type: 'value',
            min: sYAxisValues.left[0],
            max: sYAxisValues.left[1],
            axisLine: { lineStyle: { color: '#323333' } },
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: true,
                lineStyle: { color: '#323333' },
            },
            scale: true,
        },
        series: chartData.map((aSeries, aIndex) => ({
            id: `overlap-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            data: aSeries.data,
            showSymbol: false,
            lineStyle: {
                width: 0.5,
                color: aSeries.color,
            },
            itemStyle: {
                color: aSeries.color,
            },
            animation: false,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
        })),
        toolbox: {
            show: false,
        },
    };
};
