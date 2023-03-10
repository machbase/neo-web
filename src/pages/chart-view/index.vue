<template>
    <div class="tag-view">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
    </div>
</template>
<script setup lang="ts" name="ChartView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { RouteNames } from '@/enums/routes';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { MutationTypes } from '@/store/mutations';
import { cloneDeep } from 'lodash';
import { onMounted } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
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

// const setBoard = async (sId: string) => {
//     await store.dispatch(ActionTypes.fetchBoard, sId);
// };
// const onRefreshData = (aIsRangeTimeChange: boolean) => {
//     (sPanels.value as any)?.refreshData(aIsRangeTimeChange);
// };
// onRefreshData(true);

// watch(
//     () => cBoardList.value,
//     () => {
//         setBoard(cBoardList.value[0]?.board_id as string);
//     }
// );

onMounted(() => {
    const sData = JSON.parse(localStorage.getItem('gBoard') || '');
    store.commit(MutationTypes.setBoardByFileUpload, sData);
    sDataChart.value = sData.panels[0];
});

store.dispatch(ActionTypes.fetchTable);
store.dispatch(ActionTypes.fetchRangeData);
store.dispatch(ActionTypes.fetchTableList);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
