<template>
    <div class="tag-view" :style="route.params.id && gBoard.type !== 'note' ? { padding: '0px 20px', maxHeight: '100%' } : { maxHeight: '100%' }">
        <v-sheet
            v-if="route.params.id"
            id="tagView"
            class=""
            color="transparent"
            height="100%"
            :style="route.params.id && gBoard.type !== 'note' ? { padding: '0px 10px' } : ''"
            width="100%"
        >
            <v-sheet v-show="gBoard.type === 'note'" color="transparent" height="100%" width="100%">
                <Editor />
            </v-sheet>
            <v-sheet v-show="gBoard.type !== 'note'" class="time-range icon" color="transparent">
                {{
                    !isEmpty(cTimeRange)
                        ? `${cTimeRange.start ? cTimeRange.start : ''} ~ ${cTimeRange.end ? cTimeRange.end : ''} ${cTimeRange.refresh ? `refresh every ${cTimeRange.refresh}` : ''}`
                        : TIME_RANGE_NOT_SET
                }}
                <img @click="onReload" class="" :src="i_b_refresh" />
                <img @click="onClickPopupItem(PopupType.TIME_RANGE)" class="" :src="i_b_timerange" />
            </v-sheet>
            <v-sheet v-show="gBoard.type === 'dashboard'" class="chart-form" color="transparent" height="100%" width="100%">
                <ChartDashboard v-if="route.params.id" ref="sPanels" />
                <ButtonCreate @click="onClickPopupItem(PopupType.NEW_CHART)" :is-add-chart="true" />
                <PopupWrap @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="sPopupType" :width="cWidthPopup" />
            </v-sheet>
            <!-- <PopupWrap @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="sPopupType" :width="'667px'" /> -->

            <!-- <v-sheet v-if="gBoard.type === 'new'" class="form-body" color="transparent" height="100%" width="100%">
            </v-sheet> -->
        </v-sheet>
        <!-- <PopupWrap v-if="route.params.id" @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="PopupType.NEW_CHART" :width="'667px'" /> -->

        <div v-else>
            <!-- <v-btn @click="sTest">123213</v-btn> -->

            <div v-for="(aTab, aIdx) in gTabList" v-show="aTab.id === gSelectedTab" :key="aIdx">
                <iframe
                    :ref="`iFrame${aIdx}`"
                    :id="`iFrame${aIdx}`"
                    @load="onUpload"
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
import i_b_timerange from '@/assets/image/i_b_timerange.png';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import AddTab from '@/components/popup-list/popup/AddTab.vue';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { cloneDeep, isEmpty } from 'lodash';
import { onMounted, nextTick, inject } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import i_b_close from '@/assets/image/i_b_close.png';
import { MutationTypes } from '../../store/mutations';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from '@/components/header/constant';

const route = useRoute();
const store = useStore();
const sPopupType = ref<PopupType>(PopupType.NEW_CHART);
const cTimeRange = computed(() => store.state.gTimeRange);

const sLoading = ref(true);

const sDialog = ref<boolean>(false);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cDashBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const cBoardOld = computed(() => store.state.gBoardOld);

const sDownLoadData = ref<BoardInfo[]>([]);
const gBoard = computed(() => store.state.gBoard);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gDownload = computed(() => store.state.gDownload);
const gImportData = computed(() => store.state.gImportData);
const gSelectedTabInfo = computed(() => {
    return gTabList.value.find((aItem: any) => aItem.id === gSelectedTab.value);
});

// function onOpenPopup() {
//
// }
const onClosePopup = () => {
    sDialog.value = false;
};
const onUpload = () => {
    console.log('123');
    gTabList.value.forEach((aItem: any, aIdx: number) => {
        (document.getElementById(`iFrame${aIdx}`) as any).contentWindow.postMessage(
            JSON.stringify({ status: 'upload', data: gImportData.value[aIdx] }),
            window.location.href + 'parents'
        );
    });
};

const onDownload = () => {
    // const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    gTabList.value.forEach((aItem: any, aIdx: number) => {
        (document.getElementById(`iFrame${aIdx}`) as any).contentWindow.postMessage(JSON.stringify({ status: 'download' }), window.location.href + 'parents');
    });
};

const onClickPopupItem = (aPopupName: PopupType) => {
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

// const setBoard = async (sId: string) => {
//     // await store.dispatch(ActionTypes.fetchTable);
//     await store.dispatch(ActionTypes.fetchBoard, sId);
// };

const receiveMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') {
        sLoading.value = false;
        return;
    }
    // Do we trust the sender of this message?  (might be
    // different from what we originally opened, for example).
    // if (event.origin !== '123') return;
    // 자식에서 download 요청인지 확인하여 Data 전달
    if (JSON.parse(event.data).status === 'download') {
        window.parent.postMessage(JSON.stringify(cDashBoard.value), '*');
    }
    // upload 요청인지 처리
    else if (JSON.parse(event.data).status === 'upload' && JSON.parse(event.data).data) {
        // 업로드 요청일땐, 자식은 받은 data 를 저장
        store.commit(MutationTypes.setBoardByFileUpload, JSON.parse(event.data).data);
        sLoading.value = false;
    }
    // 다운로드를 요청한 부모에게 data 전달한 것을 전역으로 return
    else {
        store.commit(MutationTypes.setDownLoadData, JSON.parse(event.data));
    }

    // event.source is popup
    // event.data is "hi there yourself!  the secret response is: rheeeeet!"
};
const onReload = () => {
    sPanels.value.onReload();
    // let id = route.query.id || cBoardList.value[0]?.board_id;
    // const newBord = cloneDeep(cBoardOld.value);
    // store.commit(MutationTypes.setBoardByFileUpload, newBord);
};

const cWidthPopup = computed((): string => {
    switch (sPopupType.value) {
        case PopupType.PREFERENCES:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.TIME_RANGE:
            return WIDTH_DEFAULT.TIME_RANGE;
        case PopupType.TIME_DURATION:
            return WIDTH_DEFAULT.TIME_DURATION;
        case PopupType.MANAGE_DASHBOARD:
            return WIDTH_DEFAULT.MANAGE_DASHBOARD;
        case PopupType.SAVE_DASHBOARD:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.ADD_TAB:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.NEW_TAGS:
            return '667px';
        case PopupType.NEW_CHART:
            return '667px';
        default:
            return WIDTH_DEFAULT.DEFAULT;
    }
});

watch(
    () => store.state.gDownload,
    () => {
        if (gDownload.value) {
            onDownload();
        }
    }
);

onMounted(async () => {
    // receiveMessage();
    window.addEventListener('message', receiveMessage);

    nextTick(() => {
        if (route.params.id) {
            gBoard.value.type = route.params.type;
            store.commit(MutationTypes.setBoard, gBoard);
        }
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
