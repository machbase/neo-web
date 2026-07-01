import type {
    BrushComponentOption,
    DataZoomComponentOption,
    EChartsOption,
    LegendComponentOption,
    TitleComponentOption,
    TooltipComponentOption,
    ToolboxComponentOption,
} from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import type { ChartInfo } from '../types/PanelChartTypes';
import {
    DEFAULT_NOT_SHOW,
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_INSIDE_DATA_ZOOM_ID,
    PANEL_LEGEND_TOP,
    PANEL_MAIN_GRID_ID,
    PANEL_NAVIGATOR_GRID_ID,
    PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX,
    PANEL_SLIDER_DATA_ZOOM_ID,
} from './PanelChartOptionConstants';
import type { RuntimePanelDisplay } from '../../../domain/panel/PanelRuntime';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import { formatAxisPointerLabel } from '../../../formatting/TimeFormatters';
import {
    getChartLayoutMetrics,
    PANEL_GRID_BOTTOM,
    PANEL_GRID_SIDE,
    PANEL_NAVIGATOR_GRID_SIDE,
    PANEL_SLIDER_HEIGHT,
} from '../layout/PanelChartLayoutMetrics';

type TooltipArrayValue = Array<number | string | undefined>;

type PanelTooltipParam = Partial<{
    seriesId: string;
    seriesName: string;
    axisValue: number | string;
    value: unknown;
    color: unknown;
}>;

type PanelChartFrameOptions = Pick<
    EChartsOption,
    'brush' | 'dataZoom' | 'grid' | 'legend' | 'title' | 'toolbox' | 'tooltip'
>;

const LEGEND_TEXT_STYLE = { color: '#e7e8ea', fontSize: 10 } satisfies LegendComponentOption['textStyle'];

const TOOLTIP_BASE: TooltipComponentOption = {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: '#1f1d1d',
    borderColor: '#292929',
    borderWidth: 1,
    textStyle: { color: '#afb5bc', fontSize: 10 },
};

const PANEL_CHART_BRUSH_OPTION: BrushComponentOption = {
    toolbox: [],
    xAxisIndex: 0,
    brushMode: 'single' as const,
    throttleType: 'debounce' as const,
    throttleDelay: 150,
    brushStyle: {
        color: 'rgba(68, 170, 213, 0.28)',
        borderColor: 'rgba(68, 170, 213, 0.85)',
        borderWidth: 2,
    },
};

const HIDDEN_PANEL_TOOLBOX_OPTION = { ...DEFAULT_NOT_SHOW } satisfies ToolboxComponentOption;
const HIDDEN_PANEL_TITLE_OPTION = { ...DEFAULT_NOT_SHOW } satisfies TitleComponentOption;

export function buildPanelChartFrameOptions(
    chartInfo: ChartInfo,
): PanelChartFrameOptions {
    const sLayout = getChartLayoutMetrics(chartInfo.display.showLegend);

    return {
        grid: [
            {
                id: PANEL_MAIN_GRID_ID,
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: sLayout.mainGridTop,
                height: sLayout.mainGridHeight,
                containLabel: true,
            },
            {
                id: PANEL_NAVIGATOR_GRID_ID,
                left: PANEL_NAVIGATOR_GRID_SIDE,
                right: PANEL_NAVIGATOR_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
            },
        ],
        legend: {
            show: chartInfo.display.showLegend,
            left: 10,
            top: PANEL_LEGEND_TOP,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
            selected: Object.fromEntries(
                chartInfo.mainSeriesData.map((series) => [
                    series.name,
                    chartInfo.visibleSeries[series.name] !== false,
                ]),
            ),
        },
        tooltip: buildChartTooltipOption(
            chartInfo.isNumericXAxis,
            chartInfo.displayPanelRange,
        ),
        dataZoom: buildPanelChartDataZoomOption(
            chartInfo.display,
            chartInfo.displayPanelRange,
            chartInfo.isWheelZoomEnabled,
        ),
        brush: PANEL_CHART_BRUSH_OPTION,
        toolbox: HIDDEN_PANEL_TOOLBOX_OPTION,
        title: HIDDEN_PANEL_TITLE_OPTION,
    };
}

function buildPanelChartDataZoomOption(
    display: RuntimePanelDisplay,
    panelRange: TimeRangeMs,
    isWheelZoomEnabled: boolean,
): DataZoomComponentOption[] {
    const sPanelRangeDataZoom =
        panelRange.startTime < panelRange.endTime
            ? {
                  startValue: panelRange.startTime,
                  endValue: panelRange.endTime,
              }
            : {};

    return [
        {
            id: PANEL_INSIDE_DATA_ZOOM_ID,
            type: 'inside' as const,
            xAxisIndex: [PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX],
            filterMode: 'none' as const,
            ...sPanelRangeDataZoom,
            moveOnMouseMove: false,
            moveOnMouseWheel: false,
            zoomOnMouseWheel: isWheelZoomEnabled,
            preventDefaultMouseMove: true,
            disabled: !display.useZoom,
        },
        {
            id: PANEL_SLIDER_DATA_ZOOM_ID,
            type: 'slider' as const,
            xAxisIndex: [PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX],
            filterMode: 'none' as const,
            ...sPanelRangeDataZoom,
            realtime: false,
            left: PANEL_NAVIGATOR_GRID_SIDE,
            right: PANEL_NAVIGATOR_GRID_SIDE,
            bottom: PANEL_GRID_BOTTOM,
            height: PANEL_SLIDER_HEIGHT,
            showDetail: false,
            brushSelect: false,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: '#7a828c',
            fillerColor: 'rgba(104, 119, 138, 0.28)',
            showDataShadow: false,
            dataBackground: {
                lineStyle: {
                    color: '#c0c7d0',
                    opacity: 0.8,
                },
                areaStyle: {
                    color: '#a8b0ba',
                    opacity: 0.28,
                },
            },
            selectedDataBackground: {
                lineStyle: {
                    color: '#a8b3c1',
                    opacity: 0.62,
                },
                areaStyle: {
                    color: '#7f8da0',
                    opacity: 0.18,
                },
            },
            handleSize: 24,
            handleStyle: {
                color: 'rgba(245, 247, 250, 0.78)',
                borderColor: '#8a939e',
            },
            moveHandleStyle: {
                color: 'rgba(245, 247, 250, 0.32)',
                opacity: 0.75,
            },
        },
    ];
}

function getTooltipPrimitiveArrayValue(
    callbackValue: unknown,
): TooltipArrayValue | undefined {
    return Array.isArray(callbackValue)
        ? callbackValue as TooltipArrayValue
        : undefined;
}

function formatTooltipRow(tooltipParam: PanelTooltipParam): string {
    const sColorStyle =
        typeof tooltipParam.color === 'string'
            ? `color:${tooltipParam.color};`
            : '';
    const sValue = getTooltipPrimitiveArrayValue(tooltipParam.value);

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${tooltipParam.seriesName} : ${sValue?.[1] ?? ''}</div>`;
}

function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    const sTooltipParams = (
        Array.isArray(tooltipFormatterParams)
            ? tooltipFormatterParams
            : [tooltipFormatterParams]
    ) as PanelTooltipParam[];
    const sTooltipItems = sTooltipParams.filter((tooltipParam) =>
        tooltipParam.seriesId?.startsWith(MAIN_PANEL_SERIES_ID_PREFIX),
    );

    return [...new Map(sTooltipItems.map((item) => [item.seriesId, item])).values()];
}

function formatChartTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    isNumericXAxis: boolean,
    panelRange: TimeRangeMs,
): string {
    const sMainSeriesItems = getMainSeriesTooltipItems(tooltipFormatterParams);
    if (sMainSeriesItems.length === 0) {
        return '';
    }

    const sFirstValue = getTooltipPrimitiveArrayValue(sMainSeriesItems[0].value);
    const sTime = formatAxisPointerLabel(
        Number(sFirstValue?.[0] ?? sMainSeriesItems[0].axisValue),
        isNumericXAxis,
        panelRange,
    );

    return `<div>
            <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
            <div style="padding:6px 0 0 10px">
            ${sMainSeriesItems.map(formatTooltipRow).join('')}
            </div>
        </div>`;
}

function buildChartTooltipOption(
    isNumericXAxis: boolean,
    panelRange: TimeRangeMs,
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: (tooltipFormatterParams) =>
            formatChartTooltip(
                tooltipFormatterParams,
                isNumericXAxis,
                panelRange,
            ),
    };
}
