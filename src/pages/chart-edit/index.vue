<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
        <DisplayTab />
        <DataTab />
        <TimeRangeTab />
    </div>
</template>
<script setup lang="ts" name="ChartEdit">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';
import DisplayTab from '../chart-edit/components/display/index.vue';
import { BoardInfo, LinePanel, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import DataTab from '../chart-edit/components/data/index.vue';
import { withDefaults, defineProps } from 'vue';

const route = useRoute();
const sDataChart = ref<PanelInfo[]>([]);
const store = useStore();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);

watch(
    () => route.params.id,
    () => {
        if (route.params.id) {
            sDataChart.value = CPanels.value[route.params.id as any];
        } else {
            console.log('sDataChart.value', sDataChart.value);
        }
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
