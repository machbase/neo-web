//I have extracted multiple utility functions that are pure to this folder.
//I hope these functions stay pure

import moment from 'moment';
import { isEmpty } from '@/utils';

export type EChartGrid = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type EChartXAxis = {
    type: string;
    axisLine: { lineStyle: { color: string } };
    axisLabel: { color: string; fontSize: string };
    splitLine: { show: boolean; lineStyle: { color: string } };
    min?: number;
    max?: number;
};

export type EChartYAxisItem = {
    type: string;
    position: string;
    axisLine: { lineStyle: { color: string } };
    axisLabel: { color: string; fontSize: string };
    splitLine: { show: boolean; lineStyle: { color: string; width: number } };
    min?: number;
    max?: number;
    scale: boolean;
};

export type EChartSeriesItem = {
    name: string;
    type: string;
    data: any[];
    smooth: boolean;
    lineStyle: { width: number };
    showSymbol: boolean;
    symbolSize?: number;
    areaStyle?: { opacity: number };
    yAxisIndex: number;
    color?: string;
};

export type EChartTooltip = {
    trigger: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    textStyle: { color: string };
    confine: boolean;
};

export type EChartLegend = {
    show: boolean;
    textStyle: { color: string; fontSize: string };
    left: string;
    itemGap: number;
};

export type EChartDataZoomItem = {
    type: string;
    start: number;
    end: number;
    handleSize: string;
    fillerColor: string;
    borderColor: string;
};

export type EChartOptionResult = {
    grid: EChartGrid;
    xAxis: EChartXAxis;
    yAxis: EChartYAxisItem[];
    series: EChartSeriesItem[];
    tooltip: EChartTooltip;
    legend: EChartLegend;
    dataZoom: EChartDataZoomItem[];
    backgroundColor: string;
};

function convertXAxis(hcXAxis: any): EChartXAxis {
    const type = hcXAxis.type === 'datetime' ? 'time' : hcXAxis.type || 'time';
    return {
        type,
        axisLine: { lineStyle: { color: hcXAxis.lineColor || '#323333' } },
        axisLabel: {
            color: hcXAxis.labels?.style?.color || '#00ff6a',
            fontSize: hcXAxis.labels?.style?.fontSize || '10px',
        },
        splitLine: {
            show: (hcXAxis.gridLineWidth ?? 0) > 0,
            lineStyle: { color: hcXAxis.gridLineColor || '#323333' },
        },
        min: hcXAxis.min,
        max: hcXAxis.max,
    };
}

function convertYAxis(hcYAxis: any): EChartYAxisItem[] {
    const axes = Array.isArray(hcYAxis) ? hcYAxis : [hcYAxis || {}];
    return axes.map((axis: any) => ({
        type: axis.type || 'value',
        position: axis.opposite ? 'right' : 'left',
        axisLine: { lineStyle: { color: axis.lineColor || '#323333' } },
        axisLabel: {
            color: axis.labels?.style?.color || '#afb5bc',
            fontSize: axis.labels?.style?.fontSize || '10px',
        },
        splitLine: {
            show: (axis.gridLineWidth ?? 0) > 0,
            lineStyle: { color: axis.gridLineColor || '#323333', width: axis.gridLineWidth || 1 },
        },
        min: axis.min,
        max: axis.max,
        scale: axis.startOnTick !== false,
    }));
}

function convertSeries(hcSeries: any, chartType: string, plotSeries: any): EChartSeriesItem[] {
    return (hcSeries || []).map((s: any) => {
        const seriesType = chartType === 'area' ? 'line' : s.type || chartType || 'line';
        return {
            name: s.name || '',
            type: seriesType,
            data: s.data || [],
            smooth: false,
            lineStyle: { width: plotSeries.lineWidth ?? s.lineWidth ?? 1 },
            showSymbol: plotSeries.marker?.enabled ?? false,
            symbolSize: plotSeries.marker?.radius ? plotSeries.marker.radius * 2 : undefined,
            areaStyle: hcChart.type === 'area' || plotSeries.fillOpacity > 0
                ? { opacity: plotSeries.fillOpacity ?? 0.3 }
                : undefined,
            yAxisIndex: s.yAxis ?? 0,
            color: s.color,
        };
    });
}

function convertTooltip(hcTooltip: any): EChartTooltip {
    return {
        trigger: hcTooltip.shared ? 'axis' : 'item',
        backgroundColor: hcTooltip.backgroundColor || '#1f1d1d',
        borderColor: hcTooltip.borderColor || '#292929',
        borderWidth: hcTooltip.borderWidth ?? 1,
        textStyle: { color: '#afb5bc' },
        confine: true,
    };
}

function convertLegend(hcLegend: any): EChartLegend {
    return {
        show: hcLegend.enabled ?? false,
        textStyle: {
            color: hcLegend.itemStyle?.color || '#e7e8ea',
            fontSize: hcLegend.itemStyle?.fontSize || '10px',
        },
        left: hcLegend.align || 'left',
        itemGap: hcLegend.itemDistance ?? 15,
    };
}

function convertDataZoom(enabled: boolean, maskFill: string, outlineColor: string): EChartDataZoomItem[] {
    if (!enabled) return [];
    return [{
        type: 'slider',
        start: 0,
        end: 100,
        handleSize: '100%',
        fillerColor: maskFill,
        borderColor: outlineColor,
    }];
}

function convertGrid(navigatorEnabled: boolean): EChartGrid {
    return { top: 50, right: 35, bottom: navigatorEnabled ? 80 : 50, left: 35 };
}

export function HighChartOptionConvertToEChart(highChartOptions: any): EChartOptionResult {
    const hcChart = highChartOptions.chart || {};
    const hcNavigator = highChartOptions.navigator || {};
    const chartType = hcChart.type || 'line';
    const plotSeries = highChartOptions.plotOptions?.series || {};
    const navigatorEnabled = hcNavigator.enabled ?? false;
    const navigatorMaskFill = hcNavigator.maskFill || 'rgba(119, 119, 119, .3)';
    const navigatorOutlineColor = hcNavigator.outlineColor || '#323333';

    return {
        grid: convertGrid(navigatorEnabled),
        xAxis: convertXAxis(highChartOptions.xAxis || {}),
        yAxis: convertYAxis(highChartOptions.yAxis),
        series: convertSeries(highChartOptions.series, chartType, plotSeries),
        tooltip: convertTooltip(highChartOptions.tooltip || {}),
        legend: convertLegend(highChartOptions.legend || {}),
        dataZoom: convertDataZoom(navigatorEnabled, navigatorMaskFill, navigatorOutlineColor),
        backgroundColor: hcChart.backgroundColor || '#252525',
    };
}

export function convertInterType(gUnit: string) {
    switch (gUnit) {
        case 's':
            return 'sec';
        case 'm':
            return 'min';
        case 'h':
            return 'hour';
        case 'd':
            return 'day';
        default:
            return gUnit;
    }
}
export function getInterval(aType: string, aValue: number) {
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

export function calcInterval(
    aBgn: number,
    aEnd: number,
    aWidth: number,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aIsNavi?: boolean,
): { IntervalType: string; IntervalValue: number; } {
    const diff = aEnd - aBgn;
    const second = Math.floor(diff / 1000);
    const pixelsPerTick = aIsRaw && !aIsNavi ? aPixelsPerTickRaw : aPixelsPerTick;
    const calc = second / (aWidth / pixelsPerTick);
    const ret = { type: 'sec', value: 1 };
    if (calc > 60 * 60 * 12) {
        // interval > 12H
        ret.type = 'day';
        ret.value = Math.ceil(calc / (60 * 60 * 24));
    } else if (calc > 60 * 60 * 6) {
        // interval > 6H
        ret.type = 'hour';
        ret.value = 12;
    } else if (calc > 60 * 60 * 3) {
        // interval > 3H
        ret.type = 'hour';
        ret.value = 6;
    } else if (calc > 60 * 60) {
        // interval > 1H
        ret.type = 'hour';
        ret.value = Math.ceil(calc / (60 * 60));
    } else if (calc > 60 * 30) {
        // interval > 30M
        ret.type = 'hour';
        ret.value = 1;
    } else if (calc > 60 * 20) {
        // interval > 20M
        ret.type = 'min';
        ret.value = 30;
    } else if (calc > 60 * 15) {
        // interval > 15M
        ret.type = 'min';
        ret.value = 20;
    } else if (calc > 60 * 10) {
        // interval > 10M
        ret.type = 'min';
        ret.value = 15;
    } else if (calc > 60 * 5) {
        // interval > 5M
        ret.type = 'min';
        ret.value = 10;
    } else if (calc > 60 * 3) {
        // interval > 3M
        ret.type = 'min';
        ret.value = 5;
    } else if (calc > 60) {
        // interval > 1M
        ret.type = 'min';
        ret.value = Math.ceil(calc / 60);
    } else if (calc > 30) {
        // interval > 30S
        ret.type = 'min';
        ret.value = 1;
    } else if (calc > 20) {
        // interval > 20S
        ret.type = 'sec';
        ret.value = 30;
    } else if (calc > 15) {
        // interval > 15S
        ret.type = 'sec';
        ret.value = 20;
    } else if (calc > 10) {
        // interval > 10S
        ret.type = 'sec';
        ret.value = 15;
    } else if (calc > 5) {
        // interval > 5S
        ret.type = 'sec';
        ret.value = 10;
    } else if (calc > 3) {
        // interval > 3S
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
    // KEV.TAG => KEV.TAG
    // MOUNT.KEV.TAG => MOUNT.KEV.TAG
    if (parts.length > 1) return table;
    // TAG => SYS.TAG
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
            ? series.data
            : series.xData.map((x: number, i: number) => ({
                  x: x,
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

export function calculateSCount(
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
