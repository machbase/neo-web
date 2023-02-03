<template><highcharts ref="chart" :constructor-type="props.isStockChart ? 'stockChart' : 'chart'" :options="cChartOptions"></highcharts></template>

<script lang="ts" setup name="LineChart">
import { setUtcTime } from '@/helpers/date';
import { HighchartsDataset, LineDataset, LinePanel } from '@/interface/chart';
import { computed, defineProps, withDefaults, reactive, watch, ref, defineExpose } from 'vue';

interface BarChartContainerProps {
    chartData: LineDataset;
    panelInfo: LinePanel;
    xAxisMinRange: string | number;
    xAxisMaxRange: string | number;
    panelWidth: number;
    panelMode: string;
    isStockChart?: boolean;
}

const props = withDefaults(defineProps<BarChartContainerProps>(), {
    panelWidth: 0,
    panelMode: '',
});

const data = reactive({
    sMasterSeriesData: [] as HighchartsDataset[],
});

const chart = ref(null);

watch(
    () => props.chartData,
    () => {
        createStockChart();
    }
);

const cChartOptions = computed(() => {
    return {
        title: '',
        chart: {
            type: 'area',
            zoomType: null,
            resetZoomButton: {
                theme: {
                    style: {
                        display: 'none',
                    },
                },
            },
            width: null,
            height: '324px',
        },
        series: data.sMasterSeriesData,
        legend: {
            //   enabled: props.panelInfo.show_legend === 'Y',
            itemStyle: {
                fontWeight: 'normal', // bold
                fontSize: '14px',
                textOverflow: 'ellipsis',
            },
        },
        xAxis: {
            crosshair: true,
            type: 'datetime',
            // ordinal: false,
            // ...this.pXaxisRange,
            //   min: (setUtcTime(props.xAxisMinRange as number) as Date).getTime(),
            //   max: (setUtcTime(props.xAxisMaxRange as number) as Date).getTime(),
            // labels: {
            //     format: '{value:%H:%M}',
            // },
        },
        credits: {
            enabled: false,
        },
        rangeSelector: {
            buttons: [],
            allButtonsEnabled: false,
            inputEnabled: false,
            selected: 1,
        },
        plotOptions: {
            series: {
                lineWidth: props.panelInfo.stroke,
                //   fillOpacity: props.panelInfo.opacity,
                showInNavigator: true,
                marker: {
                    enabled: props.panelInfo.show_point === 'Y',
                },
            },
        },
    };
});

const createStockChart = () => {
    data.sMasterSeriesData = JSON.parse(JSON.stringify(props.chartData.datasets));
};

defineExpose({
    chart,
});
</script>
