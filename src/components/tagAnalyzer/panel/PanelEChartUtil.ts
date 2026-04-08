import moment from 'moment';
import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type {
    TagAnalyzerChartData,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerTimeRange,
    TagAnalyzerYN,
} from './TagAnalyzerPanelModelTypes';

type PanelEChartOptionParams = {
    chartData?: TagAnalyzerChartSeriesItem[];
    navigatorData?: TagAnalyzerChartData;
    navigatorRange: TagAnalyzerTimeRange;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    isRaw: boolean;
    useNormalize?: TagAnalyzerYN;
    visibleSeries: Record<string, boolean>;
};

type EChartDataZoomPayload = {
    startValue?: number | number[];
    endValue?: number | number[];
    start?: number;
    end?: number;
    batch?: EChartDataZoomPayload[];
};

type EChartBrushAreaPayload = {
    coordRange?: [number, number];
    range?: [number, number];
};

type EChartBrushPayload = {
    areas?: EChartBrushAreaPayload[];
    batch?: Array<{
        areas?: EChartBrushAreaPayload[];
    }>;
};

type EChartTooltipValue = [number, number] | Array<number | string | undefined>;

type EChartTooltipParam = {
    seriesId?: string;
    seriesIndex?: number;
    seriesName?: string;
    axisValue?: number;
    value?: EChartTooltipValue;
    color?: string;
};

const PANEL_BACKGROUND = '#252525';
export const PANEL_CHART_HEIGHT = 300;
const PANEL_GRID_SIDE = 35;
const PANEL_GRID_BOTTOM = 18;
const PANEL_MAIN_TOP = 16;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_LEGEND_TOP = 6;
const NAVIGATOR_HEIGHT = 48;
const PANEL_TOOLBAR_HEIGHT = 28;
const PANEL_TOOLBAR_GAP = 8;

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

/**
 * Builds a silent threshold line when the matching axis guard is enabled.
 * @param aUseFlag Whether the threshold line is enabled.
 * @param aColor The line color to use when enabled.
 * @param aValue The threshold value to render on the axis.
 * @returns The threshold mark-line config, or `undefined` when disabled.
 */
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

/**
 * Finds the minimum y value in one series, optionally clamping against zero.
 * @param aSeriesData The series rows to inspect.
 * @param aZeroBaseCondition Whether zero should be used as the lower bound.
 * @returns The minimum y value for the series.
 */
const getMinValue = (aSeriesData: TagAnalyzerChartRow[], aZeroBaseCondition: boolean) => {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] < aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
};

/**
 * Finds the maximum y value in one series, optionally clamping against zero.
 * @param aSeriesData The series rows to inspect.
 * @param aZeroBaseCondition Whether zero should be used as the lower bound.
 * @returns The maximum y value for the series.
 */
const getMaxValue = (aSeriesData: TagAnalyzerChartRow[], aZeroBaseCondition: boolean) => {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] > aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
};

/**
 * Collects the min/max bounds needed to size both Y axes.
 * @param aChartData The visible chart datasets.
 * @param aAxes The panel axis configuration.
 * @returns The collected left and right axis bounds.
 */
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

/**
 * Resolves the effective left-axis bounds from data-driven or manual settings.
 * @param aAxes The panel axis configuration.
 * @param aIsRaw Whether the chart is showing raw data.
 * @param aYAxisValues The computed data-driven y-axis bounds.
 * @returns The left-axis min/max range to apply.
 */
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

/**
 * Resolves the effective right-axis bounds from data-driven, normalized, or manual settings.
 * @param aAxes The panel axis configuration.
 * @param aIsRaw Whether the chart is showing raw data.
 * @param aUseNormalize Whether right-axis normalization is enabled.
 * @param aYAxisValues The computed data-driven y-axis bounds.
 * @returns The right-axis min/max range to apply.
 */
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

/**
 * Formats tooltip timestamps while preserving millisecond precision when present.
 * @param aValue The tooltip timestamp.
 * @returns The formatted tooltip timestamp text.
 */
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

/**
 * Chooses a compact axis label format based on the current visible time span.
 * @param aValue The axis timestamp to format.
 * @param aRange The currently visible time range.
 * @returns The formatted axis label.
 */
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

/**
 * Builds the main and navigator Y axes from panel settings and visible data.
 * @param aParams The axis, dataset, and normalization inputs for the chart.
 * @returns The ECharts y-axis definitions for the panel and navigator.
 */
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

/**
 * Builds the visible main-chart line series and any axis threshold overlays.
 * @param aParams The chart datasets and display settings for the main plot.
 * @returns The main-series definitions for the chart option.
 */
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

/**
 * Builds the low-detail navigator series that sits under the main chart.
 * @param aParams The navigator datasets and display settings.
 * @returns The navigator-series definitions for the chart option.
 */
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

/**
 * Mirrors legend visibility into the format ECharts expects for selected series.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The ECharts legend selection map.
 */
const buildLegendSelectedMap = (
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
) => {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        aResult[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aResult;
    }, {});
};

/**
 * Seeds every visible series as enabled until the user toggles the legend.
 * @param aChartData The visible chart datasets.
 * @returns The default visible-series map for the legend.
 */
export const buildDefaultVisibleSeriesMap = (aChartData?: TagAnalyzerChartSeriesItem[]) => {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        if (aResult[aSeries.name] === undefined) {
            aResult[aSeries.name] = true;
        }
        return aResult;
    }, {});
};

/**
 * Returns the current legend visibility in a UI-friendly list form.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The series visibility list used by the panel UI.
 */
export const buildVisibleSeriesList = (
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
) => {
    return (aChartData ?? []).map((aSeries) => ({
        name: aSeries.name,
        visible: aVisibleSeries[aSeries.name] !== false,
    }));
};

/**
 * Resolves ECharts zoom payloads back into absolute timestamps.
 * @param aParams The data-zoom payload from ECharts.
 * @param aCurrentRange The current panel range.
 * @param aAxisRange The axis range used for percentage-based zoom payloads.
 * @returns The resolved absolute panel range.
 */
export const extractDataZoomRange = (
    aParams: EChartDataZoomPayload,
    aCurrentRange: TagAnalyzerTimeRange,
    aAxisRange: TagAnalyzerTimeRange = aCurrentRange,
): TagAnalyzerTimeRange => {
    const sZoomData = aParams?.batch?.[0] ?? aParams ?? {};
    const sStartValue = Array.isArray(sZoomData.startValue) ? sZoomData.startValue[0] : sZoomData.startValue;
    const sEndValue = Array.isArray(sZoomData.endValue) ? sZoomData.endValue[0] : sZoomData.endValue;

    if (sStartValue !== undefined && sEndValue !== undefined) {
        return {
            startTime: Number(sStartValue),
            endTime: Number(sEndValue),
        };
    }

    const sAxisSpan = aAxisRange.endTime - aAxisRange.startTime;
    if (
        typeof sZoomData.start === 'number' &&
        typeof sZoomData.end === 'number' &&
        sAxisSpan > 0
    ) {
        return {
            startTime: aAxisRange.startTime + (sAxisSpan * sZoomData.start) / 100,
            endTime: aAxisRange.startTime + (sAxisSpan * sZoomData.end) / 100,
        };
    }

    return {
        startTime: aCurrentRange.startTime,
        endTime: aCurrentRange.endTime,
    };
};

/**
 * Returns the shared vertical layout metrics for the main plot, toolbar lane, and navigator.
 * @param aShowLegend Whether the legend row is visible.
 * @returns The vertical layout metrics for the panel chart sections.
 */
export const getPanelChartLayoutMetrics = (aShowLegend: TagAnalyzerYN) => {
    const sHasLegend = aShowLegend === 'Y';
    const sMainGridTop = sHasLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sNavigatorGridTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - NAVIGATOR_HEIGHT;
    const sToolbarTop = sNavigatorGridTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;
    const sMainGridHeight = Math.max(sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop, 120);

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: sMainGridHeight,
        toolbarTop: sToolbarTop,
        toolbarHeight: PANEL_TOOLBAR_HEIGHT,
        navigatorTop: sNavigatorGridTop,
        navigatorHeight: NAVIGATOR_HEIGHT,
    };
};

/**
 * Extracts the first selected brush window from either direct or batched brush payloads.
 * @param aParams The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export const extractBrushRange = (aParams: EChartBrushPayload): TagAnalyzerTimeRange | undefined => {
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

/**
 * Builds the two-panel ECharts option used by the main chart and navigator pair.
 * Future Refactor Target: split option assembly, axis policy, and tooltip formatting into smaller helpers.
 * @param aParams The chart data, range, and display inputs for the panel.
 * @returns The ECharts option for the main chart and navigator pair.
 */
export const buildPanelChartOption = ({
    chartData,
    navigatorData,
    navigatorRange,
    axes,
    display,
    isRaw,
    useNormalize,
    visibleSeries,
}: PanelEChartOptionParams) => {
    const sLayout = getPanelChartLayoutMetrics(display.show_legend);

    return {
        animation: false,
        backgroundColor: PANEL_BACKGROUND,
        textStyle: {
            fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
        },
        grid: [
            {
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: sLayout.mainGridTop,
                height: sLayout.mainGridHeight,
            },
            {
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: NAVIGATOR_HEIGHT,
            },
        ],
        legend: {
            show: display.show_legend === 'Y',
            left: 10,
            top: PANEL_LEGEND_TOP,
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
            formatter: (aParams: EChartTooltipParam | EChartTooltipParam[]) => {
                const sItems = Array.isArray(aParams)
                    ? aParams.filter((aItem) => aItem?.seriesId?.startsWith('main-series'))
                    : [aParams];
                if (sItems.length === 0) {
                    return '';
                }

                const sTime = formatTooltipTime(Number(sItems[0].value?.[0] ?? sItems[0].axisValue));

                return `<div>
                    <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
                    <br/>
                    ${sItems
                        .map(
                            (aItem) =>
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
            // Drag zoom is driven by brush selection, not the native inside gesture handlers.
            {
                type: 'inside',
                xAxisIndex: [0],
                filterMode: 'none',
                moveOnMouseMove: false,
                moveOnMouseWheel: false,
                zoomOnMouseWheel: false,
                preventDefaultMouseMove: true,
                disabled: display.use_zoom !== 'Y',
            },
            {
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'none',
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                bottom: 22,
                height: NAVIGATOR_HEIGHT - 4,
                showDetail: false,
                brushSelect: false,
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

/**
 * Builds the simpler single-grid overlap chart used by the overlap modal.
 * @param aParams The overlap chart datasets and display inputs.
 * @returns The ECharts option for the overlap modal chart.
 */
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
            formatter: (aParams: EChartTooltipParam | EChartTooltipParam[]) => {
                const sItems = Array.isArray(aParams) ? aParams : [aParams];
                return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sItems
                    .map((aItem) => {
                        const sIdx = aItem.seriesIndex ?? 0;
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
