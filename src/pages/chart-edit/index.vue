<template>
    <div class="chart-edit-page">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" :p-panel-info="gBoard" :p-type="'edit'" :style="{ height: '53%' }" />
        <div v-if="sShowTab" class="tabs" :style="{ height: '44%', overflow: 'auto' }">
            <div class="header">
                <ul class="nav-pills">
                    <li v-for="(item, index) in tabs" :key="index" @click="onClickTab(index)" :style="{ color: tabIndex === index ? '#2ec0df !important' : undefined }">
                        {{ item }}
                    </li>
                </ul>
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
    <div class="popup__btn-group">
        <v-btn @click="onSave" class="button-effect-color-apply" variant="outlined"> Apply </v-btn>
        <v-btn @click="onSaveEdit" class="button-effect-color" :disabled="JSON.stringify(store.state.gBoardPanelEdit.item) === '{}'" variant="outlined"> Ok </v-btn>
        <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
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
import { computed, ref, watch, reactive, watchEffect, onMounted, defineProps, defineEmits } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AxesTab from '../chart-edit/components/axes/index.vue';
import DataTab from '../chart-edit/components/data/index.vue';
import DisplayTab from '../chart-edit/components/display/index.vue';
import GeneralTab from '../chart-edit/components/general/index.vue';
import TimeRangeTab from '../chart-edit/components/time-range/index.vue';
import { cloneDeep } from 'lodash';
import { RouteNames } from '@/enums/routes';
interface PropsModalEdit {
    id: number;
    pTabIdx: number;
}
const props = defineProps<PropsModalEdit>();
const emit = defineEmits(['eClosePopup']);
const tabs = ['General', 'Data', 'Axes', 'Display', 'Time range'];
const route = useRoute();
const router = useRouter();
const sDataChart = ref<PanelInfo[]>([]);
const store = useStore();
const tabIndex = ref<number>(1);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const CPanels = computed((): PanelInfo[][] => gBoard.value.panels);
const sPanels = ref(null);
const sTabData = ref<Partial<PanelInfo>>();
const onClickTab = (index: number) => {
    tabIndex.value = index;
};
const defaultChartData = ref<PanelInfo[]>([]);
const gSelectedTab = computed(() => store.state.gSelectedTab);

const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const sShowTab = ref<boolean>(true);

const onChangeTabData = (data: Partial<PanelInfo>) => {
    sTabData.value = { ...sTabData.value, ...data };
};
const onClosePopup = () => {
    emit('eClosePopup');
};
const onSave = () => {
    const payload = {
        index: props.id,
        item: sTabData.value,
    };
    sDataChart.value[0] = sTabData.value as PanelInfo;

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
        sDataChart.value = clone[Number(props.id)];
        defaultChartData.value = clone[Number(props.id)][0];
        sTabData.value = clone[Number(props.id)][0];
    },
    { immediate: true }
);

const onSaveEdit = async () => {
    await store.commit(MutationTypes.setChartBoardEdit);
    onClosePopup();
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
