<template>
    <!-- Loop show chart -->
    <!-- v-if="" -->
    <div v-if="!chartDataSingle">
        <div v-for="(panel, index) in cData" :key="index">
            <AreaChart ref="areaChart" :index="panel.i" :panel-info="panel" />
        </div>
    </div>
    <div v-else>
        <div v-for="(panel, index) in data.sPanel" :key="index">
            <AreaChart ref="areaChart" :index="panel.i" :panel-info="panel" />
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
import { useRouter, useRoute } from 'vue-router';

interface DashboardPanelsProps {
    pIsViewMode?: boolean;
    chartDataSingle?: PanelInfo[];
}
const props = withDefaults(defineProps<DashboardPanelsProps>(), {});

const data = reactive({
    sPanels: [] as PanelInfo[],
    sPanel: {} as PanelInfo[],
});
const areaChart = ref(null);
const store = useStore();
const router = useRouter() as any;
const route = useRoute() as any;
const gBoard = computed(() => store.state.gBoard);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const cRouter = computed(() => {
    return router.params && router.params.id ? router.params.id : '';
});

const cData = computed(() => {
    return gBoard.value.panels
        ? (gBoard.value.panels.map((v: any, i: number) => {
              const sPanel = v[0];
              return {
                  ...sPanel,
                  i: i,
              };
          }) as PanelInfo[])
        : [];
});
watchEffect(
    // () => gBoard.value.panels,
    (newValue: any) => {
        if (!newValue) return;
    }
    // { immediate: true }
);

const onReload = () => {
    areaChart.value &&
        areaChart.value.forEach((aItem: any) => {
            aItem.onReload();
        });
};
watch(
    () => gBoard.value.range_bgn || gBoard.value.range_end,
    () => {
        onReload();
    }
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

// watch(
//     () => store.state.gBoard,
//     () => {
//         console.log(gBoard);

//     }
// );

onMounted(async () => {
    // if (props.chartDataSingle) {
    // } else {
    // }
    // intializePanelData();
    // onReload();
});

defineExpose({ onReload });
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
