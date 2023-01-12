<template>
    <ChartWrap>
        <LineChart />
    </ChartWrap>
</template>

<script setup lang="ts" name="Line">
import ChartWrap from '@/components/common/chart-wrap/index.vue';
import LineChart from './container/index.vue';
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
