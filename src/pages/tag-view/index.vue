<template>
    <div class="tag-view">
        <ChartDashboard ref="sPanels" />
        <ButtonCreate :is-add-chart="true" :on-click="onOpenPopup" />
        <PopupWrap :width="'667px'" :p-type="PopupType.NEW_CHART" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>
<script setup lang="ts" name="TagView">
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { cloneDeep } from 'lodash';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const store = useStore();
const sDialog = ref<boolean>(false);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cDashBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};

// const setBoard = async (sId: string) => {
//     // await store.dispatch(ActionTypes.fetchTable);
//     await store.dispatch(ActionTypes.fetchBoard, sId);
// };

// watch(
//     () => cDashBoard.value,
//     () => {
//         setBoard(cBoardList.value[0]?.board_id as string);
//     }
// );

// watch(
//     () => route.query.id,
//     () => {
//         if (route.query.id) {
//             setBoard(route.query.id as string);
//         }
//     }
// );

store.dispatch(ActionTypes.fetchTableList);
store.dispatch(ActionTypes.fetchRangeData);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
