<template><highcharts ref="chart" constructor-type="stockChart" :options="cChartOptions"></highcharts></template>

<script lang="ts" setup name="AreaChart">
import { HighchartsDataset, LineDataset, LinePanel } from '@/interface/chart';
import { useStore } from '@/store';
import { toTimeUtcChart } from '@/utils/utils';
import { computed, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';

interface BarChartContainerProps {
    chartData: LineDataset;
    panelInfo: LinePanel;
    xAxisMinRange: string | number;
    xAxisMaxRange: string | number;
    isStockChart?: boolean;
}

const props = withDefaults(defineProps<BarChartContainerProps>(), {});
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const data = reactive({
    sMasterSeriesData: [] as HighchartsDataset[],
    sTimeXaxis: {
        min: '' as string | number,
        max: '' as string | number,
    },
    sTimeChartXaxis: {
        min: '' as string | number,
        max: '' as string | number,
    },
    sChartWidth: 0 as number,
});

const chart = ref();
watch(
    () => props.chartData,
    () => {
        createStockChart();
        data.sTimeXaxis.min = props.xAxisMinRange;
        data.sTimeXaxis.max = props.xAxisMaxRange;
        data.sTimeChartXaxis.min = props.xAxisMinRange;
        data.sTimeChartXaxis.max = props.xAxisMaxRange;
        data.sChartWidth = chart.value.chart.plotWidth;
    }
);
watch(data.sTimeChartXaxis, () => {
    console.log('data', data.sTimeChartXaxis);
});

// cIsDarkMode.value ? '#e7e8ea' : '#2a313b',
const cChartOptions = computed(() => {
    return {
        colors: ['#5ca3f2', '#d06a5f', '#e2bb5c', '#86b66b', '#7070e0', '#6bcbc1', '#a673e8', '#e26daf', '#bac85d', '#87cedd'],
        chart: {
            height: 400,
            width: null,
            type: 'area',
            zoomType: 'x',
            backgroundColor: cIsDarkMode.value ? '#1e1f1f' : '#f6f7f8',
            lineWidth: 1,
            events: {
                selectedpoints: function (event) {
                    console.log('event click chart', event);
                },
                // xAxis: when click chart
                // 0: axis: a2, value: 1672415796649.6125
                // 1: axis: a2, value: 1672415905801.4258
                render() {},
            },
            // margin: [0, 40, 100, 40],
            // spacingTop: 50,
        },
        // data Chart
        series: data.sMasterSeriesData,
        // data
        data: {},
        // option chart
        plotOptions: {
            series: {
                lineWidth: 1,
                fillOpacity: 0.1,
                cursor: 'pointer',
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
        // view point navigator
        navigator: {
            enabled: true,
            adaptToUpdatedData: false,
            handles: {
                // width: 0.5,
                opacity: 0,
                height: 26,
            },
            height: 26,
            maskFill: 'rgba(119, 119, 119, .3)',
            series: {
                showInNavigator: true,
            },
            outlineWidth: 1,
            // outlineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            xAxis: {
                // width: data.sChartWidth - 80,
                type: 'datetime',
                min: toTimeUtcChart(data.sTimeXaxis.min as string),
                max: toTimeUtcChart(data.sTimeXaxis.max as string),
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
            margin: 65,
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

            min: toTimeUtcChart(data.sTimeChartXaxis.min as string),
            max: toTimeUtcChart(data.sTimeChartXaxis.max as string),
            events: {
                setExtremes: afterSetExtremes,
            },
            crosshair: {
                snap: false,
                width: 0.5,
                color: 'red',
            },
            startOnTick: true,
            tickColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
        },
        // Value chart
        yAxis: {
            showLastLabel: true,
            // showFirstLabel: false,
            max: 10, // data

            // tickAmount: 6,
            gridLineWidth: 1,
            gridLineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            lineColor: cIsDarkMode.value ? '#323333' : '#f0f1f3',
            opposite: false,
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
        },
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
            x: 20,
        },
        // No data
        lang: {
            noData: 'No Data',
        },
        noData: {
            style: {
                fontWeight: 'bold',
                fontSize: '24px',
                color: '#9ca2ab',
            },
        },
        // tool
        rangeSelector: {
            enabled: false,
        },
        // show link web
        credits: {
            enabled: false,
        },
    };
});

function afterSetExtremes(e) {
    const { chart } = e.target;
    // console.log('chart :', chart);
    // console.log('e :', e);
    data.sTimeChartXaxis.min = e.min;
    data.sTimeChartXaxis.max = e.max;

    console.log(e);
    // chart.showLoading('Loading data from server...');
    // fetch(`${dataURL}?start=${Math.round(e.min)}&end=${Math.round(e.max)}`)
    //     .then((res) => res.ok && res.json())
    //     .then((data1) => {
    //         data.sMasterSeriesData = data1;
    //         chart.hideLoading();
    //     })
    //     .catch((error) => console.error(error.message));
}

const createStockChart = () => {
    data.sMasterSeriesData = JSON.parse(JSON.stringify(props.chartData.datasets));
};
defineExpose({
    chart,
});
</script>

<style lang="scss" scoped>
/* @import 'index.scss'; */
</style>
