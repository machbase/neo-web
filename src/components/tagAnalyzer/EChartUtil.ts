import type {
    EChartDataZoomItem,
    EChartGrid,
    EChartLegend,
    EChartOptionResult,
    EChartSeriesItem,
    EChartTooltip,
    EChartXAxis,
    EChartYAxisItem,
} from './EChartTypes';

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
            areaStyle:
                chartType === 'area' || plotSeries.fillOpacity > 0
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
