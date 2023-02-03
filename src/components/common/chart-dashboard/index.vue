<template>
    <!-- Loop show chart -->
    <div v-for="(panel, index) in data.sPanels" :key="index">
        <LineChart v-if="isLine(panel.chart_type)" :ref="(el) => setPanelRefs(el)" :panel-info="panel" :index="panel.i" />
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
const panelRefs = ref<string[]>([]);

const store = useStore();

const gDashboard = computed(() => store.state.gBoard);

const setPanelRefs = (ref: any) => {
    console.log('ref', ref, panelRefs.value);
    console.log('data', data.sPanels);
    panelRefs.value.push(ref);
};

const refreshData = (aIsRangeTimeChange: boolean) => {
    data.sPanels?.forEach((_, i) => {
        if (panelRefs.value[i]) {
            if ((panelRefs.value[i] as any)?.refreshBoard) {
                (panelRefs.value[i] as any).refreshBoard(aIsRangeTimeChange);
            }
        }
    });
};

watch(
    gDashboard,
    (newValue) => {
        if (!newValue) return;
        console.log(newValue.panels);
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

defineExpose({
    refreshData,
});
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
