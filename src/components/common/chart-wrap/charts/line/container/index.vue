<template><highcharts :constructor-type="'stockChart'" :options="cChartOptions"></highcharts></template>
<script setup lang="ts" name="LineChart">
import axios from 'axios';
import { computed, ref, onMounted } from 'vue';

const sData = ref();
const cChartOptions = computed(() => {
    return {
        chart: {
            backgroundColor: '#1e1f1f',
            borderColor: '#282828',
        },
        title: {
            text: 'AAPL stock price by minute',
        },

        subtitle: {
            text: 'Using ordinal X axis',
        },

        xAxis: {
            gapGridLineWidth: 0,
        },
        series: [
            {
                name: 'AAPL',
                type: 'area',
                data: sData.value,
            },
        ],
    };
});

onMounted(() => axios.get('https://cdn.jsdelivr.net/gh/highcharts/highcharts@v7.0.0/samples/data/new-intraday.json').then((data) => (sData.value = data.data)));
</script>

<style lang="scss" scoped>
@import '../index.scss';
</style>
