// Shared TagAnalyzer utility functions.
// Keep this file for feature-wide helpers that are reused across panel, modal, and edit flows.

import moment from 'moment';
import { isEmpty } from '@/utils';

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
    const ret = { type: 'sec', value: 1 };
    if (calc > 60 * 60 * 12) {
        ret.type = 'day';
        ret.value = Math.ceil(calc / (60 * 60 * 24));
    } else if (calc > 60 * 60 * 6) {
        ret.type = 'hour';
        ret.value = 12;
    } else if (calc > 60 * 60 * 3) {
        ret.type = 'hour';
        ret.value = 6;
    } else if (calc > 60 * 60) {
        ret.type = 'hour';
        ret.value = Math.ceil(calc / (60 * 60));
    } else if (calc > 60 * 30) {
        ret.type = 'hour';
        ret.value = 1;
    } else if (calc > 60 * 20) {
        ret.type = 'min';
        ret.value = 30;
    } else if (calc > 60 * 15) {
        ret.type = 'min';
        ret.value = 20;
    } else if (calc > 60 * 10) {
        ret.type = 'min';
        ret.value = 15;
    } else if (calc > 60 * 5) {
        ret.type = 'min';
        ret.value = 10;
    } else if (calc > 60 * 3) {
        ret.type = 'min';
        ret.value = 5;
    } else if (calc > 60) {
        ret.type = 'min';
        ret.value = Math.ceil(calc / 60);
    } else if (calc > 30) {
        ret.type = 'min';
        ret.value = 1;
    } else if (calc > 20) {
        ret.type = 'sec';
        ret.value = 30;
    } else if (calc > 15) {
        ret.type = 'sec';
        ret.value = 20;
    } else if (calc > 10) {
        ret.type = 'sec';
        ret.value = 15;
    } else if (calc > 5) {
        ret.type = 'sec';
        ret.value = 10;
    } else if (calc > 3) {
        ret.type = 'sec';
        ret.value = 5;
    } else {
        ret.type = 'sec';
        ret.value = Math.ceil(calc);
    }
    if (ret.value < 1) {
        ret.value = 1;
    }
    return {
        IntervalType: ret.type,
        IntervalValue: ret.value,
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
    return `${days === 0 ? '' : days + 'd '}${duration.hours() === 0 ? '' : duration.hours() + 'h '}${duration.minutes() === 0 ? '' : duration.minutes() + 'm '}${
        duration.seconds() === 0 ? '' : duration.seconds() + 's '
    }${duration.milliseconds() === 0 ? '' : ' ' + duration.milliseconds() + 'ms'}`;
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
        const filterData: number[] = [];
        let totalValue = 0;
        if (seriesData) {
            seriesData
                .filter((d: any) => xMin <= d.x && xMax >= d.x)
                .forEach((item: any) => {
                    totalValue += item.y;
                    filterData.push(item.y);
                });
        }
        if (!isEmpty(filterData)) {
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
