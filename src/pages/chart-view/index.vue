<template>
    <div class="tag-view">
        <ChartDashboard ref="sPanels" />
    </div>
</template>
<script setup lang="ts" name="ChartView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { BoardInfo } from '@/interface/chart';
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
    () => route.query.id,
    () => {
        if (route.query.id) {
            setBoard(route.query.id as string);
        }
    }
);
watch(
    () => cBoardList.value,
    () => {
        if (!route.query.id && cBoardList.value.length > 0) {
            setBoard(cBoardList.value[0]?.board_id as string);
        }
        if (route.query.id) {
            setBoard(route.query.id as string);
        }
    }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
