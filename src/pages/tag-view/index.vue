<template>
    <div class="tag-view" :class="!route.params.id ? '' : 'form-body'">
        <v-sheet v-if="route.params.id" class="" color="transparent" height="100%" width="100%">
            <v-sheet v-show="gBoard.type === 'note'" color="transparent" height="100%" width="100%">
                <Editor />
            </v-sheet>
            <v-sheet v-show="gBoard.type === 'dashboard'" class="chart-form" color="transparent" height="100%" width="100%">
                <ChartDashboard ref="sPanels" />
                <ButtonCreate :is-add-chart="true" :on-click="onOpenPopup" />
                <PopupWrap @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="PopupType.NEW_CHART" :width="'667px'" />
            </v-sheet>
            <!-- <v-sheet v-if="gBoard.type === 'new'" class="form-body" color="transparent" height="100%" width="100%">
            </v-sheet> -->
        </v-sheet>
        <!-- <PopupWrap v-if="route.params.id" @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="PopupType.NEW_CHART" :width="'667px'" /> -->

        <div v-else>
            <v-btn @click="sTest">123213</v-btn>

            <div v-for="(aTab, aIdx) in gTabList" v-show="aTab.id === gSelectedTab" :key="aIdx">
                <iframe
                    :ref="`iFrame${aIdx}`"
                    :id="`iFrame${aIdx}`"
                    frameborder="0"
                    height="100%"
                    :src="aTab.url"
                    :style="{ display: 'block', width: '100%', height: '100vh' }"
                    width="100%"
                ></iframe>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts" name="TagView">
import Editor from '@/pages/editor/Editor.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import AddTab from '@/components/popup-list/popup/AddTab.vue';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { cloneDeep } from 'lodash';
import { onMounted, nextTick } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import i_b_close from '@/assets/image/i_b_close.png';
import { MutationTypes } from '../../store/mutations';

const iFrame0 = ref<any>(null);
const route = useRoute();
const store = useStore();
const sDialog = ref<boolean>(false);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cDashBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);

const gBoard = computed(() => store.state.gBoard);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);

const gSelectedTabInfo = computed(() => {
    return gTabList.value.find((aItem: any) => aItem.id === gSelectedTab.value);
});

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};
const test = () => {
    alert('test');
};
const sTest = () => {
    // const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    console.log((iFrame0 as any).contentWindow);
    console.log((document.getElementById('iFrame0') as any).contentWindow);
    console.log((document.getElementById('iFrame0') as any).contentWindow.test());
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

onMounted(async () => {
    nextTick(() => {
        console.log(route.params.type);
        console.log(route.params);
        if (route.params.id) {
            console.log(route.params.type);
            store.commit(MutationTypes.setBoard, { type: route.params.type, board_id: '', range_end: '', refresh: '', board_name: '', range_bgn: '', panels: [] });
        }
        console.log(store.state.gBoard);
    });
    await store.dispatch(ActionTypes.fetchTableList);
    if (store.state.gTableList[0]) {
        await store.dispatch(ActionTypes.fetchTagList, store.state.gTableList[0]);
        await store.dispatch(ActionTypes.fetchRangeData, { table: store.state.gTableList[0], tagName: store.state.gTagList[0] });
    }
});
</script>

<style lang="scss" scoped>
@import './index.scss';
.base-form {
    padding: 0 !important;
}
.position-ab {
    position: absolute;
}
.form-body {
    padding: 44px $px-20 0 !important;
    overflow: auto;
}
.form-body::-webkit-scrollbar {
    width: 10px;
    background: #141415;
}

.form-body::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.form-body::-webkit-scrollbar-thumb {
    background: #383838;
}
.chart-form {
    display: flex;
    flex-direction: column;
}
.add-tab {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}
</style>
