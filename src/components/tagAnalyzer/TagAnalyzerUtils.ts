// Shared TagAnalyzer utility functions.
// Keep this file for feature-wide helpers that are reused across panel, modal, and edit flows.

import moment from 'moment';
import { isEmpty } from '@/utils';
import type {
    TagAnalyzerChartSeriesItem,
    TagAnalyzerMinMaxItem,
    TagAnalyzerSeriesConfig,
} from './panel/PanelModel';
import { getSourceTagName } from './utils/legacy/LegacyConversion';

export const TAG_ANALYZER_AGGREGATION_MODES = [
    { key: 'min', value: 'min' },
    { key: 'max', value: 'max' },
    { key: 'sum', value: 'sum' },
    { key: 'cnt', value: 'cnt' },
    { key: 'avg', value: 'avg' },
    { key: 'first', value: 'first' },
    { key: 'last', value: 'last' },
];

export const TAG_ANALYZER_AGGREGATION_MODE_OPTIONS = TAG_ANALYZER_AGGREGATION_MODES.map(
    (aMode) => ({
        label: aMode.value,
        value: aMode.value,
        disabled: undefined,
    }),
);

// Used by TagAnalyzer shared helpers to type interval spec.
type IntervalSpec = {
    type: 'sec' | 'min' | 'hour' | 'day';
    value: number;
};

// Used by TagAnalyzer shared helpers to type chart point.
type ChartPoint = {
    x: number;
    y: number;
};

// Used by TagAnalyzer shared helpers to type one quick-select option.
export type QuickSelectRangeItem = {
    key: number;
    name: string;
    value: [string, string];
};

// Used by TagAnalyzer shared helpers to type one rendered quick-select row.
export type QuickSelectRow = {
    key: number;
    items: QuickSelectRangeItem[];
};

const INTERVAL_RULES: Array<{
    limit: number;
    spec: (calc: number) => IntervalSpec;
}> = [
    {
        limit: 60 * 60 * 12,
        spec: (calc) => ({
            type: 'day',
            value: Math.ceil(calc / (60 * 60 * 24)),
        }),
    },
    {
        limit: 60 * 60 * 6,
        spec: () => ({
            type: 'hour',
            value: 12,
        }),
    },
    {
        limit: 60 * 60 * 3,
        spec: () => ({
            type: 'hour',
            value: 6,
        }),
    },
    {
        limit: 60 * 60,
        spec: (calc) => ({
            type: 'hour',
            value: Math.ceil(calc / (60 * 60)),
        }),
    },
    {
        limit: 60 * 30,
        spec: () => ({
            type: 'hour',
            value: 1,
        }),
    },
    {
        limit: 60 * 20,
        spec: () => ({
            type: 'min',
            value: 30,
        }),
    },
    {
        limit: 60 * 15,
        spec: () => ({
            type: 'min',
            value: 20,
        }),
    },
    {
        limit: 60 * 10,
        spec: () => ({
            type: 'min',
            value: 15,
        }),
    },
    {
        limit: 60 * 5,
        spec: () => ({
            type: 'min',
            value: 10,
        }),
    },
    {
        limit: 60 * 3,
        spec: () => ({
            type: 'min',
            value: 5,
        }),
    },
    {
        limit: 60,
        spec: (calc) => ({
            type: 'min',
            value: Math.ceil(calc / 60),
        }),
    },
    {
        limit: 30,
        spec: () => ({
            type: 'min',
            value: 1,
        }),
    },
    {
        limit: 20,
        spec: () => ({
            type: 'sec',
            value: 30,
        }),
    },
    {
        limit: 15,
        spec: () => ({
            type: 'sec',
            value: 20,
        }),
    },
    {
        limit: 10,
        spec: () => ({
            type: 'sec',
            value: 15,
        }),
    },
    {
        limit: 5,
        spec: () => ({
            type: 'sec',
            value: 10,
        }),
    },
    {
        limit: 3,
        spec: () => ({
            type: 'sec',
            value: 5,
        }),
    },
];

/**
 * Normalizes short interval units into the names expected by TagAnalyzer fetch calls.
 * @param aUnit The shorthand interval unit from panel configuration.
 * @returns The normalized interval unit used by fetch helpers.
 */
export function convertIntervalUnit(aUnit: string): string {
    switch (aUnit) {
        case 's':
            return 'sec';
        case 'm':
            return 'min';
        case 'h':
            return 'hour';
        case 'd':
            return 'day';
        default:
            return aUnit;
    }
}

/**
 * Converts an interval option into milliseconds for rollup and fetch calculations.
 * @param aType The normalized interval unit.
 * @param aValue The interval magnitude.
 * @returns The interval length in milliseconds.
 */
export function getIntervalMs(aType: string, aValue: number): number {
    switch (aType) {
        case 'sec':
            return aValue * 1000;
        case 'min':
            return aValue * 60 * 1000;
        case 'hour':
            return aValue * 60 * 60 * 1000;
        case 'day':
            return aValue * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
}

/**
 * Calculates the fetch interval that best matches the available chart width.
 * @param aBgn The visible range start time.
 * @param aEnd The visible range end time.
 * @param aWidth The current chart width.
 * @param aIsRaw Whether the chart is loading raw data.
 * @param aPixelsPerTick The configured sampled pixels-per-tick value.
 * @param aPixelsPerTickRaw The configured raw-data pixels-per-tick value.
 * @param aIsNavi Whether the calculation is for the navigator chart.
 * @returns The interval option that should be used for the next fetch.
 */
export function calculateInterval(
    aBgn: number,
    aEnd: number,
    aWidth: number,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aIsNavi: boolean | undefined,
): { IntervalType: string; IntervalValue: number } {
    const diff = aEnd - aBgn;
    const second = Math.floor(diff / 1000);
    const pixelsPerTick = aIsRaw && !aIsNavi ? aPixelsPerTickRaw : aPixelsPerTick;
    const calc = second / (aWidth / pixelsPerTick);
    const interval = resolveInterval(calc);
    const intervalValue = interval.value < 1 ? 1 : interval.value;

    return {
        IntervalType: interval.type,
        IntervalValue: intervalValue,
    };
}

/**
 * Prefixes bare table names with the current admin schema.
 * @param table The configured table name.
 * @param adminId The current admin/schema id.
 * @returns The fully qualified table name.
 */
export function checkTableUser(table: string, adminId: string): string {
    const parts = table.split('.');
    if (parts.length > 1) return table;
    return `${adminId.toUpperCase()}.${table}`;
}

/**
 * Formats a time span into a short human-readable label.
 * @param startTime The range start time.
 * @param endTime The range end time.
 * @returns A compact duration string for the selected range.
 */
export function getDurationInString(startTime: number, endTime: number): string {
    const duration = moment.duration(endTime - startTime);
    const days = Math.floor(duration.asDays());
    return `${formatDurationPart(days, 'd')}${formatDurationPart(duration.hours(), 'h')}${formatDurationPart(duration.minutes(), 'm')}${formatDurationPart(
        duration.seconds(),
        's',
    )}${duration.milliseconds() === 0 ? '' : ` ${duration.milliseconds()}ms`}`;
}

/**
 * Builds min/max/avg summaries for the points inside the selected range.
 * @param seriesList The visible series to summarize.
 * @param tagSet The tag metadata used to label each summary row.
 * @param xMin The selected range start time.
 * @param xMax The selected range end time.
 * @returns The calculated min/max/avg rows for the selected window.
 */
export function computeSeriesCalcList(
    seriesList: Array<Pick<TagAnalyzerChartSeriesItem, 'data'>>,
    tagSet: Pick<TagAnalyzerSeriesConfig, 'table' | 'sourceTagName' | 'alias'>[],
    xMin: number,
    xMax: number,
): TagAnalyzerMinMaxItem[] {
    const calcList: TagAnalyzerMinMaxItem[] = [];
    seriesList.forEach((series, index) => {
        const filterData = toChartPoints(series)
            .filter((item) => xMin <= item.x && xMax >= item.x)
            .map((item) => item.y);

        if (!isEmpty(filterData)) {
            const totalValue = filterData.reduce((sum: number, value: number) => sum + value, 0);
            calcList.push({
                table: tagSet[index].table,
                name: getSourceTagName(tagSet[index]),
                alias: tagSet[index].alias,
                min: Math.min(...filterData).toFixed(5),
                max: Math.max(...filterData).toFixed(5),
                avg: (totalValue / filterData.length).toFixed(5),
            });
        }
    });
    return calcList;
}

/**
 * Derives the requested row count for either sampled or full-resolution fetches.
 * @param limit The current fetch limit, if one is already enforced.
 * @param useSampling Whether sampling is enabled for the request.
 * @param isRaw Whether the request is for raw data.
 * @param pixelsPerTick The configured sampled pixels-per-tick value.
 * @param pixelsPerTickRaw The configured raw-data pixels-per-tick value.
 * @param width The current chart width.
 * @returns The row count to request from the repository.
 */
export function calculateSampleCount(
    limit: number,
    useSampling: boolean,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    let count = -1;
    if (limit < 0) {
        if (useSampling && isRaw) {
            if (pixelsPerTickRaw > 0) {
                count = Math.ceil(chartWidth / pixelsPerTickRaw);
            } else {
                count = Math.ceil(chartWidth);
            }
        } else {
            if (pixelsPerTick > 0) {
                count = Math.ceil(chartWidth / pixelsPerTick);
            } else {
                count = Math.ceil(chartWidth);
            }
        }
    }
    return count;
}

/**
 * Groups the saved quick-select options into keyed rows for rendering.
 * @param aTimeRange The saved quick-select option groups.
 * @returns The keyed quick-select rows used by the time-range UI.
 */
export function buildQuickSelectRows(aTimeRange: QuickSelectRangeItem[][]): QuickSelectRow[] {
    return aTimeRange.map((aItem, aIdx) => ({
        key: aIdx,
        items: aItem,
    }));
}

/**
 * Chooses the closest display interval for the current time span and pixel density.
 * @param calc The seconds-per-tick estimate derived from the visible range and width.
 * @returns The interval specification that best fits the current chart density.
 */
function resolveInterval(calc: number): IntervalSpec {
    const rule = INTERVAL_RULES.find(({ limit }) => calc > limit);
    if (rule) {
        return rule.spec(calc);
    }

    return {
        type: 'sec',
        value: Math.ceil(calc),
    };
}

/**
 * Formats one duration segment and skips empty units.
 * @param value The duration value for the current unit.
 * @param suffix The text suffix for the current unit.
 * @returns The formatted duration part, or an empty string when the value is zero.
 */
function formatDurationPart(value: number, suffix: string): string {
    return value === 0 ? '' : `${value}${suffix} `;
}

/**
 * Normalizes tuple-based chart series data into point objects.
 * @param aSeries The series source to normalize.
 * @returns The normalized chart points used by the selection math.
 */
function toChartPoints(aSeries: Pick<TagAnalyzerChartSeriesItem, 'data'>): ChartPoint[] {
    const sData = aSeries.data;

    if (Array.isArray(sData) && !isEmpty(sData)) {
        return sData.map((aItem) => {
            if (Array.isArray(aItem)) {
                return {
                    x: aItem[0],
                    y: aItem[1],
                };
            }

            return aItem;
        });
    }

    return [];
}
