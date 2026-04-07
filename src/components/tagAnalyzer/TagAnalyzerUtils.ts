// Shared TagAnalyzer utility functions.
// Keep this file for feature-wide helpers that are reused across panel, modal, and edit flows.

import moment from 'moment';
import { isEmpty } from '@/utils';

type IntervalSpec = {
    type: 'sec' | 'min' | 'hour' | 'day';
    value: number;
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

function formatDurationPart(value: number, suffix: string) {
    return value === 0 ? '' : `${value}${suffix} `;
}

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

export function checkTableUser(table: string, adminId: string): string {
    const parts = table.split('.');
    if (parts.length > 1) return table;
    return `${adminId.toUpperCase()}.${table}`;
}

export function getDuration(startTime: number, endTime: number): string {
    const duration = moment.duration(endTime - startTime);
    const days = Math.floor(duration.asDays());
    return `${formatDurationPart(days, 'd')}${formatDurationPart(duration.hours(), 'h')}${formatDurationPart(duration.minutes(), 'm')}${formatDurationPart(
        duration.seconds(),
        's',
    )}${duration.milliseconds() === 0 ? '' : ` ${duration.milliseconds()}ms`}`;
}

export function computeSeriesCalcList(
    seriesList: any[],
    tagSet: any[],
    xMin: number,
    xMax: number,
): any[] {
    const calcList: any[] = [];
    seriesList.forEach((series: any, index: number) => {
        const seriesData = !isEmpty(series.data)
            ? series.data.map((item: any) => {
                  if (Array.isArray(item)) {
                      return {
                          x: item[0],
                          y: item[1],
                      };
                  }

                  return item;
              })
            : series.xData.map((x: number, i: number) => ({
                  x,
                  y: series.yData[i],
              }));
        const filterData = (seriesData || [])
            .filter((item: any) => xMin <= item.x && xMax >= item.x)
            .map((item: any) => item.y);

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
