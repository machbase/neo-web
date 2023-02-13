<template>
    <!-- Loop show chart -->
    <div v-for="(panel, index) in data.sPanels" :key="index">
        <LineChart v-if="isLine(panel.chart_type)" :panel-info="panel" :index="panel.i" />
    </div>
</template>

<script lang="ts" setup name="ChartDashboard">
import LineChart from '@/components/common/chart-wrap/charts/line/index.vue';
import { isLine } from '@/helpers/chart';
import { PanelInfo } from '@/interface/chart';
import { useStore } from '@/store';
import { computed, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';

interface DashboardPanelsProps {
    pIsViewMode?: boolean;
}
withDefaults(defineProps<DashboardPanelsProps>(), {});

const data = reactive({
    sPanels: [] as PanelInfo[],
});
const store = useStore();
const gBoard = computed(() => store.state.gBoard);

watch(
    gBoard,
    (newValue) => {
        if (!newValue) return;
        data.sPanels = newValue.panels
            ? (newValue.panels.map((v: any, i: number) => {
                  const sPanel = v[0];
                  return {
                      ...sPanel,
                      i: i,
                  };
              }) as PanelInfo[])
            : [];
    },
    { immediate: true }
);

defineExpose({});
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
