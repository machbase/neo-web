<template>
    <div v-if="!chartDataSingle">
        <div
            v-for="(panel, index) in cData"
            :key="index"
            :style="
                index !== 0
                    ? {
                          padding: '10px 0',
                      }
                    : {
                          padding: '0 0 10px',
                      }
            "
        >
            <AreaChart ref="areaChart" :index="panel.i" :p-tab-idx="props.pTabIdx" :panel-info="panel" />
        </div>
    </div>
    <div v-else>
        <div v-for="(panel, index) in data.sPanel" :key="index">
            <AreaChart ref="areaChart" :index="panel.i" :p-tab-idx="props.pTabIdx" :p-type="props.pType" :panel-info="panel" />
        </div>
    </div>
</template>

<script lang="ts" setup name="ChartDashboard">
import AreaChart from '@/components/common/chart-wrap/charts/area/index.vue';
import { isChartType } from '@/helpers/chart';
import { PanelInfo, BoardInfo } from '@/interface/chart';
import { useStore } from '@/store';
import { computed, onMounted, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';
import { watchEffect } from 'vue';
import { useRouter, useRoute } from 'vue-router';

interface DashboardPanelsProps {
    pIsViewMode?: boolean;
    chartDataSingle?: PanelInfo[];
    pTabIdx?: number;
    pType?: string;
    pPanelInfo: BoardInfo;
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
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});

const gTabList = computed(() => {
    return store.state.gTabList;
});
const cTimeRange = computed(() => {
    return { start: props.pPanelInfo.range_bgn, end: props.pPanelInfo.range_end, refresh: props.pPanelInfo.refresh };
});

const gSelectedTab = computed(() => store.state.gSelectedTab);

const cData = computed(() => {
    if (props.chartDataSingle) {
        return props.chartDataSingle.panels
            ? (props.chartDataSingle.panels.map((v: any, i: number) => {
                  const sPanel = v[0];
                  return {
                      ...sPanel,
                      i: i,
                  };
              }) as PanelInfo[])
            : [];
    } else {
        return props.pPanelInfo.panels
            ? (props.pPanelInfo.panels.map((v: any, i: number) => {
                  const sPanel = v[0];
                  return {
                      ...sPanel,
                      i: i,
                  };
              }) as PanelInfo[])
            : [];
    }
});
watchEffect((newValue: any) => {
    if (!newValue) return;
});

const onReload = () => {
    areaChart.value &&
        areaChart.value.forEach((aItem: any) => {
            aItem.onReload();
        });
};
watch(
    () => cTimeRange.value,
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

onMounted(async () => {});

defineExpose({ onReload });
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
