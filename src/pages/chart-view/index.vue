<template>
    <div class="tag-view">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
    </div>
</template>
<script setup lang="ts" name="ChartView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const store = useStore();
const sDialog = ref<boolean>(false);
const sData = ref<BoardInfo>();
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const sDataChart = ref<PanelInfo[]>([]);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};

const setBoard = async (sId: string) => {
    await store.dispatch(ActionTypes.fetchTable);
    await store.dispatch(ActionTypes.fetchRangeData);
    await store.dispatch(ActionTypes.fetchBoard, sId);
};
const onRefreshData = (aIsRangeTimeChange: boolean) => {
    (sPanels.value as any)?.refreshData(aIsRangeTimeChange);
};
onRefreshData(true);

watch(
    () => cBoardList.value,
    () => {
        setBoard(cBoardList.value[0]?.board_id as string);
    }
);
watch(
    () => CPanels.value,
    () => {
        if (CPanels.value.length === 0) return;
        if (CPanels.value) {
            sDataChart.value = CPanels.value[route.params.id as any];
        } else {
            sDataChart.value = CPanels.value[0];
        }
    },
    { immediate: true, deep: true }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
