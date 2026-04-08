// Shared TagAnalyzer utility functions.
// Keep this file for feature-wide helpers that are reused across panel, modal, and edit flows.

import moment from 'moment';
import { isEmpty } from '@/utils';
import type { TagAnalyzerChartSeriesItem, TagAnalyzerMinMaxItem, TagAnalyzerTagItem } from './panel/TagAnalyzerPanelModelTypes';

type IntervalSpec = {
    type: 'sec' | 'min' | 'hour' | 'day';
    value: number;
};

type ChartPoint = {
    x: number;
    y: number;
};

type LegacyChartSeries = {
    data?: Array<[number, number] | ChartPoint>;
    xData: number[];
    yData: number[];
};

type SeriesCalcSource = TagAnalyzerChartSeriesItem | LegacyChartSeries;

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
 * Chooses the closest display interval for the current time span and pixel density.
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
 */
function formatDurationPart(value: number, suffix: string) {
    return value === 0 ? '' : `${value}${suffix} `;
}

/**
 * Normalizes short interval units into the names expected by TagAnalyzer fetch calls.
 */
export function convertIntervalUnit(aUnit: string) {
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
 */
export function getIntervalMs(aType: string, aValue: number) {
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
 */
export function calculateInterval(
    aBgn: number,
    aEnd: number,
    aWidth: number,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aIsNavi?: boolean,
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
 */
export function checkTableUser(table: string, adminId: string): string {
    const parts = table.split('.');
    if (parts.length > 1) return table;
    return `${adminId.toUpperCase()}.${table}`;
}

/**
 * Formats a time span into a short human-readable label.
 */
export function getDuration(startTime: number, endTime: number): string {
    const duration = moment.duration(endTime - startTime);
    const days = Math.floor(duration.asDays());
    return `${formatDurationPart(days, 'd')}${formatDurationPart(duration.hours(), 'h')}${formatDurationPart(duration.minutes(), 'm')}${formatDurationPart(
        duration.seconds(),
        's',
    )}${duration.milliseconds() === 0 ? '' : ` ${duration.milliseconds()}ms`}`;
}

/**
 * Normalizes either tuple-based or split x/y series data into point objects.
 */
function toChartPoints(aSeries: SeriesCalcSource): ChartPoint[] {
    if (!isEmpty(aSeries.data)) {
        return aSeries.data.map((aItem) => {
            if (Array.isArray(aItem)) {
                return {
                    x: aItem[0],
                    y: aItem[1],
                };
            }

            return aItem;
        });
    }

    if ('xData' in aSeries && 'yData' in aSeries) {
        return aSeries.xData.map((aX, aIndex) => ({
            x: aX,
            y: aSeries.yData[aIndex],
        }));
    }

    return [];
}

/**
 * Builds min/max/avg summaries for the points inside the selected range.
 */
export function computeSeriesCalcList(
    seriesList: SeriesCalcSource[],
    tagSet: Pick<TagAnalyzerTagItem, 'table' | 'tagName' | 'alias'>[],
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
                name: tagSet[index].tagName,
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
