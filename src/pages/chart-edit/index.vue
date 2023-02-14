<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
        <div class="tabs">
            <div class="header">
                <ul class="nav-pills">
                    <li v-for="(item, index) in tabs" :key="index" :style="{ color: tabIndex === index ? '#2ec0df' : '#e7e8ea' }" @click="onClickTab(index)">{{ item }}</li>
                </ul>
                <div><img :src="i_b_save_2" alt="Clear icon" /><img :src="i_b_close" alt="Clear icon" /></div>
            </div>
            <div>
                <GeneralTab v-if="tabIndex === 0" />
                <DataTab v-if="tabIndex === 1" />
                <AxesTab v-if="tabIndex === 2" />
                <DisplayTab v-if="tabIndex === 3" />
                <TimeRangeTab v-if="tabIndex === 4" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts" name="TagView">
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';
import DisplayTab from '../chart-edit/components/display/index.vue';
import { BoardInfo, LinePanel, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref, watch, defineProps, withDefaults } from 'vue';
import { useRoute } from 'vue-router';
import DataTab from '../chart-edit/components/data/index.vue';
import AxesTab from '../chart-edit/components/axes/index.vue';
import GeneralTab from '../chart-edit/components/general/index.vue';

const tabs = ['General', 'Data', 'Axes', 'Display', 'Time range'];
const route = useRoute();
const sDataChart = ref<PanelInfo[]>([]);
const store = useStore();

const sDialog = ref<boolean>(false);
const sData = ref<BoardInfo>();
const tabIndex = ref<number>(1);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cBoard = computed((): BoardInfo => store.state.gBoard);
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
            sDataChart.value = CPanels.value[route.params.id as any];
        } else {
            console.log('sDataChart.value', sDataChart.value);
        }
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
