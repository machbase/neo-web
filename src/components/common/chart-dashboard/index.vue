<template>
    <!-- Loop show chart -->
    <div v-if="!chartDataSingle">
        <div v-for="(panel, index) in data.sPanels" :key="index">
            <AreaChart v-if="isChartType(panel.show_point, panel.stroke) === 'area'" :panel-info="panel" :index="panel.i" />
            <LineChart v-if="isChartType(panel.show_point, panel.stroke) === 'line'" :panel-info="panel" :index="panel.i" />
            <PointChart v-if="isChartType(panel.show_point, panel.stroke) === 'point'" :panel-info="panel" :index="panel.i" />
        </div>
    </div>
    <div v-else>
        <div v-for="(panel, index) in data.sPanel" :key="index">
            <AreaChart v-if="isChartType(panel.show_point, panel.stroke) === 'area'" :panel-info="panel" :index="panel.i" />
            <LineChart v-if="isChartType(panel.show_point, panel.stroke) === 'line'" :panel-info="panel" :index="panel.i" />
            <PointChart v-if="isChartType(panel.show_point, panel.stroke) === 'point'" :panel-info="panel" :index="panel.i" />
        </div>
    </div>
</template>

<script lang="ts" setup name="ChartDashboard">
import LineChart from '@/components/common/chart-wrap/charts/line/index.vue';
import PointChart from '@/components/common/chart-wrap/charts/point/index.vue';
import AreaChart from '@/components/common/chart-wrap/charts/area/index.vue';
import { isChartType } from '@/helpers/chart';
import { PanelInfo } from '@/interface/chart';
import { useStore } from '@/store';
import { computed, onMounted, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';

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

watch(
    () => gBoard.value,
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
    { immediate: true, deep: true }
);
watch(
    () => props.chartDataSingle,
    async (newValue) => {
        // if (!newValue) return;
        if (props.chartDataSingle) {
            data.sPanel = props.chartDataSingle
                ? (props.chartDataSingle.map((v: any, i: number) => {
                      return {
                          ...v,
                          i: i,
                      };
                  }) as PanelInfo[])
                : [];
        }
    },
    { immediate: true }
);

defineExpose({});
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
