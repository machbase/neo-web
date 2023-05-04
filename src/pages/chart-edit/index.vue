<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
        <div v-if="sShowTab" class="tabs">
            <div class="header">
                <ul class="nav-pills">
                    <li v-for="(item, index) in tabs" :key="index" @click="onClickTab(index)" :style="{ color: tabIndex === index ? '#2ec0df !important' : undefined }">
                        {{ item }}
                    </li>
                </ul>
                <div><img @click="onSave" alt="Clear icon" :src="i_b_save_2" /><img @click="onCancel" alt="Clear icon" :src="i_b_close" /></div>
            </div>
            <div class="inner-tab">
                <GeneralTab v-if="tabIndex === 0" @e-on-change="onChangeTabData" :p-chart-data="sDataChart[0]" />
                <DataTab v-if="tabIndex === 1" @e-on-change="onChangeTabData" :p-chart-data="sDataChart[0]" />
                <AxesTab v-if="tabIndex === 2" @e-on-change="onChangeTabData" :p-chart-data="sDataChart[0]" />
                <DisplayTab v-if="tabIndex === 3" @e-on-change="onChangeTabData" :p-chart-data="sDataChart[0]" />
                <TimeRangeTab v-if="tabIndex === 4" @e-on-change="onChangeTabData" :p-chart-data="sDataChart[0]" />
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
import { computed, ref, watch, reactive, watchEffect, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AxesTab from '../chart-edit/components/axes/index.vue';
import DataTab from '../chart-edit/components/data/index.vue';
import DisplayTab from '../chart-edit/components/display/index.vue';
import GeneralTab from '../chart-edit/components/general/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';
import { cloneDeep } from 'lodash';
import { RouteNames } from '@/enums/routes';

const tabs = ['General', 'Data', 'Axes', 'Display', 'Time range'];
const route = useRoute();
const router = useRouter();
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
        index: route.params.panel_id,
        item: sTabData.value,
    };
    sDataChart.value[0] = sTabData.value as PanelInfo;
    // console.log('sTabData.value', sTabData.value);
    // console.log('dataa', sDataChart);
    // sDataChart.value[0] = sTabData.value
    // sDataChart.value[0] = { ...sDataChart.value[0], ...sTabData.value };
    // sDataChart.value[0].tag_set.forEach((item: any, index: number) => {
    //     if (item.id) {
    //         delete (sDataChart.value[0].tag_set[index] as any).id;
    //     }
    // });
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

// const setBoard = async (sId: string) => {
//     await store.dispatch(ActionTypes.fetchTable);
//     await store.dispatch(ActionTypes.fetchRangeData);
//     // await store.dispatch(ActionTypes.fetchBoard, sId);
// };

// watch(
//     () => cBoardList.value,
//     () => {
//         setBoard(cBoardList.value[0]?.board_id as string);
//     }
// );
watch(
    () => CPanels.value,
    () => {
        if (CPanels.value.length === 0) {
            router.push({
                name: RouteNames.TAG_VIEW,
            });
            return;
        }
        let clone = cloneDeep(CPanels.value);
        sDataChart.value = clone[Number(route.params.panel_id)];
        sTabData.value = clone[Number(route.params.panel_id)][0];
    },
    { immediate: true }
);

const onSaveEdit = async () => {
    await store.commit(MutationTypes.setChartBoardEdit);
    router.push({
        name: RouteNames.TAG_VIEW + 'frame',
        params: { type: route.params.type, id: route.params.id },
    });
};
onMounted(async () => {
    await store.dispatch(ActionTypes.fetchTableList);
    if (store.state.gTableList[0]) {
        await store.dispatch(ActionTypes.fetchTagList, store.state.gTableList[0]);
        await store.dispatch(ActionTypes.fetchRangeData, { table: store.state.gTableList[0], tagName: store.state.gTagList[0] });
    }
});
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
