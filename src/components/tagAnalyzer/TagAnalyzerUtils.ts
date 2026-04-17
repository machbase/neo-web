// Shared TagAnalyzer utility functions.
// Keep this file for feature-wide helpers that are reused across panel, modal, and edit flows.

import moment from 'moment';
import { isEmpty } from '@/utils';
import type {
    ChartSeriesItem,
    MinMaxItem,
    SeriesConfig,
} from './common/CommonTypes';
import { getSourceTagName } from './utils/legacy/LegacyUtils';
export {
    calculateInterval,
    convertIntervalUnit,
    getIntervalMs,
} from './common/CommonUtils';

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

/**
 * Prefixes bare table names with the current admin schema.
 * @param table The configured table name.
 * @param adminId The current admin/schema id.
 * @returns The fully qualified table name.
 */
export function getQualifiedTableName(table: string, adminId: string): string {
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
export function formatDurationLabel(startTime: number, endTime: number): string {
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
export function buildSeriesSummaryRows(
    seriesList: Array<Pick<ChartSeriesItem, 'data'>>,
    tagSet: Pick<SeriesConfig, 'table' | 'sourceTagName' | 'alias'>[],
    xMin: number,
    xMax: number,
): MinMaxItem[] {
    const calcList: MinMaxItem[] = [];
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
function toChartPoints(aSeries: Pick<ChartSeriesItem, 'data'>): ChartPoint[] {
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
