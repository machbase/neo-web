import type {
    LineSeriesOption,
    MarkAreaComponentOption,
    ScatterSeriesOption,
} from 'echarts';

export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';

export const HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION: LineSeriesOption = {
    id: 'highlight-overlay',
    type: 'line' as const,
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: [],
    symbol: 'none' as const,
    showSymbol: false,
    silent: true,
    animation: false,
    legendHoverLink: false,
    lineStyle: {
        width: 0,
        opacity: 0,
    },
    itemStyle: {
        opacity: 0,
    },
    tooltip: {
        show: false,
    },
    z: 1,
    emphasis: {
        disabled: true,
    },
};

export const HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION: MarkAreaComponentOption = {
    silent: true,
    itemStyle: {
        color: 'rgba(253, 181, 50, 0.16)',
    },
    label: {
        show: false,
        color: '#fdb532',
        fontSize: 10,
    },
};

export const HIGHLIGHT_LABEL_SERIES_STATIC_OPTION: ScatterSeriesOption = {
    id: HIGHLIGHT_LABEL_SERIES_ID,
    type: 'scatter' as const,
    xAxisIndex: 0,
    yAxisIndex: 0,
    symbol: 'roundRect' as const,
    symbolSize: [120, 18],
    animation: false,
    legendHoverLink: false,
    itemStyle: {
        color: 'rgba(0, 0, 0, 0)',
        borderColor: 'rgba(0, 0, 0, 0)',
    },
    label: {
        show: true,
        position: 'inside' as const,
        color: '#fdb532',
        fontSize: 10,
        formatter: '{b}',
        padding: [2, 4],
    },
    emphasis: {
        scale: false,
    },
    tooltip: {
        show: false,
    },
    z: 3,
};
