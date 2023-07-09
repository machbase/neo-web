<template>
    <v-sheet class="tag-view" height="100%">
        <v-sheet id="tagView" class="tag-view-form" color="transparent" height="100%" width="100%">
            <v-sheet
                v-for="(aTab, aIdx) in gTabList"
                v-show="aTab.board_id === gSelectedTab"
                :key="aTab.board_id + '10'"
                class="sheet"
                color="transparent"
                height="100%"
                width="100%"
            >
                <v-sheet v-if="aTab.type === 'SQL Editor'" color="transparent" height="100%" width="100%">
                    <Editor ref="sPanels" />
                </v-sheet>
                <v-sheet v-else-if="aTab.type === 'Tql'" color="transparent" height="100%" width="100%">
                    <TQL ref="sPanels" :p-panel-data="aTab" />
                </v-sheet>
                <v-sheet v-else-if="aTab.type === 'wrk'" color="transparent" height="100%" width="100%">
                    <WorkSheet ref="sPanels" :p-panel-data="aTab" />
                </v-sheet>

                <AddTab v-else-if="aTab.type === 'new'" ref="sPanels" />

                <Terminal v-else-if="terminalStatus && aTab.type === 'Terminal'" ref="sPanels" @eChangeStatus="changeTerminalStatus" :p-id="aTab.board_id" />

                <v-sheet v-if="aTab.type === 'dashboard'" class="time-range icon" color="transparent" height="4%">
                    {{
                        !isEmpty(cTimeRange.start || cTimeRange.end)
                            ? `${cTimeRange.start ? cTimeRange.start : ''} ~ ${cTimeRange.end ? cTimeRange.end : ''} ${
                                  cTimeRange.refresh ? `refresh every ${cTimeRange.refresh}` : ''
                              }`
                            : TIME_RANGE_NOT_SET
                    }}
                    <v-icon @click="onReload(aIdx)" class="icon" icon="mdi-refresh" size="16px"></v-icon>
                    <v-icon @click="onClickPopupItem(PopupType.TIME_RANGE)" class="icon" icon="mdi-clock-time-three-outline" size="16px"></v-icon>
                    <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                    <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'open')" class="icon" icon="mdi-folder-open" size="16px"></v-icon>
                    <!-- <label class="item">
                        <v-icon class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                        <input @change="onUploadChart" accept="application/JSON" class="file-import" type="file" />
                    </label> -->
                </v-sheet>
                <v-sheet v-if="aTab.type === 'dashboard'" class="chart-form" color="transparent" height="96%" width="100%">
                    <ChartDashboard ref="sPanels" :p-panel-info="aTab" :p-tab-idx="aIdx" />
                    <ButtonCreate @click="onClickPopupItem(PopupType.NEW_CHART)" :is-add-chart="true" />
                </v-sheet>
            </v-sheet>
        </v-sheet>
        <PopupWrap @e-close-popup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-upload-type="'taz'" :width="cWidthPopup" />
    </v-sheet>
</template>
<script setup lang="ts" name="TagView">
import Editor from '@/pages/editor/Editor.vue';
import TQL from '@/pages/Tql/Editor.vue';
import WorkSheet from '@/pages/workSheet/WorkSheet.vue';

import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import ChartDetailDashboard from '@/components/common/chart-detail-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import i_b_timerange from '@/assets/image/i_b_timerange.png';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import AddTab from '@/components/popup-list/popup/AddTab.vue';
import Terminal from '@/pages/terminal/index.vue';
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
const cTimeRange = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return { start: gTabList.value[sIdx].range_bgn, end: gTabList.value[sIdx].range_end, refresh: gTabList.value[sIdx].refresh };
});

const terminalStatus = ref(true);
let sFileOption = ref<string>('');

const sLoading = ref(true);

const sDialog = ref<boolean>(false);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cDashBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const cBoardOld = computed(() => store.state.gBoardOld);
const sUploadData = ref(null);

const sDownLoadData = ref<BoardInfo[]>([]);
const gBoard = computed(() => store.state.gBoard);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gDownload = computed(() => store.state.gDownload);
const gImportData = computed(() => store.state.gImportData);
const gSelectedTabInfo = computed(() => {
    return gTabList.value.find((aItem: any) => aItem.id === gSelectedTab.value);
});
const onClosePopup = () => {
    sDialog.value = false;
};

const changeTerminalStatus = (aStatus: boolean) => {
    terminalStatus.value = false;
    setTimeout(() => {
        terminalStatus.value = true;
    });
};
const onUpload = () => {
    gTabList.value.forEach((aItem: any, aIdx: number) => {
        (document.getElementById(`iFrame${aIdx}`) as any).contentWindow.postMessage(
            JSON.stringify({ status: 'upload', data: gImportData.value[aIdx] }),
            window.location.href + 'parents'
        );
    });
};

const onDownload = () => {
    gTabList.value.forEach((aItem: any, aIdx: number) => {
        (document.getElementById(`iFrame${aIdx}`) as any).contentWindow.postMessage(JSON.stringify({ status: 'download' }), window.location.href + 'parents');
    });
};

const onClickPopupItem = (aPopupName: PopupType, aFileOption?: string) => {
    if (aFileOption === 'save') {
        sFileOption.value = 'save';
    } else {
        sFileOption.value = 'open';
    }
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

const receiveMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') {
        sLoading.value = false;
        return;
    }
    // Do we trust the sender of this message?  (might be
    // different from what we originally opened, for example).
    if (JSON.parse(event.data).status === 'download') {
        window.parent.postMessage(JSON.stringify(cDashBoard.value), '*');
    } else if (JSON.parse(event.data).status === 'upload' && JSON.parse(event.data).data) {
        store.commit(MutationTypes.setBoardByFileUpload, JSON.parse(event.data).data);
        sLoading.value = false;
    } else {
        store.commit(MutationTypes.setDownLoadData, JSON.parse(event.data));
    }
};
const download = () => {
    onClickPopupItem(PopupType.SAVE_DASHBOARD);
};
const onReload = (aIdx: number) => {
    sPanels.value[aIdx].onReload();
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
        case PopupType.FILE_BROWSER:
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

const onUploadChart = (aEvent: any) => {
    sLoading.value = true;
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event: any) => {
        const fileContent: any = await JSON.parse(event.target.result);
        fileContent.board_id = new Date().getTime();

        store.commit(MutationTypes.changeTab, fileContent as BoardInfo);
        store.commit(MutationTypes.setSelectedTab, fileContent.board_id);
        sLoading.value = false;
    };
    reader.readAsText(file);
};
const validateTest = async (joiSchema: any, testObject: any) => {
    return true;
};

onMounted(async () => {
    nextTick(() => {
        if (route.params.id) {
            gBoard.value.type = route.params.type;
            store.commit(MutationTypes.setBoard, gBoard);
        }
    });

    setTimeout(() => {
        const sSavedData = sessionStorage.getItem('board');
        const sSavedSelectedTab = sessionStorage.getItem('selectedTab');

        if (sSavedData && sSavedData.length !== 0) {
            JSON.parse(sSavedData).map((aItem: any) => {
                aItem.result = new Map();
                store.commit(MutationTypes.pushTab, aItem);
            });

            nextTick(() => {
                store.commit(MutationTypes.setSelectedTab, sSavedSelectedTab);
                gTabList.value.shift();
            });
            sessionStorage.removeItem('board');
            sessionStorage.removeItem('selectedTab');
        }
    });
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
.file-import {
    display: none;
}
.chart-form {
    padding: 0 20px;

    display: flex;
    flex-direction: column;
    overflow: auto;
}
.detail-chart-form {
    padding: 20px 20px 0px;
    display: flex;
    flex-direction: column;
    overflow: auto;
    .button-wrapper {
        margin: 0 !important;
    }
}
.detail-chart-form::-webkit-scrollbar {
    width: 10px;
    background: #e7e8ea;
}
.detail-chart-form::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
    background: #e7e8ea;
}
.detail-chart-form::-webkit-scrollbar-thumb {
    background: #f1f2f4;
}
.sheet {
    padding-top: 44px;
}
</style>
