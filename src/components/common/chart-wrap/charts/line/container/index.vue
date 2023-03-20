<template><highcharts ref="chart" constructor-type="stockChart" :options="cChartOptions"></highcharts></template>

<script lang="ts" setup name="AreaChart">
import { HighchartsDataset, LineDataset, LinePanel, TagSet } from '@/interface/chart';
import { useStore } from '@/store';
import { toTimeUtcChart } from '@/utils/utils';
import { computed, defineExpose, defineProps, reactive, ref, watch, withDefaults, defineEmits } from 'vue';
import { formatColors } from '@/utils/utils';
import { watchEffect } from 'vue';
import moment from 'moment';
import { cloneDeep, isEmpty } from 'lodash';
import { onMounted } from 'vue';
interface BarChartContainerProps {
    chartData: LineDataset;
    viewData: LineDataset;
    panelInfo: LinePanel;
    xAxisMinRange: string | number;
    xAxisMaxRange: string | number;
    xMinTimeRangeViewPort: string | number;
    xMaxTimeRangeViewPort: string | number;
    isStockChart?: boolean;
    maxYChart?: number;
    pIsZoom: boolean;
}

const props = withDefaults(defineProps<BarChartContainerProps>(), {});
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const emit = defineEmits(['eOnChange']);

const data = reactive({
    sIsTag: true as boolean,
    sYaxis: [] as any[],
    sMasterSeriesData: [] as HighchartsDataset[],
    sViewPortSeriesData: [] as HighchartsDataset[],
    sTimeChartXaxis: {
        min: '' as string | number,
        max: '' as string | number,
    },
    sChartWidth: 0 as number,
});
const chart = ref();

const cChartOptions = computed(() => {
    return {
        colors: formatColors(props.panelInfo.color_set),
        chart: {
            height: props.panelInfo.chart_height < 400 ? 400 : props.panelInfo.chart_height,
            width: (props.panelInfo.chart_width as number) <= 0 ? null : props.panelInfo.chart_width,
            type: 'area',
            zoomType: 'x',
            backgroundColor: cIsDarkMode.value ? '#1e1f1f' : '#f6f7f8',
            lineWidth: 1,
            events: {
                selectedpoints: function (event) {
                    console.log('event click chart', chart);
                },
                render() {},
            },
            // margin: [0, 40, 100, 40],
            // spacingTop: 50,
        },
        // data Chart
        series: data.sMasterSeriesData,
        // data
        // data: {},
        // option chart
        plotOptions: {
            series: {
                lineWidth: props.panelInfo.stroke,
                fillOpacity: props.panelInfo.fill,
                cursor: 'pointer',
                marker: {
                    enabled: props.panelInfo.show_point === 'Y',
                    radius: props.panelInfo.point_radius,
                },
                states: {
                    hover: {
                        enabled: true,
                        lineWidthPlus: 0,
                        lineWidth: 0,
                    },
                },
                point: {
                    events: {
                        click: function (e) {
                            console.log('select point', e);
                        },
                    },
                },
            },
        },
        // view point
        scrollbar: {
            liveRedraw: false,
            enabled: false,
        },
        rangeSelector: {
            buttons: [],
            allButtonsEnabled: false,
            inputEnabled: false,
            selected: 1,
        },
        // view point navigator
        navigator: {
            enabled: data.sIsTag,
            adaptToUpdatedData: false,
            handles: {
                // width: 0.5,
                opacity: 0,
                height: 26,
            },
            height: 26,
            maskFill: 'rgba(119, 119, 119, .3)',
            // series: data.sViewPortSeriesData,
            series: data.sViewPortSeriesData.map((i) => {
                return {
                    data: i.data,
                    marker: i.marker,
                };
            }),
            outlineWidth: 1,
            // outlineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            xAxis: {
                left: 28,
                width: data.sChartWidth - 28,
                type: 'datetime',
                min: toTimeUtcChart(props.xMinTimeRangeViewPort as string),
                max: toTimeUtcChart(props.xMaxTimeRangeViewPort as string),
                labels: {
                    align: 'center',
                    style: {
                        color: cIsDarkMode.value ? '#afb5bc' : '#6c6e70',
                        fontSize: '10px',
                    },
                    y: 20,
                },
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            },
            yAxis: {
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                gridLineWidth: 1,
            },
            margin: data.sIsTag ? 65 : 0,
        },
        //  Time chart
        xAxis: {
            type: 'datetime',
            ordinal: false,
            gridLineWidth: 1,
            gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            labels: {
                align: 'center',
                style: {
                    color: cIsDarkMode.value ? '#afb5bc' : '#6c6e70',
                    fontSize: '10px',
                },
                y: 30,
            },
            minorTickColor: 'red',
            min: toTimeUtcChart(props.xAxisMinRange as string),
            max: toTimeUtcChart(props.xAxisMaxRange as string),
            events: {
                setExtremes: afterSetExtremes,
            },
            crosshair: {
                snap: false,
                width: 0.5,
                color: 'red',
            },
            tickColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
        },
        // Value chart
        yAxis: [
            {
                showLastLabel: true,
                // max: data.sMasterSeriesData[index].data.length > 0 ? getMaxValue(data.sMasterSeriesData[index]?.data) : null,
                gridLineWidth: 1,
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                startOnTick: true,
                endOnTick: true,
                labels: {
                    align: 'center',
                    style: {
                        color: cIsDarkMode.value ? '#afb5bc' : '#6c6e70',
                        fontSize: '10px',
                    },
                    x: -5,
                    y: 3,
                },
                opposite: false,
            },
            {
                showLastLabel: true,
                // max: data.sMasterSeriesData[index].data.length > 0 ? getMaxValue(data.sMasterSeriesData[index]?.data) : null,
                gridLineWidth: 1,
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                startOnTick: true,
                endOnTick: true,
                labels: {
                    align: 'center',
                    style: {
                        color: cIsDarkMode.value ? '#afb5bc' : '#6c6e70',
                        fontSize: '10px',
                    },
                    x: -5,
                    y: 3,
                },
                opposite: true,
            },
        ],
        // Info tag chart
        tooltip: {
            valueDecimals: 2,
            split: false,
            shared: true,
            followPointer: true,
            backgroundColor: cIsDarkMode.value ? '#1f1d1d' : '#f6f7f8',
            borderColor: cIsDarkMode.value ? '#292929' : '#dbe2ea',
            borderWidth: 1,
            useHTML: true,
            xDateFormat: '%Y-%m-%d %H:%M:%S.%L',
            headerFormat: `<div style="minWidth:200px;paddingLeft:10px; fontSize:10px"><div style="color: ${cIsDarkMode.value ? '#afb5bc' : '#2a313b'}">{point.key}</div>`,
            pointFormat:
                '<div style="display: flex; justifyContent: space-between"><p style="color: {series.color}">{series.name} </p>' +
                '<p style="color: {series.color}">{point.y}</p></div>',
            footerFormat: '</div>',
        },
        // list tag
        legend: {
            enabled: true,
            // props.panelInfo.show_legend === 'B'
            align: 'left',
            itemDistance: 15,
            squareSymbol: false,
            // symbolHeight: 5,
            // symbolWidth: 10,
            symbolRadius: 1,
            itemHoverStyle: {
                color: '#23527c',
                'text-decoration': 'underline',
            },
            itemStyle: {
                color: cIsDarkMode.value ? '#e7e8ea' : '#2a313b',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 'none',
                'font-family': 'Open Sans,Helvetica,Arial,sans-serif',
                textOverflow: 'ellipsis',
                'text-decoration': 'none',
            },
            margin: 30,
            // x: 20,
        },
        // No data
        lang: {
            noData: 'No data',
        },
        noData: {
            style: {
                fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
                fontSize: '24px',
                color: '#9ca2ab',
                fontStyle: 'italic',
                fontWeight: 'normal',
            },
        },
        // show link web
        credits: {
            enabled: false,
        },
    };
});

function afterSetExtremes(e) {
    const { chart } = e.target;
    data.sTimeChartXaxis.min = e.min;
    data.sTimeChartXaxis.max = e.max;
    emit('eOnChange', data.sTimeChartXaxis);
}

const updateMinMaxChart = (start: any, end: any) => {
    return chart.value.chart.xAxis[0].setExtremes(moment.utc(start).valueOf(), moment.utc(end).valueOf());
};

const getMaxValue = (array: number[][]) => {
    return array.reduce((result: number, current: any) => {
        if (current[1] > result) result = current[1];
        return result;
    }, 0);
};

const updateYaxis = (aInfo: TagSet[]) => {
    if (aInfo.length === 0) return [];
    return aInfo.map((i, index) => {
        return {
            showLastLabel: true,
            // max: data.sMasterSeriesData[index].data.length > 0 ? getMaxValue(data.sMasterSeriesData[index]?.data) : null,
            gridLineWidth: 1,
            gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            startOnTick: true,
            endOnTick: true,
            labels: {
                align: 'center',
                style: {
                    color: cIsDarkMode.value ? '#afb5bc' : '#6c6e70',
                    fontSize: '10px',
                },
                x: -5,
                y: 3,
            },
            opposite: i.use_y2 === 'N' ? false : true,
        };
    });
};

watch([() => props.chartData.datasets], () => {
    data.sMasterSeriesData = props.chartData.datasets || [];
});
watch([() => props.viewData.datasets], () => {
    data.sViewPortSeriesData = props.viewData.datasets || [];
});
watch([() => props.pIsZoom], () => {
    data.sIsTag = props.pIsZoom;
});
onMounted(() => {
    data.sChartWidth = chart.value.chart.plotWidth;
});

defineExpose({
    chart,
    updateMinMaxChart,
});
</script>

<style lang="scss">
/* @import 'index.scss'; */
:deep(.highcharts-legend.highcharts-no-tooltip) {
    display: v-bind("props.panelInfo.show_legend === 'B'? '': 'none'");
}
/* .chart-wrap {
    border: 1px solid !important ;
    border-color: v-bind("props.panelInfo.border_color === ''? 'red': 'blue'");
} */
</style>
