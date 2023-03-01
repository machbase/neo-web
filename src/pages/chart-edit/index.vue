<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
        <div v-if="sShowTab" class="tabs">
            <div class="header">
                <ul class="nav-pills">
                    <li v-for="(item, index) in tabs" :key="index" :style="{ color: tabIndex === index ? '#2ec0df !important' : undefined }" @click="onClickTab(index)">
                        {{ item }}
                    </li>
                </ul>
                <div><img :src="i_b_save_2" alt="Clear icon" @click="onSave" /><img :src="i_b_close" alt="Clear icon" @click="onCancel" /></div>
            </div>
            <div class="inner-tab">
                <GeneralTab v-if="tabIndex === 0" :p-chart-data="sDataChart[0]" @e-on-change="onChangeTabData" />
                <DataTab v-if="tabIndex === 1" :p-chart-data="sDataChart[0]" @e-on-change="onChangeTabData" />
                <AxesTab v-if="tabIndex === 2" :p-chart-data="sDataChart[0]" @e-on-change="onChangeTabData" />
                <DisplayTab v-if="tabIndex === 3" :p-chart-data="sDataChart[0]" @e-on-change="onChangeTabData" />
                <TimeRangeTab v-if="tabIndex === 4" :p-chart-data="sDataChart[0]" @e-on-change="onChangeTabData" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts" name="ChartEdit">
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { MutationTypes } from '@/store/mutations';
import { computed, ref, watch, reactive, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import AxesTab from '../chart-edit/components/axes/index.vue';
import DataTab from '../chart-edit/components/data/index.vue';
import DisplayTab from '../chart-edit/components/display/index.vue';
import GeneralTab from '../chart-edit/components/general/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';

const tabs = ['General', 'Data', 'Axes', 'Display', 'Time range'];
const route = useRoute();
const sDataChart = ref<PanelInfo[]>([]);
const store = useStore();
const tabIndex = ref<number>(1);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const sPanels = ref(null);
const sTabData = ref<Partial<PanelInfo>>();
const onClickTab = (index: number) => {
    tabIndex.value = index;
};
const sShowTab = ref<boolean>(true);

const onChangeTabData = (data: Partial<PanelInfo>) => {
    sTabData.value = { ...sTabData.value, ...data };
};
const onSave = () => {
    const payload = {
        index: route.params.id,
        item: sTabData.value,
    };
    sDataChart.value[0] = { ...sDataChart.value[0], ...sTabData.value };
    store.commit(MutationTypes.setChartEdit, payload);
};

const onCancel = () => {
    if (sTabData.value) {
        if (!confirm('Your edits will be lost. Are you sure you want to close?')) {
            return;
        }
    }
    sShowTab.value = false;
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
    { immediate: true }
);
store.dispatch(ActionTypes.fetchTableList);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
