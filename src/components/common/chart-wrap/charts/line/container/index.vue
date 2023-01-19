<template><highcharts :constructor-type="'stockChart'" :options="cChartOptions"></highcharts></template>
<script setup lang="ts" name="LineChart">
import { useStore } from '@/store';
import moment from 'moment';
import axios from 'axios';
import Btn from '@/components/common/pagination/index.vue';
import { computed, ref, onMounted, withDefaults, defineProps } from 'vue';
export interface StockChartLineProps {
    pDateChart: string;
}
const props = withDefaults(defineProps<StockChartLineProps>(), {
    pDateChart: '2022-12-30 16:05:19 ~ 2022-12-30 16:07:32 ( interval : 1 sec )',
});
const sTag = ref([
    {
        name: 'tag1',
        value: 1,
    },
    {
        name: 'tag2',
        value: 2,
    },
]);
const sData = ref();
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const cChartOptions = computed(() => {
    return {
        title: {
            text: props.pDateChart,
            style: {
                color: cIsDarkMode.value ? '#afb5bc' : '#4f5050',
                fontSize: '12px',
            },
        },
        series: [
            {
                data: sData.value,
            },
        ],
        chart: {
            type: 'area',
            backgroundColor: cIsDarkMode.value ? '#1e1f1f' : '#f6f7f8',
            borderColor: cIsDarkMode.value ? '#282828' : '#dbe2ea',
            borderWidth: 1,
            //
            zoomType: 'x',
            resetZoomButton: {
                theme: {
                    style: {
                        display: 'none',
                    },
                },
            },
        },
        tooltip: {
            useHTML: true,
            headerFormat: '',
            pointFormat: `<p>{point.key}</p>` + `<div class="point-row">${sTag.value.map((a) => `<p class="point">${a.name}</p><p class="point">${a.value}</p>`)}</div>`,
            style: {
                color: '#fff',
            },
            backgroundColor: '#000',
            valueDecimals: 0,
            borderColor: '#000',
            borderWidth: 1,
        },
        // tooltip: {
        //     formatter: function () {
        //         const sValue = this as any;
        //         return `${moment(sValue.x).format('YYYY-MM-DD hh:mm:ss')}
        //                 <br/>
        //                 ${sTag.value.map((a) => `<br><div class="test">${a.name}-${a.value}</div></br>`)}
        //                 `;
        //     },
        // },
        xAxis: {
            gapGridLineWidth: 0,
        },
    };
});

onMounted(() => axios.get('https://cdn.jsdelivr.net/gh/highcharts/highcharts@v7.0.0/samples/data/new-intraday.json').then((data) => (sData.value = data.data)));
</script>

<style lang="scss" scoped>
@import '../index.scss';
:deep(.point-row) {
    /* display: flex; */
}
:deep(.point) {
    color: red;
}
</style>
