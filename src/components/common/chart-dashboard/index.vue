<template>
    <!-- Loop show chart -->
    <div v-if="!chartDataSingle">
        <div v-for="(panel, index) in data.sPanels" :key="index">
            <AreaChart :panel-info="panel" :index="panel.i" />
        </div>
    </div>
    <div v-else>
        <div v-for="(panel, index) in data.sPanel" :key="index">
            <AreaChart :panel-info="panel" :index="panel.i" />
        </div>
    </div>
</template>

<script lang="ts" setup name="ChartDashboard">
import AreaChart from '@/components/common/chart-wrap/charts/area/index.vue';
import { isChartType } from '@/helpers/chart';
import { PanelInfo } from '@/interface/chart';
import { useStore } from '@/store';
import { computed, onMounted, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';
import { watchEffect } from 'vue';

interface DashboardPanelsProps {
    pIsViewMode?: boolean;
    chartDataSingle?: PanelInfo[];
}
const props = withDefaults(defineProps<DashboardPanelsProps>(), {});

const data = reactive({
    sPanels: [] as PanelInfo[],
    sPanel: {} as PanelInfo[],
});
const store = useStore();
const gBoard = computed(() => store.state.gBoard);

watchEffect(
    // () => gBoard.value.panels,
    (newValue) => {
        if (!newValue) return;
        data.sPanels = gBoard.value.panels
            ? (gBoard.value.panels.map((v: any, i: number) => {
                  const sPanel = v[0];
                  return {
                      ...sPanel,
                      i: i,
                  };
              }) as PanelInfo[])
            : [];
    }
    // { immediate: true }
);

watch(
    () => props.chartDataSingle,
    () => {
        if (props.chartDataSingle?.length === 0) return;
        data.sPanel = props.chartDataSingle
            ? (props.chartDataSingle.map((v: any, i: number) => {
                  return {
                      ...v,
                      i: i,
                  };
              }) as PanelInfo[])
            : [];
    },
    { immediate: true, deep: true }
);

defineExpose({});
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
