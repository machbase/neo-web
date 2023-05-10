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

onMounted(async () => {
    const cookieValue = await document.cookie.replace(/(?:(?:^|.*;\s*)data\s*\=\s*([^;]*).*$)|^.*$/, '$1');
    await store.dispatch(ActionTypes.fetchTableList);
    if (store.state.gTableList[0]) {
        await store.dispatch(ActionTypes.fetchTagList, store.state.gTableList[0]);
        await store.dispatch(ActionTypes.fetchRangeData, { table: store.state.gTableList[0], tagName: store.state.gTagList[0] });
    }
    if (!cookieValue) {
        router.push({
            name: RouteNames.TAG_VIEW,
        });
        return;
    }
    await store.commit(MutationTypes.setBoardByFileUpload, JSON.parse(cookieValue));
    sDataChart.value = await JSON.parse(cookieValue).panels[route.params.id as string];
});
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
