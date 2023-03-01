<template>
    <div class="new-dashboard">
        <ChartDashboard ref="sPanels" />
        <ButtonCreate :is-add-chart="true" :on-click="onOpenPopup" />
        <PopupWrap :width="'667px'" :p-type="PopupType.NEW_CHART" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>
<script setup lang="ts" name="New">
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const store = useStore();
const sDialog = ref<boolean>(false);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};
// watch(
//     () => cBoardList.value,
//     () => {
//         if (!route.query.id && cBoardList.value.length > 0) {
//             setBoard(cBoardList.value[0]?.board_id as string);
//         }
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
