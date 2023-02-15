<template>
    <ChartDashboard ref="sPanels" />
</template>
<script setup lang="ts" name="ShareView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const store = useStore();

const sDialog = ref<boolean>(false);
const tabIndex = ref<number>(1);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const sPanels = ref(null);
const onClickTab = (index: number) => {
    console.log('onClickTab ~ index', index);
    tabIndex.value = index;
};
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
    () => route.params.id,
    () => {
        if (route.params.id) {
            setBoard(route.params.id as string);
        }
    },
    { immediate: true }
);
store.dispatch(ActionTypes.fetchRangeData);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
