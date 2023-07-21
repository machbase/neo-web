<template>
    <div class="chart-wrap__header">
        <div class="title">
            <p></p>
            <span>{{ props.pPanelTitle || props.panelInfo.chart_title }}</span>
        </div>
        <div>{{ changeNaNoToDate(xAxisMaxRange - props.pDataRange * 1000000000) }} ~ {{ changeNaNoToDate(xAxisMaxRange) }}</div>
        <div class="chart-wrap__header-icons">
            <v-icon @click="onReloadChart" class="icon" size="14px"> mdi-refresh </v-icon>
            <v-icon v-if="props.pType !== 'edit'" @click="onDeleteBoard" class="icon" size="14px"> mdi-delete </v-icon>
            <PopupWrap :id="panelInfo.i" @e-close-popup="onClosePopup" :p-show="sDialog" :p-tab-idx="props.pTabIdx" :p-type="'EDIT CHART'" :p-width="'100vw'" />
        </div>
    </div>
</template>

<script setup lang="ts" name="ChartHeader">
import PopupWrap from '@/components/popup-list/index.vue';
import { RouteNames } from '@/enums/routes';
import { BoardInfo, LinePanel } from '@/interface/chart';
import router from '@/routes';
import { useStore } from '@/store';
import { MutationTypes } from '@/store/mutations';
import { changeNaNoToDate } from '@/utils/utils';
import { ref, computed, defineEmits, defineProps, withDefaults } from 'vue';
import { useRoute } from 'vue-router';
export type headerType = RouteNames.TAG_VIEW | RouteNames.VIEW | RouteNames.CHART_VIEW | RouteNames.CHART_EDIT | RouteNames.NEW;

interface ChartHeaderProps {
    panelInfo: LinePanel;
    pIsRaw: boolean;
    pTabIdx: number;
    xAxisMinRange: number;
    xAxisMaxRange: number;
    pIntervalData: { IntervalValue: number; IntervalType: string };
    pPanelTitle: string;
    pType?: string;
    pPanelIndex: number;
    pDataRange: number;
}
const props = withDefaults(defineProps<ChartHeaderProps>(), {});
const emit = defineEmits(['eOnReload']);

const store = useStore();
const route = useRoute();
const sHeaderType = ref<headerType>(route.name as headerType);
const CBoard = computed((): BoardInfo => store.state.gBoard);
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sDialog = ref<boolean>(false);
function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};
const onDeleteBoard = () => {
    if (!confirm(`Are you sure you want to delete this chart(${props.panelInfo.chart_title})?`)) {
        return;
    }
    store.commit(MutationTypes.setDeleteChart, props.panelInfo.i);
};
const openNewChartPage = () => {
    const routeData = router.resolve({ name: RouteNames.CHART_VIEW, params: { id: props.panelInfo.i } });
    document.cookie = `data=${JSON.stringify(CBoard.value)}; expires=${new Date(Date.now() + 10000).toUTCString()}`;
    window.open(routeData.href, '_blank');
};
const onReloadChart = () => {
    emit('eOnReload');
};

const onSaveEdit = async () => {
    await store.commit(MutationTypes.setChartBoardEdit);
    router.push({
        name: RouteNames.TAG_VIEW,
        params: { type: route.params.type, id: route.params.id },
    });
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
