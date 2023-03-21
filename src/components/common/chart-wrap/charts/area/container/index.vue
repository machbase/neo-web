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
    pIsRaw: boolean;
}

const props = withDefaults(defineProps<BarChartContainerProps>(), {});
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const emit = defineEmits(['eOnChange', 'eOnChangeIsZoom', 'eOnChangeRaw', 'eOnClick']);

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
                click: function (event) {
                    emit('eOnChangeIsZoom');
                    if (props.panelInfo.use_detail === 0) return false;
                    const chart = this;
                    var point = chart.xAxis[0].toValue(event.clientX - chart.plotLeft);
                    emit('eOnClick', {
                        min: point,
                        max: point + 1000,
                    });
                },
                render() {},
            },
            // margin: [0, 40, 100, 40],
            // spacingTop: 50,
        },
        // data Chart
        series: props.chartData.datasets,
        // data
        // data: {},
        // option chart
        plotOptions: {
            series: {
                showInNavigator: false,
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
                        click: function (event) {
                            emit('eOnChangeIsZoom');
                            if (props.panelInfo.use_detail === 0) return false;
                            emit('eOnClick', {
                                min: event.point.x,
                                max: event.point.x + 1000,
                            });
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
            enabled: props.pIsZoom,
            adaptToUpdatedData: false,
            handles: {
                // width: 0.5,
                opacity: 0,
                height: 26,
            },
            height: 26,
            maskFill:
                toTimeUtcChart(props.xAxisMinRange as string) - toTimeUtcChart(props.xAxisMaxRange as string) > props.panelInfo.raw_chart_threshold
                    ? '#2D2E57'
                    : 'rgba(119, 119, 119, .3)',
            // series: data.sViewPortSeriesData,
            series: props.viewData.datasets
                ? props.viewData.datasets.map((i) => {
                      return {
                          data: i.data,
                          marker: i.marker,
                      };
                  })
                : [],
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
            margin: props.pIsZoom ? 65 : 0,
        },
        //  Time chart
        xAxis: {
            zoomEnabled: props.panelInfo.use_zoom === 'Y',
            type: 'datetime',
            ordinal: false,
            gridLineWidth: props.panelInfo.show_x_tickline === 'Y' ? 1 : 0,
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
                // top: 0,
                // tickInterval: updateYaxis().left[0],
                reversed: props.panelInfo.use_normalize === 'Y',

                tickAmount: updateYaxis().left[0] === updateYaxis().left[1] && 1,
                tickPositions: updateYaxis().left[0] === updateYaxis().left[1] && [updateYaxis().left[0]],
                min: !props.pIsRaw
                    ? props.panelInfo.custom_min === 0
                        ? props.panelInfo.use_normalize === 'Y'
                            ? 0
                            : updateYaxis().left[0]
                        : props.panelInfo.custom_min
                    : props.panelInfo.custom_drilldown_min === 0
                    ? props.panelInfo.use_normalize === 'Y'
                        ? 0
                        : updateYaxis().left[0]
                    : props.panelInfo.custom_drilldown_min,
                max: !props.pIsRaw
                    ? props.panelInfo.custom_max === 0
                        ? props.panelInfo.use_normalize === 'Y'
                            ? 100
                            : updateYaxis().left[1]
                        : props.panelInfo.custom_max
                    : props.panelInfo.custom_drilldown_max2 === 0
                    ? props.panelInfo.use_normalize === 'Y'
                        ? 100
                        : updateYaxis().left[1]
                    : props.panelInfo.custom_drilldown_max2,
                // tickInterval: 100,
                showLastLabel: props.panelInfo.use_normalize === 'N',
                // max: data.sMasterSeriesData[index].data.length > 0 ? getMaxValue(data.sMasterSeriesData[index]?.data) : null,
                gridLineWidth: props.panelInfo.show_y_tickline === 'Y' ? 1 : 0,
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
                // top: 0,
                // tickInterval: 2,
                reversed: props.panelInfo.use_normalize === 'Y',

                tickAmount: updateYaxis().right[0] === updateYaxis().right[1] && 1,
                tickPositions: updateYaxis().right[0] === updateYaxis().right[1] && [updateYaxis().right[0]],
                min: props.panelInfo.custom_min2 === 0 ? (props.panelInfo.use_normalize === 'Y' ? 0 : updateYaxis().right[0]) : props.panelInfo.custom_min2,
                max: props.panelInfo.custom_max2 === 0 ? (props.panelInfo.use_normalize === 'Y' ? 100 : updateYaxis().right[1]) : props.panelInfo.custom_max2,
                // tickInterval: 100,
                showLastLabel: props.panelInfo.use_normalize === 'N',
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
                opposite: props.panelInfo.use_right_y2 === 'Y',
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
            enabled: props.panelInfo.show_legend === 'B',
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
    const status = e.min - e.max > props.panelInfo.raw_chart_threshold;
    emit('eOnChangeIsZoom');
    const { chart } = e.target;
    data.sTimeChartXaxis.min = e.min;
    data.sTimeChartXaxis.max = e.max;
    emit('eOnChange', data.sTimeChartXaxis, status);
    emit('eOnChangeRaw', status);
}

const updateMinMaxChart = (start: any, end: any) => {
    return chart.value.chart.xAxis[0].setExtremes(moment.utc(start).valueOf(), moment.utc(end).valueOf());
};

const getMaxValue = (array: number[][]) => {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] > result) result = current[1];
            return result;
        },
        props.panelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
    );
};
const getMinValue = (array: number[][]) => {
    return array.reduce(
        (result: number, current: any) => {
            if (current[1] < result) result = current[1];
            return result;
        },
        props.panelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
    );
};

const updateYaxis = () => {
    let yAxis = {
        left: [] as number[],
        right: [] as number[],
    };
    const newData = cloneDeep(props.chartData.datasets);
    newData?.forEach((item) => {
        if (item.yAxis === 0) {
            if (!yAxis.left[0] || yAxis.left[0] > getMinValue(item.data)) {
                yAxis.left[0] = getMinValue(item.data);
            }
            if (!yAxis.left[1] || yAxis.left[1] < getMaxValue(item.data)) {
                yAxis.left[1] = getMaxValue(item.data);
            }
        }
        if (item.yAxis === 1) {
            if (!yAxis.right[0] || yAxis.right[0] > getMinValue(item.data)) {
                yAxis.right[0] = getMinValue(item.data);
            }
            if (!yAxis.right[1] || yAxis.right[1] < getMaxValue(item.data)) {
                yAxis.right[1] = getMaxValue(item.data);
            }
        }
    });
    return yAxis;
};
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
