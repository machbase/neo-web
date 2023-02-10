<template>
    <div class="chart-edit-page">
        <ChartDashboard />
        <DataTab/>
        <!-- <TimeRangeTab/> -->
    </div>
</template>
<script setup lang="ts" name="ChartEdit">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';
import DataTab from '../chart-edit/components/data/index.vue';
import { ref } from 'vue';
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
