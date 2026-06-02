import type { XAXisComponentOption, YAXisComponentOption } from 'echarts';

type AxisLineStyleOption = NonNullable<XAXisComponentOption['axisLine']>;
type AxisSplitLineStyleOption = NonNullable<NonNullable<XAXisComponentOption['splitLine']>['lineStyle']>;

const COMPACT_AXIS_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
] as const;
const COMPACT_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const STANDARD_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

export const PANEL_LEGEND_TOP = 6;
export const PANEL_HOVER_SYMBOL_SIZE = 6;
export const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;
export const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;
export const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;
export const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;
export const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;
export const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;
export const PANEL_Y_AXIS_SPLIT_COUNT = 5;
export const PANEL_MAIN_GRID_ID = 'panel-main-grid';
export const PANEL_NAVIGATOR_GRID_ID = 'panel-navigator-grid';
export const PANEL_MAIN_X_AXIS_ID = 'panel-main-x-axis';
export const PANEL_NAVIGATOR_X_AXIS_ID = 'panel-navigator-x-axis';
export const PANEL_NAVIGATOR_DATA_X_AXIS_ID = 'panel-navigator-data-x-axis';
export const PANEL_LEFT_Y_AXIS_ID = 'panel-left-y-axis';
export const PANEL_RIGHT_Y_AXIS_ID = 'panel-right-y-axis';
export const PANEL_NAVIGATOR_Y_AXIS_ID = 'panel-navigator-y-axis';
export const PANEL_MAIN_X_AXIS_INDEX = 0;
export const PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX = 1;
export const PANEL_NAVIGATOR_DATA_X_AXIS_INDEX = 2;
export const PANEL_INSIDE_DATA_ZOOM_ID = 'panel-inside-data-zoom';
export const PANEL_SLIDER_DATA_ZOOM_ID = 'panel-slider-data-zoom';
export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';
export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';
export const NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID = 'navigator-highlight-overlay';
export const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
export const ANNOTATION_LABEL_SERIES_ID_PREFIX = 'annotation-label-series-';
export const HIGHLIGHT_OUTLINE_WIDTH = 1;

export const DEFAULT_NOT_SHOW = { show: false } as const;

export const PANEL_AXIS_LABEL_STYLE = { color: '#f8f8f8', fontSize: 10 } satisfies XAXisComponentOption['axisLabel'];

export const Y_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
    formatter: formatYAxisLabel,
} satisfies YAXisComponentOption['axisLabel'];

export const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } } satisfies AxisLineStyleOption;
export const AXIS_SPLIT_LINE_STYLE = { color: '#323333', width: 1 } satisfies AxisSplitLineStyleOption;

function formatYAxisLabel(value: string | number): string {
    const sNumericValue = Number(value);

    if (!Number.isFinite(sNumericValue)) {
        return String(value);
    }

    const sNormalizedValue = Object.is(sNumericValue, -0) ? 0 : sNumericValue;
    const sAbsoluteValue = Math.abs(sNormalizedValue);
    const sUnitIndex = COMPACT_AXIS_UNITS.findIndex(
        (unit) => sAbsoluteValue >= unit.value,
    );

    if (sUnitIndex === -1) {
        return STANDARD_AXIS_NUMBER_FORMATTER.format(sNormalizedValue);
    }

    const sShouldUseNextLargerUnit =
        sUnitIndex > 0 &&
        Math.round((sAbsoluteValue / COMPACT_AXIS_UNITS[sUnitIndex].value) * 10) / 10 >=
            1000;
    const sUnit = COMPACT_AXIS_UNITS[
        sShouldUseNextLargerUnit ? sUnitIndex - 1 : sUnitIndex
    ];

    return `${COMPACT_AXIS_NUMBER_FORMATTER.format(
        sNormalizedValue / sUnit.value,
    )}${sUnit.suffix}`;
}
