import moment from 'moment';
import type {
    EChartsOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type {
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TimeRange,
    PanelVisibleSeriesItem,
} from './PanelModel';

// Used by PanelChartOptions to type data zoom payload.
export type EChartDataZoomPayload = {
    startValue: (number | number[]) | undefined;
    endValue: (number | number[]) | undefined;
    start: number | undefined;
    end: number | undefined;
    batch: EChartDataZoomPayload[] | undefined;
};

// Used by PanelChartOptions to type brush area payload.
export type EChartBrushAreaPayload = {
    coordRange: [number, number] | undefined;
    range: [number, number] | undefined;
};

// Used by PanelChartOptions to type brush payload.
export type EChartBrushPayload = {
    areas: EChartBrushAreaPayload[] | undefined;
    batch:
        | Array<{
              areas: EChartBrushAreaPayload[] | undefined;
          }>
        | undefined;
};

// Used by PanelChartOptions to type tooltip value.
type EChartTooltipValue = [number, number] | Array<number | string | undefined>;

// Used by PanelChartOptions to type tooltip param.
type EChartTooltipParam = Partial<{
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    axisValue: number | string;
    value: EChartTooltipValue;
    color: string;
}>;

// Used by PanelChartOptions to type threshold line option.
type ThresholdLineOption = {
    silent: true;
    symbol: 'none';
    lineStyle: {
        color: string;
        width: number;
    };
    label: {
        show: false;
    };
    data: Array<{
        yAxis: number;
    }>;
};

// Used by PanelChartOptions to type y axis value map.
type YAxisValueMap = {
    left: number[];
    right: number[];
};

// Used by PanelChartOptions to type axis range.
type AxisRange = {
    min: number | undefined;
    max: number | undefined;
};

// Used by PanelChartOptions to type series options.
type PanelSeriesOptions = SeriesOption[];
// Used by PanelChartOptions to type y axis options.
type PanelYAxisOptions = YAXisComponentOption[];

// Used by PanelChartOptions to type chart layout metrics.
type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    toolbarHeight: number;
    sliderTop: number;
    sliderHeight: number;
};

// Used by PanelChartOptions to type chart option.
type PanelChartOption = EChartsOption & {
    noData: {
        style: typeof NO_DATA_STYLE;
    };
};

const PANEL_BACKGROUND = '#252525';
export const PANEL_CHART_HEIGHT = 250;
const PANEL_GRID_SIDE = 35;
const PANEL_GRID_BOTTOM = 18;
const PANEL_MAIN_TOP = 16;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_LEGEND_TOP = 6;
const PANEL_SLIDER_HEIGHT = 20;
const PANEL_TOOLBAR_HEIGHT = 28;
const PANEL_TOOLBAR_GAP = 12;
const PANEL_HOVER_SYMBOL_SIZE = 6;
const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;
const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;
const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;
const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;
const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;
const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;

const PANEL_AXIS_LABEL_STYLE = {
    color: '#f8f8f8',
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

const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } };
const AXIS_SPLIT_LINE_STYLE = { color: '#323333', width: 1 };

const TOOLTIP_BASE = {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: '#1f1d1d',
    borderColor: '#292929',
    borderWidth: 1,
    textStyle: TOOLTIP_TEXT_STYLE,
};

const PANEL_Y_AXIS_SPLIT_COUNT = 5;

/**
 * Builds a silent threshold line when the matching axis guard is enabled.
 * @param aUseFlag Whether the threshold line is enabled.
 * @param aColor The line color to use when enabled.
 * @param aValue The threshold value to render on the axis.
 * @returns The threshold mark-line config, or `undefined` when disabled.
 */
function buildThresholdLine(
    aUseFlag: boolean,
    aColor: string,
    aValue: number,
): ThresholdLineOption | undefined {
    if (!aUseFlag) {
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
}

/**
 * Finds the minimum y value in one series, optionally clamping against zero.
 * @param aSeriesData The series rows to inspect.
 * @param aZeroBaseCondition Whether zero should be used as the lower bound.
 * @returns The minimum y value for the series.
 */
function getMinValue(aSeriesData: TagAnalyzerChartRow[], aZeroBaseCondition: boolean): number {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] < aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
}

/**
 * Finds the maximum y value in one series, optionally clamping against zero.
 * @param aSeriesData The series rows to inspect.
 * @param aZeroBaseCondition Whether zero should be used as the lower bound.
 * @returns The maximum y value for the series.
 */
function getMaxValue(aSeriesData: TagAnalyzerChartRow[], aZeroBaseCondition: boolean): number {
    return aSeriesData.reduce(
        (aResult: number, aCurrent: number[]) => {
            if (aCurrent[1] > aResult) return aCurrent[1];
            return aResult;
        },
        aZeroBaseCondition ? 0 : aSeriesData[0]?.[1],
    );
}

/**
 * Chooses a chart-friendly step size for the auto y-axis maximum.
 * @param aValue The maximum value currently visible on the axis.
 * @returns The clean step size used to round the auto max upward.
 */
function getRoundedAxisStep(aValue: number): number {
    const sReferenceValue = Math.max(Math.abs(aValue) / PANEL_Y_AXIS_SPLIT_COUNT, Number.MIN_VALUE);
    const sExponent = Math.floor(Math.log10(sReferenceValue));
    const sMagnitude = 10 ** sExponent;
    const sFraction = sReferenceValue / sMagnitude;

    if (sFraction <= 1) {
        return sMagnitude;
    }
    if (sFraction <= 2) {
        return 2 * sMagnitude;
    }
    if (sFraction <= 5) {
        return 5 * sMagnitude;
    }

    return 10 * sMagnitude;
}

/**
 * Rounds the auto y-axis maximum up so the chart has a cleaner top boundary.
 * @param aValue The maximum value currently visible on the axis.
 * @returns The rounded-up y-axis maximum.
 */
function roundAxisMaximum(aValue: number): number {
    if (!Number.isFinite(aValue) || aValue === 0) {
        return aValue;
    }

    const sStep = getRoundedAxisStep(aValue);
    const sRoundedValue = Math.ceil(aValue / sStep) * sStep;
    const sExpandedValue = sRoundedValue > aValue ? sRoundedValue : sRoundedValue + sStep;

    return Number(sExpandedValue.toPrecision(12));
}

/**
 * Expands the running min/max bounds for one axis side with data from a single series.
 * @param aBounds The running [min, max] pair to update in place.
 * @param aData The series rows to inspect.
 * @param aZeroBase Whether zero should be used as the lower bound.
 */
function updateAxisBounds(
    aBounds: number[],
    aData: TagAnalyzerChartRow[],
    aZeroBase: boolean,
): void {
    const sMin = getMinValue(aData, aZeroBase);
    const sMax = getMaxValue(aData, aZeroBase);
    if (aBounds[0] === undefined || aBounds[0] > sMin) aBounds[0] = sMin;
    if (aBounds[1] === undefined || aBounds[1] < sMax) aBounds[1] = sMax;
}

/**
 * Rounds the collected axis bounds to three-decimal precision and a clean ceiling.
 * @param aBounds The [min, max] pair to round in place.
 */
function roundAxisBounds(aBounds: number[]): void {
    if (aBounds[0] !== undefined) {
        aBounds[0] = Math.floor(aBounds[0] * 1000) / 1000;
        aBounds[1] = roundAxisMaximum(Math.ceil(aBounds[1] * 1000) / 1000);
    }
}

/**
 * Collects the min/max bounds needed to size both Y axes.
 * @param aChartData The visible chart datasets.
 * @param aAxes The panel axis configuration.
 * @returns The collected left and right axis bounds.
 */
function getYAxisValues(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aAxes: TagAnalyzerPanelAxes,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [] as number[],
        right: [] as number[],
    };

    aChartData?.forEach((aItem) => {
        if (!aItem.data?.length) return;
        if (aItem.yAxis === 0) updateAxisBounds(sYAxis.left, aItem.data, aAxes.zero_base);
        if (aItem.yAxis === 1) updateAxisBounds(sYAxis.right, aItem.data, aAxes.zero_base2);
    });

    roundAxisBounds(sYAxis.left);
    roundAxisBounds(sYAxis.right);

    return sYAxis;
}

/**
 * Resolves the effective axis bounds — returns the manual range when set, otherwise the data-driven defaults.
 * @param aManualRange The user-configured axis range (0/0 means "auto").
 * @param aDefaultMin The data-driven or normalized minimum.
 * @param aDefaultMax The data-driven or normalized maximum.
 * @returns The resolved min/max range to apply.
 */
function resolveAxisRange(
    aManualRange: { min: number; max: number },
    aDefaultMin: number | undefined,
    aDefaultMax: number | undefined,
): AxisRange {
    if (aManualRange.min === 0 && aManualRange.max === 0) {
        return { min: aDefaultMin, max: aDefaultMax };
    }
    return { min: aManualRange.min, max: aManualRange.max };
}

/**
 * Formats tooltip timestamps while preserving millisecond precision when present.
 * @param aValue The tooltip timestamp.
 * @returns The formatted tooltip timestamp text.
 */
function formatTooltipTime(aValue: number): string {
    const sValueText = String(aValue);
    if (sValueText.includes('.')) {
        return (
            new Date(aValue - getTimeZoneValue() * 60000)
                .toISOString()
                .replace('T', ' ')
                .replace('Z', '') +
            '.' +
            sValueText.split('.')[1]
        );
    }

    return new Date(aValue - getTimeZoneValue() * 60000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');
}

/**
 * Chooses a compact axis label format based on the current visible time span.
 * @param aValue The axis timestamp to format.
 * @param aRange The currently visible time range.
 * @returns The formatted axis label.
 */
function formatAxisTime(aValue: number, aRange: TimeRange): string {
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
}

/**
 * Builds the panel Y axes from panel settings and visible data.
 * @param aAxes The panel axis settings used to size and decorate the y-axes.
 * @param aChartData The visible chart datasets used to derive axis ranges.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @returns The ECharts y-axis definitions for the main panel.
 */
function buildYAxis(
    aAxes: TagAnalyzerPanelAxes,
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aIsRaw: boolean,
    aUseNormalize: boolean,
): PanelYAxisOptions {
    const sYAxisValues = getYAxisValues(aChartData, aAxes);
    const sLeftAxisRange = resolveAxisRange(
        aIsRaw ? aAxes.primaryDrilldownRange : aAxes.primaryRange,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        aIsRaw ? aAxes.secondaryDrilldownRange : aAxes.secondaryRange,
        aUseNormalize ? 0 : sYAxisValues.right[0],
        aUseNormalize ? 100 : sYAxisValues.right[1],
    );

    return [
        {
            type: 'value',
            gridIndex: 0,
            min: sLeftAxisRange.min,
            max: sLeftAxisRange.max,
            axisLine: AXIS_LINE_STYLE,
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: aAxes.show_y_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 0,
            min: sRightAxisRange.min,
            max: sRightAxisRange.max,
            position: aAxes.use_right_y2 ? 'right' : 'left',
            axisLine: AXIS_LINE_STYLE,
            axisLabel: {
                ...Y_AXIS_LABEL_STYLE,
                show: Boolean(aChartData?.some((aItem) => aItem.yAxis === 1)),
            },
            splitLine: {
                show: aAxes.show_y_tickline2,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
    ];
}

/**
 * Builds the visible main-chart line series and any axis threshold overlays.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @returns The main-series definitions for the chart option.
 */
function buildMainSeries(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aDisplay: TagAnalyzerPanelDisplay,
    aAxes: TagAnalyzerPanelAxes,
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    const sLeftThreshold = buildThresholdLine(aAxes.use_ucl, '#ec7676', aAxes.ucl_value);
    const sLeftLowerThreshold = buildThresholdLine(aAxes.use_lcl, 'orange', aAxes.lcl_value);
    const sRightThreshold = buildThresholdLine(aAxes.use_ucl2, '#ec7676', aAxes.ucl2_value);
    const sRightLowerThreshold = buildThresholdLine(aAxes.use_lcl2, 'orange', aAxes.lcl2_value);

    return (aChartData ?? []).map((aSeries, aIndex) => {
        const sMarkLineData = [];
        const sBaseSymbolSize = aDisplay.point_radius > 0 ? aDisplay.point_radius * 2 : 0;
        const sSymbolSize = aDisplay.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sSeriesOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_LINE_OPACITY;
        const sItemOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_ITEM_OPACITY;
        const sAreaOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? aDisplay.fill
                : Math.min(aDisplay.fill, PANEL_LEGEND_FADE_AREA_OPACITY);
        const sSeriesStroke = sIsHoveredSeries ? aDisplay.stroke + 1 : aDisplay.stroke;
        const sMarkLineOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_MARK_LINE_OPACITY;

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
            showSymbol: aDisplay.show_point,
            symbolSize: sSymbolSize,
            lineStyle: {
                width: sSeriesStroke,
                color: aSeries.color,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sItemOpacity,
            },
            areaStyle:
                aDisplay.fill > 0 ? { opacity: sAreaOpacity, color: aSeries.color } : undefined,
            connectNulls: false,
            animation: false,
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            z: sIsHoveredSeries ? 4 : 2,
            markLine:
                sMarkLineData.length > 0
                    ? {
                          silent: true,
                          symbol: 'none',
                          lineStyle: {
                              width: 1,
                              opacity: sMarkLineOpacity,
                          },
                          label: { show: false },
                          data: sMarkLineData,
                      }
                    : undefined,
        };
    });
}

/**
 * Mirrors the visible main-series set into the navigator lane so it reflects the real panel series
 * instead of relying on the slider's default data shadow.
 * @param aChartData The chart datasets to mirror into the navigator lane.
 * @returns The navigator-series definitions drawn behind the slider handles.
 */
function buildNavigatorSeries(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    return (aChartData ?? []).map((aSeries, aIndex) => {
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sNavigatorOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY;

        return {
            id: `navigator-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 2,
            data: aSeries.data,
            showSymbol: false,
            silent: true,
            animation: false,
            tooltip: {
                show: false,
            },
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            lineStyle: {
                width: sIsHoveredSeries ? 2 : 1,
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            z: sIsHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        };
    });
}

/**
 * Mirrors legend visibility into the format ECharts expects for selected series.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The ECharts legend selection map.
 */
function buildLegendSelectedMap(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        aResult[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aResult;
    }, {});
}

/**
 * Seeds every visible series as enabled until the user toggles the legend.
 * @param aChartData The visible chart datasets.
 * @returns The default visible-series map for the legend.
 */
export function buildDefaultVisibleSeriesMap(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
): Record<string, boolean> {
    return (aChartData ?? []).reduce<Record<string, boolean>>((aResult, aSeries) => {
        if (aResult[aSeries.name] === undefined) {
            aResult[aSeries.name] = true;
        }
        return aResult;
    }, {});
}

/**
 * Returns the current legend visibility in a UI-friendly list form.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The series visibility list used by the panel UI.
 */
export function buildVisibleSeriesList(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aVisibleSeries: Record<string, boolean>,
): PanelVisibleSeriesItem[] {
    return (aChartData ?? []).map((aSeries) => ({
        name: aSeries.name,
        visible: aVisibleSeries[aSeries.name] !== false,
    }));
}

/**
 * Resolves ECharts zoom payloads back into absolute timestamps.
 * @param aParams The data-zoom payload from ECharts.
 * @param aCurrentRange The current panel range.
 * @param aAxisRange The axis range used for percentage-based zoom payloads.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomRange(
    aParams: EChartDataZoomPayload,
    aCurrentRange: TimeRange,
    aAxisRange: TimeRange = aCurrentRange,
): TimeRange {
    const sZoomData = aParams?.batch?.[0] ??
        aParams ?? {
            startValue: undefined,
            endValue: undefined,
            start: undefined,
            end: undefined,
            batch: undefined,
        };
    const sStartValue = Array.isArray(sZoomData.startValue)
        ? sZoomData.startValue[0]
        : sZoomData.startValue;
    const sEndValue = Array.isArray(sZoomData.endValue)
        ? sZoomData.endValue[0]
        : sZoomData.endValue;

    if (sStartValue !== undefined && sEndValue !== undefined) {
        return {
            startTime: Number(sStartValue),
            endTime: Number(sEndValue),
        };
    }

    const sAxisSpan = aAxisRange.endTime - aAxisRange.startTime;
    if (typeof sZoomData.start === 'number' && typeof sZoomData.end === 'number' && sAxisSpan > 0) {
        return {
            startTime: aAxisRange.startTime + (sAxisSpan * sZoomData.start) / 100,
            endTime: aAxisRange.startTime + (sAxisSpan * sZoomData.end) / 100,
        };
    }

    return {
        startTime: aCurrentRange.startTime,
        endTime: aCurrentRange.endTime,
    };
}

/**
 * Returns the shared vertical layout metrics for the main plot, toolbar lane, and slider.
 * @param aShowLegend Whether the legend row is visible.
 * @returns The vertical layout metrics for the panel chart sections.
 */
export function getPanelChartLayoutMetrics(aShowLegend: boolean): PanelChartLayoutMetrics {
    const sHasLegend = aShowLegend;
    const sMainGridTop = sHasLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;
    const sMainGridHeight = Math.max(sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop, 120);

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: sMainGridHeight,
        toolbarTop: sToolbarTop,
        toolbarHeight: PANEL_TOOLBAR_HEIGHT,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}

/**
 * Extracts the first selected brush window from either direct or batched brush payloads.
 * @param aParams The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export function extractBrushRange(aParams: EChartBrushPayload): TimeRange | undefined {
    const sArea = aParams?.areas?.[0] ?? aParams?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    return {
        startTime: Math.floor(Number(sRange[0])),
        endTime: Math.ceil(Number(sRange[1])),
    };
}

/**
 * Builds the single-panel ECharts option used by the main chart and slider pair.
 * Future Refactor Target: split option assembly, axis policy, and tooltip formatting into smaller helpers.
 * @param aChartData The chart datasets to render in the panel.
 * @param aNavigatorRange The full navigator range that bounds the chart axes.
 * @param aAxes The panel axis settings used to build y-axes and thresholds.
 * @param aDisplay The display settings used to build legends, lines, and zoom UI.
 * @param aIsRaw Whether the panel is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @param aVisibleSeries The current legend-selected visibility map.
 * @returns The ECharts option for the main chart and slider pair.
 */
export function buildPanelChartOption(
    aChartData: TagAnalyzerChartSeriesItem[] | undefined,
    aNavigatorRange: TimeRange,
    aAxes: TagAnalyzerPanelAxes,
    aDisplay: TagAnalyzerPanelDisplay,
    aIsRaw: boolean,
    aUseNormalize: boolean,
    aVisibleSeries: Record<string, boolean>,
    aNavigatorChartData?: TagAnalyzerChartSeriesItem[] | undefined,
    aHoveredLegendSeries?: string | undefined,
): PanelChartOption {
    const sLayout = getPanelChartLayoutMetrics(aDisplay.show_legend);

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
                height: PANEL_SLIDER_HEIGHT,
            },
        ],
        legend: {
            show: aDisplay.show_legend,
            left: 10,
            top: PANEL_LEGEND_TOP,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
            selected: buildLegendSelectedMap(aChartData, aVisibleSeries),
        },
        tooltip: {
            ...TOOLTIP_BASE,
            axisPointer: {
                type: 'cross',
                lineStyle: {
                    color: 'red',
                    width: 0.5,
                },
            },
            formatter: (aParams) => {
                const sItems = (
                    (Array.isArray(aParams)
                        ? aParams
                        : [aParams]) as unknown as EChartTooltipParam[]
                ).filter((aItem) => aItem?.seriesId?.startsWith('main-series'));
                if (sItems.length === 0) {
                    return '';
                }

                const sTime = formatTooltipTime(
                    Number(sItems[0].value?.[0] ?? sItems[0].axisValue),
                );

                return `<div>
                    <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
                    <div style="padding:6px 0 0 10px">
                    ${sItems
                        .map(
                            (aItem) =>
                                `<div style="color:${aItem.color};margin:0;padding:0;white-space:nowrap">${aItem.seriesName} : ${aItem.value?.[1] ?? ''}</div>`,
                        )
                        .join('')}
                    </div>
                </div>`;
            },
        },
        xAxis: [
            {
                type: 'time',
                gridIndex: 0,
                min: aNavigatorRange.startTime,
                max: aNavigatorRange.endTime,
                axisLine: AXIS_LINE_STYLE,
                axisTick: AXIS_LINE_STYLE,
                axisLabel: {
                    ...PANEL_AXIS_LABEL_STYLE,
                    formatter: (aValue: number) => formatAxisTime(aValue, aNavigatorRange),
                },
                splitLine: {
                    show: aDisplay.use_zoom && aAxes.show_x_tickline,
                    lineStyle: AXIS_SPLIT_LINE_STYLE,
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
                min: aNavigatorRange.startTime,
                max: aNavigatorRange.endTime,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                axisPointer: {
                    show: false,
                    label: {
                        show: false,
                    },
                },
            },
        ],
        yAxis: [
            ...buildYAxis(aAxes, aChartData, aIsRaw, aUseNormalize),
            {
                type: 'value',
                gridIndex: 1,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                scale: true,
            },
        ],
        dataZoom: [
            // Drag zoom is driven by brush selection, while the slider window only controls the main chart axis.
            // The navigator axis must stay unzoomed so it can show the full-range overview underneath.
            {
                type: 'inside',
                xAxisIndex: [0],
                filterMode: 'none',
                moveOnMouseMove: false,
                moveOnMouseWheel: false,
                zoomOnMouseWheel: false,
                preventDefaultMouseMove: true,
                disabled: !aDisplay.use_zoom,
            },
            {
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'none',
                // Keep the navigator mask responsive locally, then commit the main-chart/app state on drag end.
                realtime: false,
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
                showDetail: false,
                brushSelect: false,
                backgroundColor: 'rgba(0,0,0,0)',
                borderColor: '#323333',
                fillerColor: 'rgba(119, 119, 119, 0.3)',
                showDataShadow: false,
                dataBackground: {
                    lineStyle: {
                        color: '#90949b',
                        opacity: 0.6,
                    },
                    areaStyle: {
                        color: '#90949b',
                        opacity: 0.16,
                    },
                },
                selectedDataBackground: {
                    lineStyle: {
                        color: '#d7dadf',
                        opacity: 0.8,
                    },
                    areaStyle: {
                        color: '#b2b8c0',
                        opacity: 0.2,
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
        series: buildMainSeries(
            aChartData,
            aDisplay,
            aAxes,
            aHoveredLegendSeries,
        ).concat(
            buildNavigatorSeries(aNavigatorChartData ?? aChartData, aHoveredLegendSeries),
        ),
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
}

/**
 * Builds the simpler single-grid overlap chart used by the overlap modal.
 * @param aChartData The overlap chart datasets to render.
 * @param aStartTimeList The original start times used to rebuild tooltip timestamps.
 * @param aZeroBase Whether the overlap y-axis should clamp against zero.
 * @returns The ECharts option for the overlap modal chart.
 */
export function buildOverlapChartOption(
    aChartData: TagAnalyzerChartSeriesItem[],
    aStartTimeList: number[],
    aZeroBase: boolean,
): EChartsOption {
    const sYAxisValues = getYAxisValues(aChartData, {
        show_x_tickline: true,
        pixels_per_tick_raw: 0,
        pixels_per_tick: 0,
        use_sampling: false,
        sampling_value: 0,
        zero_base: aZeroBase,
        show_y_tickline: true,
        primaryRange: { min: 0, max: 0 },
        primaryDrilldownRange: { min: 0, max: 0 },
        use_ucl: false,
        ucl_value: 0,
        use_lcl: false,
        lcl_value: 0,
        use_right_y2: false,
        zero_base2: aZeroBase,
        show_y_tickline2: false,
        secondaryRange: { min: 0, max: 0 },
        secondaryDrilldownRange: { min: 0, max: 0 },
        use_ucl2: false,
        ucl2_value: 0,
        use_lcl2: false,
        lcl2_value: 0,
    });

    return {
        animation: false,
        backgroundColor: '#2a2a2a',
        color: [
            '#EB5757',
            '#6FCF97',
            '#9C8FFF',
            '#F5AA64',
            '#BB6BD9',
            '#B4B4B4',
            '#FFD95F',
            '#2D9CDB',
            '#C3A080',
            '#B4B4B4',
            '#6B6B6B',
        ],
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
            ...TOOLTIP_BASE,
            formatter: (aParams) => {
                const sItems = (Array.isArray(aParams)
                    ? aParams
                    : [aParams]) as unknown as EChartTooltipParam[];
                return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sItems
                    .map((aItem) => {
                        const sIdx = aItem.seriesIndex ?? 0;
                        return `<div style="color:${aItem.color}">${
                            aChartData[sIdx].name +
                            ' : ' +
                            toDateUtcChart(
                                Number(aItem.value?.[0] ?? 0) +
                                    (aStartTimeList[sIdx] ?? 0) -
                                    1000 * 60 * getTimeZoneValue(),
                                true,
                            ) +
                            ' : ' +
                            (aItem.value?.[1] ?? '')
                        }</div>`;
                    })
                    .join('<br/>')}</div></div>`;
            },
        },
        xAxis: {
            type: 'time',
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (aValue: number) => moment.utc(aValue).format('HH:mm:ss'),
            },
            splitLine: {
                show: true,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
        },
        yAxis: {
            type: 'value',
            min: sYAxisValues.left[0],
            max: sYAxisValues.left[1],
            axisLine: AXIS_LINE_STYLE,
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: true,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            scale: true,
        },
        series: aChartData.map((aSeries, aIndex) => ({
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

        axisValue: undefined,
    };
}
