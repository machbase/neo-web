<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
        <div class="tabs">
            <div class="header">
                <ul class="nav-pills">
                    <li v-for="(item, index) in tabs" :key="index" :style="{ color: tabIndex === index ? '#2ec0df !important' : undefined }" @click="onClickTab(index)">
                        {{ item }}
                    </li>
                </ul>
                <div><img :src="i_b_save_2" alt="Clear icon" @click="onSave" /><img :src="i_b_close" alt="Clear icon" /></div>
            </div>
            <div class="inner-tab">
                <GeneralTab v-if="tabIndex === 0" @e-on-change="onChangeTabData" />
                <DataTab v-if="tabIndex === 1" @e-on-change="onChangeTabData" />
                <AxesTab v-if="tabIndex === 2" @e-on-change="onChangeTabData" />
                <DisplayTab v-if="tabIndex === 3" @e-on-change="onChangeTabData" />
                <TimeRangeTab v-if="tabIndex === 4" @e-on-change="onChangeTabData" />
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
    console.log('onClickTab ~ index', index);
    tabIndex.value = index;
};

const onChangeTabData = (data: Partial<PanelInfo>) => {
    sTabData.value = { ...sTabData.value, ...data };
    console.log('🚀 ~ file: index.vue:54 ~ onChangeTabData ~ sTabData.value', sTabData.value);
};
const onSave = () => {
    const payload = {
        index: route.params.id,
        item: sTabData.value,
    };
    store.commit(MutationTypes.setChartEdit, payload);
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
    CPanels,
    () => {
        if (CPanels.value) {
            sDataChart.value = CPanels.value[route.params.id as any];
        } else {
            sDataChart.value = CPanels.value[0];
        }
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
