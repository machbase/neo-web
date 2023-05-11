<template>
    <highcharts ref="chart" constructor-type="stockChart" :options="cChartOptions"></highcharts>
</template>

<script lang="ts" setup="setup" name="AreaChart">
import { HighchartsDataset, LineDataset, LinePanel } from '@/interface/chart';
import { useStore } from '@/store';
import { formatColors, toTimeUtcChart, rawtoTimeUtcChart } from '@/utils/utils';
import { cloneDeep } from 'lodash';
import { computed, defineEmits, defineExpose, defineProps, onMounted, reactive, ref, withDefaults, nextTick } from 'vue';
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
    pPanelWidth: number;
}

const props = withDefaults(defineProps<BarChartContainerProps>(), {});
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const emit = defineEmits(['eOnChange', 'eOnChangeIsZoom', 'eOnChangeRaw', 'eOnClick', 'eOnChangeNavigator', 'eResetSquare']);
const sIsNotBtnZoom = ref(false);
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
            width: props.pPanelWidth,
            type: 'area',
            zoomType: 'x',
            backgroundColor: cIsDarkMode.value ? '#1e1f1f' : '#f6f7f8',
            lineWidth: 1,
            events: {},
        },
        series:
            props.panelInfo.drilldown_zoom === 'Y'
                ? props.chartData.datasets
                : props.viewData.datasets
                ? props.viewData.datasets.map((i) => {
                      return { data: i.data, marker: i.marker };
                  })
                : [],
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
                        click: function (event: any) {
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
        scrollbar: {
            liveRedraw: false,
            enabled: false,
        },
        rangeSelector: {
            buttons: [],
            allButtonsEnabled: false,
            selected: 1,
            inputEnabled: false,
        },
        navigator: {
            enabled: props.pIsZoom,
            adaptToUpdatedData: false,
            handles: {
                opacity: 0,
                height: 26,
                width: 7,
            },
            height: 26,
            maskFill:
                toTimeUtcChart(props.xAxisMinRange as string) - toTimeUtcChart(props.xAxisMaxRange as string) > props.panelInfo.raw_chart_threshold
                    ? 'rgba(119, 119, 119, .3)'
                    : 'rgba(119, 119, 119, .3)',
            series: props.viewData.datasets
                ? props.viewData.datasets.map((i) => {
                      return { data: i.data, marker: i.marker, animation: false };
                  })
                : [],
            outlineWidth: 1,
            outlineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            xAxis: {
                left: 28,
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
                events: {
                    setExtremes: setExtremesNavigator,
                },
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            },
            yAxis: {
                gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
                gridLineWidth: 1,
            },
            margin: props.pIsZoom ? 65 : 0,
        },
        xAxis: {
            zoomEnabled: props.panelInfo.use_zoom === 'Y',
            type: 'datetime',
            ordinal: false,
            gridLineWidth: props.panelInfo.show_x_tickline === 'Y' ? 1 : 0,
            gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            minTickInterval: 1,
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
                setExtremes: setExtremes,
            },
            crosshair: {
                snap: false,
                width: 0.5,
                color: 'red',
            },
            tickColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
        },
        yAxis: [
            {
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
                showLastLabel: props.panelInfo.use_normalize === 'N',
                minTickInterval: 1,
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
                tickAmount: updateYaxis().right[0] === updateYaxis().right[1] && 1,
                tickPositions: updateYaxis().right[0] === updateYaxis().right[1] && [updateYaxis().right[0]],
                min: props.panelInfo.custom_min2 === 0 ? (props.panelInfo.use_normalize === 'Y' ? 0 : updateYaxis().right[0]) : props.panelInfo.custom_min2,
                max: props.panelInfo.custom_max2 === 0 ? (props.panelInfo.use_normalize === 'Y' ? 100 : updateYaxis().right[1]) : props.panelInfo.custom_max2,
                minTickInterval: 1,
                showLastLabel: props.panelInfo.use_normalize === 'N',
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
                '<div style="display: flex; justifyContent: space-between"><p style="color: {se' +
                `ries.color}">{series.name} </p><p style="color: {series.color}">{point.y}</p><` +
                '/div>',
            footerFormat: '</div>',
        },
        legend: {
            enabled: props.panelInfo.show_legend === 'B',
            align: 'left',
            itemDistance: 15,
            squareSymbol: false,
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
        },
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
        credits: {
            enabled: false,
        },
    };
});

// call when change select box in navigator
function setExtremes(e: any) {
    const status = e.min - e.max > props.panelInfo.raw_chart_threshold;
    const rangeChart = e.max - e.min;

    if ((props.xMaxTimeRangeViewPort - props.xMinTimeRangeViewPort) / 100 > rangeChart) {
        emit('eResetSquare', {
            min: e.min,
            max: e.max,
        });
        return;
    }
    emit('eOnChangeIsZoom');
    let sizeStatus;
    if (props.xAxisMaxRange - props.xAxisMinRange < e.max - e.min) sizeStatus = 'expand';
    else if (props.xAxisMaxRange - props.xAxisMinRange > e.max - e.min) {
        sizeStatus = 'decrease';
    } else sizeStatus = 'move';

    data.sTimeChartXaxis.min = e.min;
    data.sTimeChartXaxis.max = e.max;

    if (status) {
        if (sizeStatus === 'expand') emit('eOnChangeRaw', true);
    }
    if (sIsNotBtnZoom.value) {
        sIsNotBtnZoom.value = false;
    } else {
        emit('eOnChange', data.sTimeChartXaxis, sizeStatus);
    }
}
// call when change navigator
function setExtremesNavigator(e: any) {
    emit('eOnChangeNavigator', {
        min: e.min,
        max: e.max,
    });
}

// Update location for select box in navigator
const updateMinMaxChart = (start: any, end: any, aItem?: boolean) => {
    if (sIsNotBtnZoom.value) {
        sIsNotBtnZoom.value = false;
    } else {
        sIsNotBtnZoom.value = aItem;
        return chart.value.chart.xAxis[0].setExtremes(toTimeUtcChart(start), toTimeUtcChart(end));
    }
};
// Update time range for navigator
const updateMinMaxNavigator = (start: any, end: any) => {
    return chart.value.chart.navigator.xAxis.setExtremes(start, toTimeUtcChart(end));
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
    nextTick(() => {
        data.sChartWidth = chart.value.chart.plotWidth;
    });
});

defineExpose({ chart, updateMinMaxChart, updateMinMaxNavigator });
</script>

<style lang="scss">
:deep(.highcharts-legend.highcharts-no-tooltip) {
    display: v-bind("props.panelInfo.show_legend === 'B'? '': 'none'");
}
</style>
