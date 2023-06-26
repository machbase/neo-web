<template>
    <DragCol
        v-if="!sVerticalType"
        @isDragging="dragLine"
        height="100%"
        :slider-bg-color="cIsDarkMode ? 'rgb(50, 50, 50)' : 'rgb(220, 220, 220)'"
        :slider-bg-hover-color="cIsDarkMode ? 'rgb(70, 70, 70)' : 'rgb(150, 150, 150)'"
        :slider-color="cIsDarkMode ? 'rgb(50, 50, 50)' : 'rgb(220, 220, 220)'"
        :slider-hover-color="cIsDarkMode ? 'rgb(70, 70, 70)' : 'rgb(150, 150, 150)'"
        slider-width="4"
        width="100%"
    >
        <template #left>
            <div :class="cIsDarkMode ? 'dark-sql' : 'white-sql'">
                <div class="editor-header">
                    <div class="header-toggle">
                        <!-- MACHBASE -->
                        <v-btn @click="getButtonData" density="comfortable" icon="mdi-play" size="36px" variant="plain"></v-btn>
                    </div>
                    <div class="header-btn-list">
                        <ComboboxAuto
                            @e-on-change="(aValue) => changeTimeFormat(aValue)"
                            class="select-width"
                            :p-data="sList"
                            :p-show-default-option="false"
                            p-use-name
                            :p-value="sSelectedFormat"
                        />
                        <ComboboxAuto
                            @e-on-change="(aValue) => changeTimezone(aValue)"
                            class="select-width"
                            :p-data="IANA_TIMEZONES"
                            :p-disabled="
                                sSelectedFormat === 'TIMESTAMP(ns)' ||
                                sSelectedFormat === 'TIMESTAMP(us)' ||
                                sSelectedFormat === 'TIMESTAMP(ms)' ||
                                sSelectedFormat === 'TIMESTAMP(s)'
                            "
                            :p-show-default-option="false"
                            :p-value="sSelectedTimezone"
                        />
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'open')" class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="sText"
                    @keydown="saveSQL"
                    @keydown.enter.stop="setSQL"
                    :autofocus="true"
                    border_radius="0"
                    :class="cFontSizeClassName"
                    :header="false"
                    height="calc(100% - 34px)"
                    :languages="sLang"
                    :line_nums="false"
                    min_height="calc(100% - 34px)"
                    theme=""
                    width="100%"
                    :wrap="false"
                />
            </div>
        </template>

        <template #right>
            <v-sheet class="tab-list" color="#202020" fixed-tabs height="40px">
                <v-sheet class="tab-form">
                    <button
                        @click="changeTab('table')"
                        class="delete-left-border"
                        :style="
                            sTab === 'table'
                                ? cIsDarkMode
                                    ? { backgroundColor: '#121212' }
                                    : { backgroundColor: '#ffffff', color: '#121212', border: '1px solid #ffffff !important' }
                                : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon>mdi-table</v-icon>
                            RESULT
                        </div>
                    </button>
                    <button
                        @click="changeTab('chart')"
                        class="delete-left-border"
                        :style="
                            sTab === 'chart' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon>mdi-chart-line</v-icon>
                            CHART
                        </div>
                    </button>
                    <button
                        @click="changeTab('log')"
                        :style="sTab === 'log' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                    >
                        <div>
                            <v-icon>mdi-information-outline</v-icon>
                            LOG
                        </div>
                    </button>
                </v-sheet>

                <v-sheet class="tool-bar" color="transparent">
                    <v-btn v-if="sTab === 'log'" @click="deleteLog()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-delete-outline</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(false)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-horizontal</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(true)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-vertical</v-icon>
                    </v-btn>
                </v-sheet>
            </v-sheet>
            <Table v-if="sTab === 'table'" @UpdateItems="UpdateItems" :headers="sHeader" :items="sData" :p-timezone="sPropsTypeOption" :p-type="sType" />
            <ShowChart v-if="sTab === 'chart'" ref="rChartTab" :p-headers="sHeader" :p-sql="sSql" :p-type="sType" />

            <v-sheet v-if="sTab === 'log'" ref="rLog" class="log-form" :class="cLogFormFontSizeClassName" color="transparent" height="calc(100% - 40px)">
                <div v-for="(aLog, aIdx) in sLogField" :key="aIdx" :style="{ color: aLog.color }">
                    <div class="log-query">{{ aLog.query }}</div>
                    <div class="log-status">{{ aLog.elapse }}</div>
                    <div class="log-padding"></div>
                </div>
            </v-sheet>
        </template>
    </DragCol>
    <DragRow
        v-if="sVerticalType"
        @isDragging="dragLine"
        height="100%"
        :slider-bg-color="cIsDarkMode ? 'rgb(50, 50, 50)' : 'rgb(220, 220, 220)'"
        :slider-bg-hover-color="cIsDarkMode ? 'rgb(70, 70, 70)' : 'rgb(150, 150, 150)'"
        :slider-color="cIsDarkMode ? 'rgb(50, 50, 50)' : 'rgb(220, 220, 220)'"
        :slider-hover-color="cIsDarkMode ? 'rgb(70, 70, 70)' : 'rgb(150, 150, 150)'"
        slider-width="4"
        width="100%"
    >
        <template #top>
            <div :class="cIsDarkMode ? 'dark-sql' : 'white-sql'">
                <div class="editor-header">
                    <div class="header-toggle">
                        <!-- MACHBASE -->
                        <v-btn @click="getButtonData" density="comfortable" icon="mdi-play" size="36px" variant="plain"></v-btn>
                    </div>
                    <div class="header-btn-list">
                        <ComboboxAuto
                            @e-on-change="(aValue) => changeTimeFormat(aValue)"
                            class="select-width"
                            :p-data="sList"
                            :p-show-default-option="false"
                            p-use-name
                            :p-value="sSelectedFormat"
                        />
                        <ComboboxAuto
                            @e-on-change="(aValue) => changeTimezone(aValue)"
                            class="select-width"
                            :p-data="IANA_TIMEZONES"
                            :p-disabled="
                                sSelectedFormat === 'TIMESTAMP(ns)' ||
                                sSelectedFormat === 'TIMESTAMP(us)' ||
                                sSelectedFormat === 'TIMESTAMP(ms)' ||
                                sSelectedFormat === 'TIMESTAMP(s)'
                            "
                            :p-show-default-option="false"
                            :p-value="sSelectedTimezone"
                        />
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'upload')" class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="sText"
                    @keydown="saveSQL"
                    @keydown.enter.stop="setSQL"
                    :autofocus="true"
                    border_radius="0"
                    :class="cFontSizeClassName"
                    :header="false"
                    height="calc(100% - 34px)"
                    :languages="sLang"
                    :line_nums="false"
                    min_height="calc(100% - 34px)"
                    theme=""
                    width="100%"
                />
            </div>
        </template>

        <template #bottom>
            <v-sheet class="tab-list" color="#202020" fixed-tabs height="40px">
                <v-sheet class="tab-form">
                    <button
                        @click="changeTab('table')"
                        class="delete-left-border"
                        :style="
                            sTab === 'table' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon>mdi-table</v-icon>
                            RESULT
                        </div>
                    </button>
                    <button
                        @click="changeTab('chart')"
                        class="delete-left-border"
                        :style="
                            sTab === 'chart' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon>mdi-chart-line</v-icon>
                            CHART
                        </div>
                    </button>
                    <button
                        @click="changeTab('log')"
                        :style="sTab === 'log' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                    >
                        <div>
                            <v-icon>mdi-information-outline</v-icon>
                            LOG
                        </div>
                    </button>
                </v-sheet>

                <v-sheet class="tool-bar" color="transparent">
                    <v-btn v-if="sTab === 'log'" @click="deleteLog()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-delete-outline</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(false)" class="log-delete-icon editor-option" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-horizontal</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(true)" class="log-delete-icon editor-option" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-vertical</v-icon>
                    </v-btn>
                </v-sheet>
            </v-sheet>

            <Table v-if="sTab === 'table'" @UpdateItems="UpdateItems" :headers="sHeader" :items="sData" :p-timezone="sPropsTypeOption" :p-type="sType" />
            <ShowChart v-if="sTab === 'chart'" ref="rChartTab" :p-headers="sHeader" :p-sql="sSql" :p-type="sType" />

            <v-sheet v-if="sTab === 'log'" ref="rLog" class="log-form" :class="cLogFormFontSizeClassName" color="transparent" height="calc(100% - 40px)">
                <div v-for="(aLog, aIdx) in sLogField" :key="aIdx" :style="{ color: aLog.color }">
                    <div class="log-query">{{ aLog.query }}</div>
                    <div class="log-status">{{ aLog.elapse }}</div>
                    <div class="log-padding"></div>
                </div>
            </v-sheet>
        </template>
    </DragRow>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-upload-type="'sql'" :p-width="cWidthPopup" />
</template>

<script setup lang="ts" name="Editor">
import CodeEditor from 'simple-code-editor';
import PopupWrap from '@/components/popup-list/index.vue';
import Table from './Table.vue';
import ShowChart from './showChart.vue';
import { ref, watch, defineEmits, defineProps, computed, onMounted, nextTick } from 'vue';
import { store } from '../../store';
import { fetchData } from '../../api/repository/machiot';
import { copyText } from 'vue3-clipboard';
import { DragCol, DragRow, ResizeCol, ResizeRow, Resize } from 'vue-resizer';
import { PopupType } from '@/enums/app';
import { MutationTypes } from '../../store/mutations';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxAuto from '@/components/common/combobox/combobox-auto/index.vue';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from '@/components/header/constant';
import { IANA_TIMEZONES, IanaTimezone } from '@/assets/ts/timezones.ts';
import { postFileList } from '../../api/repository/api';
import { getWindowOs } from '../../utils/utils';
interface PropsNoteData {
    pPanelData: boolean;
}

const props = defineProps<PropsNoteData>();
const sLang = [['SQL', 'MACHBASE']];
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});

let sFileOption = ref<string>('');
let sPropsTypeOption = ref<string>('');
let sText = ref<any>('');
let rLog = ref<any>('');
let sData = ref<any>([]);
let sHeader = ref<any>([]);
let sType = ref<any>([]);
let currentPage = ref<number>(1);
let sSql = ref<string>('');
let sTab = ref<string>('table');
let sVerticalType = ref<boolean>(false);

const sList = computed(() =>
    sTimeFormatList.value.map((aItem: any) => {
        return { id: aItem.name };
    })
);

const rChartTab = ref();

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
        case PopupType.FILE_BROWSER:
            return '667px';
        default:
            return WIDTH_DEFAULT.DEFAULT;
    }
});

const sTimeFormatList = ref<any>([
    { name: 'TIMESTAMP(ns)', id: 'ns' },
    { name: 'TIMESTAMP(us)', id: 'us' },
    { name: 'TIMESTAMP(ms)', id: 'ms' },
    { name: 'TIMESTAMP(s)', id: 's' },
    { name: 'YYYY-MM-DD', id: '2006-01-02' },
    { name: 'YYYY-DD-MM', id: '2006-02-01' },
    { name: 'DD-MM-YYYY', id: '02-01-2006' },
    { name: 'MM-DD-YYYY', id: '01-02-2006' },
    { name: 'YY-DD-MM', id: '06-02-01' },
    { name: 'YY-MM-DD', id: '06-01-02' },
    { name: 'MM-DD-YY', id: '01-02-06' },
    { name: 'DD-MM-YY', id: '02-01-06' },
    { name: 'YYYY-MM-DD HH:MI:SS', id: '2006-01-02 15:04:05' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSS', id: '2006-01-02 15:04:05.000' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSS', id: '2006-01-02 15:04:05.000000' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', id: '2006-01-02 15:04:05.000000000' },
    { name: 'YYYY-MM-DD HH', id: '2006-01-02 15' },
    { name: 'YYYY-MM-DD HH:MI', id: '2006-01-02 15:04' },
    { name: 'HH:MI:SS', id: '03:04:05' },
]);

const sSelectedFormat = ref<any>('YYYY-MM-DD HH:MI:SS');
const sSelectedTimezone = ref<any>('LOCAL');
const sDialog = ref<boolean>(false);
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);

const onClickPopupItem = (aPopupName: PopupType, aFileOption?: string) => {
    if (aFileOption === 'save') {
        sFileOption.value = 'save';
    } else {
        sFileOption.value = 'open';
    }
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

const onClosePopup = () => {
    sDialog.value = false;
};

function getLineIndex(position: number) {
    let textUntilPosition = gBoard.value.code.substr(0, position);
    let lines = textUntilPosition.split('\n');

    return lines.length - 1;
}

const saveSQL = (aEvent: any) => {
    if (aEvent.code === 'Slash') {
        if (getWindowOs() && aEvent.ctrlKey) {
            const textarea = sText.value.$el.children[0].children[0].children[0];

            aEvent.preventDefault();

            let selectionStart = aEvent.target.selectionStart;
            let selectionEnd = aEvent.target.selectionEnd;

            let textUntilPosition = gBoard.value.code.substr(0, aEvent.target.selectionEnd);
            let sDragLines = textUntilPosition.split('\n');
            if (sDragLines[sDragLines.length - 1] === '' && selectionStart !== selectionEnd) {
                selectionEnd = selectionEnd - 1;
            }

            let lines = gBoard.value.code.split('\n');

            let isAllPrefixed = true;

            let sCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (i >= getLineIndex(selectionStart) && i <= getLineIndex(selectionEnd)) {
                    if (!lines[i].startsWith('--')) {
                        isAllPrefixed = false;
                        break;
                    }
                }
            }
            for (let i = 0; i < lines.length; i++) {
                if (i >= getLineIndex(selectionStart) && i <= getLineIndex(selectionEnd)) {
                    if (isAllPrefixed) {
                        sCount++;
                        lines[i] = lines[i].substring(2);
                    } else {
                        lines[i] = '--' + lines[i];
                        sCount++;
                    }
                }
            }

            let updatedText = lines.join('\n');
            gBoard.value.code = updatedText;

            if (sCount === 1) {
                nextTick(() => {
                    textarea.focus();
                    textarea.selectionStart = selectionStart + (isAllPrefixed === true ? -2 : 2);
                    textarea.selectionEnd = selectionEnd + (isAllPrefixed === true ? -2 : 2);
                });
            } else {
                nextTick(() => {
                    textarea.focus();
                    textarea.selectionStart = selectionStart;
                    textarea.selectionEnd = selectionEnd + sCount * (isAllPrefixed === true ? -2 : 2);
                });
            }
        } else if (!getWindowOs() && aEvent.metaKey) {
            const textarea = sText.value.$el.children[0].children[0].children[0];
            aEvent.preventDefault();

            let selectionStart = aEvent.target.selectionStart;
            let selectionEnd = aEvent.target.selectionEnd;

            let textUntilPosition = gBoard.value.code.substr(0, aEvent.target.selectionEnd);
            let sDragLines = textUntilPosition.split('\n');
            if (sDragLines[sDragLines.length - 1] === '' && selectionStart !== selectionEnd) {
                selectionEnd = selectionEnd - 1;
            }

            let lines = gBoard.value.code.split('\n');

            let isAllPrefixed = true;

            let sCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (i >= getLineIndex(selectionStart) && i <= getLineIndex(selectionEnd)) {
                    if (!lines[i].startsWith('--')) {
                        isAllPrefixed = false;
                        break;
                    }
                }
            }
            for (let i = 0; i < lines.length; i++) {
                if (i >= getLineIndex(selectionStart) && i <= getLineIndex(selectionEnd)) {
                    if (isAllPrefixed) {
                        sCount++;
                        lines[i] = lines[i].substring(2);
                    } else {
                        lines[i] = '--' + lines[i];
                        sCount++;
                    }
                }
            }

            let updatedText = lines.join('\n');
            gBoard.value.code = updatedText;

            if (selectionStart === selectionEnd) {
                nextTick(() => {
                    setTimeout(() => {
                        textarea.focus();
                        textarea.selectionStart = selectionStart + (isAllPrefixed === true ? -2 : 2);
                        textarea.selectionEnd = selectionStart + (isAllPrefixed === true ? -2 : 2);
                    });
                });
            } else {
                nextTick(() => {
                    setTimeout(() => {
                        textarea.focus();
                        textarea.selectionStart = selectionStart;
                        textarea.selectionEnd = selectionEnd + sCount * (isAllPrefixed === true ? -2 : 2);
                    });
                });
            }
        }
    }

    if (aEvent.code === 'KeyS') {
        if (getWindowOs() && aEvent.ctrlKey) {
            aEvent.preventDefault();
            if (gBoard.value.path !== '') {
                postFileList(gBoard.value.code, gBoard.value.path, gBoard.value.board_name);
                gBoard.value.savedCode = gBoard.value.code;
            } else {
                onClickPopupItem(PopupType.FILE_BROWSER, 'save');
            }
        } else if (!getWindowOs() && aEvent.metaKey) {
            aEvent.preventDefault();
            if (gBoard.value.path !== '') {
                postFileList(gBoard.value.code, gBoard.value.path, gBoard.value.board_name);
                gBoard.value.savedCode = gBoard.value.code;
            } else {
                onClickPopupItem(PopupType.FILE_BROWSER, 'save');
            }
        }
    }
};

const dragLine = (aStatus: boolean) => {
    if (sTab.value === 'chart' && aStatus === false) {
        rChartTab.value.getChartEl();
    }
};
const cFontSizeClassName = computed(() => {
    const sStorageData = localStorage.getItem('gPreference');
    if (sStorageData) {
        const sData = JSON.parse(sStorageData).font;
        if (sData === '12') {
            return 'editor-font-size-xx-small';
        } else if (sData === '14') {
            return 'editor-font-size-x-small';
        } else if (sData === '16') {
            return 'editor-font-size-small';
        } else if (sData === '18') {
            return 'editor-font-size-medium';
        } else if (sData === '20') {
            return 'editor-font-size-large';
        } else if (sData === '22') {
            return 'editor-font-size-x-large';
        } else {
            return 'editor-font-size-xx-large';
        }
    } else {
        return 'editor-font-size-medium';
    }
});
const cLogFormFontSizeClassName = computed(() => {
    const sStorageData = localStorage.getItem('gPreference');
    if (sStorageData) {
        const sData = JSON.parse(sStorageData).font;
        if (sData === '12') {
            return 'log-size-xx-small';
        } else if (sData === '14') {
            return 'log-size-x-small';
        } else if (sData === '16') {
            return 'log-size-small';
        } else if (sData === '18') {
            return 'log-size-medium';
        } else if (sData === '20') {
            return 'log-size-large';
        } else if (sData === '22') {
            return 'log-size-x-large';
        } else {
            return 'log-size-xx-large';
        }
    } else {
        return 'log-size-medium';
    }
});

let sLogField = ref<{ query: string; color: string; elapse: string }[]>([]);
const gTableList = computed(() => store.state.gTableList);

const changeVerticalType = (aItem: boolean) => {
    sVerticalType.value = aItem;
    localStorage.setItem('vertical', String(aItem));
};
const changeTimeFormat = (aItem: string) => {
    sSelectedFormat.value = aItem;
    const sFormat = sTimeFormatList.value.findIndex((bItem: any) => bItem.name === aItem);

    if (
        sTimeFormatList.value[sFormat].id === 'ns' ||
        sTimeFormatList.value[sFormat].id === 'us' ||
        sTimeFormatList.value[sFormat].id === 'ms' ||
        sTimeFormatList.value[sFormat].id === 's'
    )
        changeTimezone('UTC');
};

const changeTimezone = (aItem: string) => {
    sSelectedTimezone.value = aItem;
};

const changeTab = (aItem: string) => {
    sTab.value = aItem;
    nextTick(() => {
        if (sTab.value === 'log') rLog.value.$el.scrollTop = rLog.value.$el.scrollHeight + 200;
    });
};
const UpdateItems = () => {
    currentPage.value++;
    getSQLData();
};
const showConfluence = () => {
    window.open(`http://endoc.machbase.com`, '_blank');
};

const upload = (aEvent: any) => {
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event: any) => {
        const fileContent: any = event.target.result;

        gBoard.value.code = fileContent;
    };
    reader.readAsText(file);
};

const download = () => {
    const sSqlCode = gBoard.value.code;
    const blob = new Blob([sSqlCode], { type: 'plain/text' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${gBoard.value.board_name}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
const deleteLog = () => {
    sLogField.value.splice(0);
};

watch(
    () => gBoard.value.code,
    () => {
        store.commit(MutationTypes.updateCode, gBoard.value.code);
    }
);

const setSQL = async (event: any) => {
    if (!event.ctrlKey) return;

    const sPointer = event.target.selectionStart === 0 ? event.target.selectionStart : event.target.selectionStart - 1;

    let sPointerString = '|';

    const sStr = gBoard.value.code.slice(0, sPointer) + sPointerString + gBoard.value.code.slice(sPointer);

    const splitValue = sStr.split(';');

    const realValue = splitValue.map((aItem: string) => {
        return aItem + ';';
    });

    sSql.value = realValue.filter((aItem: string) => {
        const sStartIdx = sStr.indexOf(aItem);
        const sEndIdx = sStartIdx + aItem.length - 1;
        if (sStartIdx <= sPointer && sPointer <= sEndIdx && aItem !== undefined) return aItem;
    })[0];

    sSql.value = sSql.value && sSql.value.replace(sPointerString, '');
    if (event.ctrlKey) {
        event.preventDefault();
        handleChange(event.ctrlKey);
    }
};

const getButtonData = () => {
    const sPointer = sText.value.$refs.textarea.selectionStart === 0 ? sText.value.$refs.textarea.selectionStart : sText.value.$refs.textarea.selectionStart - 1;
    const splitValue = gBoard.value.code.split(';');

    const realValue = splitValue.map((aItem: string) => {
        return aItem + ';';
    });

    sSql.value = realValue.filter((aItem: string) => {
        const sStartIdx = gBoard.value.code.indexOf(aItem);
        const sEndIdx = sStartIdx + aItem.length - 1;
        if (sStartIdx <= sPointer && sPointer <= sEndIdx && aItem !== undefined) return aItem;
    })[0];

    sData.value = [];
    currentPage.value = 1;
    getSQLData();
};

const handleChange = async (aKeyPress: boolean) => {
    if (aKeyPress) {
        currentPage.value = 1;
        sData.value = [];
        getSQLData();
    }
};

const getSQLData = async () => {
    if (sSql.value) {
        const sSplitData = sSql.value.split('\n');

        const sTrimData = sSplitData.map((aItem) => {
            if (aItem.trim().substring(0, 2) === '--') {
                return '';
            } else {
                return aItem.trim();
            }
        });

        const sFormat = sTimeFormatList.value.findIndex((aItem: any) => aItem.name === sSelectedFormat.value);

        sSql.value = sTrimData.join(' ');
        // const sLimit = sSql.value.toLowerCase().indexOf('limit'.toLowerCase());
        const sResult: any = await fetchData(
            sSql.value.replaceAll(/\n/g, ' ').replace(';', ''),
            sTimeFormatList.value[sFormat].id,
            sSelectedTimezone.value,
            currentPage.value
            // sLimit === -1 ? currentPage.value : ''
        );

        if (sResult.status >= 400) {
            changeTab('log');
            sLogField.value.push({
                query: sSql.value.replaceAll(/\n/g, ' ').replace(';', ''),
                color: '#a85400',
                elapse: sResult.data.elapse + ' : ' + sResult.data.reason,
            });
        }
        if (sResult.status <= 400 && sResult.data.success) {
            if (!sResult.data.data) {
                sLogField.value.push({
                    query: sSql.value.replaceAll(/\n/g, ' ').replace(';', ''),
                    color: '#217DF8',
                    elapse: sResult.data.elapse + ' : ' + sResult.data.reason,
                });
                changeTab('log');
            } else {
                sLogField.value.push({
                    query: sSql.value.replaceAll(/\n/g, ' ').replace(';', ''),
                    color: '',
                    elapse: sResult.data.elapse + ' : ' + sResult.data.reason,
                });
                changeTab('table');
                if (
                    sTimeFormatList.value[sFormat].id === 'ns' ||
                    sTimeFormatList.value[sFormat].id === 'us' ||
                    sTimeFormatList.value[sFormat].id === 'ms' ||
                    sTimeFormatList.value[sFormat].id === 's'
                ) {
                    sPropsTypeOption.value = sTimeFormatList.value[sFormat].id;
                } else {
                    sPropsTypeOption.value = sSelectedTimezone.value;
                }
                sType.value = sResult.data.data.types;
                sHeader.value = sResult.data.data.columns;
                sResult.data.data.rows.forEach((aItem: any) => {
                    sData.value.push(aItem);
                });
            }
        }
        nextTick(() => {
            if (sTab.value === 'log') rLog.value.$el.scrollTop = rLog.value.$el.scrollHeight + 200;
        });
    }
};

onMounted(async () => {
    if (localStorage.getItem('vertical')) {
        if (localStorage.getItem('vertical') === 'true') {
            sVerticalType.value = true;
        } else {
            sVerticalType.value = false;
        }
    }
    const textarea = sText.value.$el.children[0].children[0].children[0];
    textarea.title = '';
});
</script>

<style scoped>
.editor-header {
    display: flex;
    font-size: 12px;
    position: relative;
    z-index: 2;
    height: 34px;
    box-sizing: border-box;
    padding: 0px 20px;
    justify-content: space-between;
    align-items: center;
}
</style>

<style lang="scss">
@import 'index.scss';
.drager_col {
    textarea,
    table,
    .log-form,
    .language-SQL {
        font-family: 'D2Coding' !important;
    }
}
.drager_right {
    padding-left: 2px !important;
}
.drager_left {
    padding-right: 2px !important;
}
.drager_top,
.drager_bottom {
    textarea,
    table,
    .log-form,
    .language-SQL {
        font-family: 'D2Coding' !important;
    }
}

.file-import {
    display: none;
}
.select-width {
    max-width: 200px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden !important;
}
.header-btn-list {
    gap: 8px;
    select {
        background-color: #f6f7f8;
        color: #202020;
        border-color: #dbe2ea;
        padding: 5px 10px;
        font-size: 12px;
    }
    display: flex;
    align-items: center;
}
.header-toggle {
    display: flex;
    align-items: center;
}
.window {
    height: calc(100% - 48px);
}
.window .v-window-item {
    height: 100%;
    padding: 0 5px;
}
.window .v-window__container {
    height: 100%;
}
.tab-list {
    display: flex;
    height: 10%;
    justify-content: space-between;
    overflow: auto;
}
.tab-form {
    display: flex;
}
.tool-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-right: 20px;
    gap: 12px;
    button {
        color: white;
    }
}

// .drager_top div {
//     overflow: auto !important;
// }

.drager_top div::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.drager_top div::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.drager_top div::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}

.drager_bottom div::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.log-form {
    padding: 0 16px;
    overflow: auto;
    position: relative;
    white-space: nowrap;
    .log-delete-icon {
        position: absolute;
        top: 10px;
        right: 10px;
    }
}
.drager_bottom {
    padding-top: 0 !important;
}
.drager_top {
    padding-bottom: 0 !important;
}
::v-deep .v-field__input input {
    font-family: 'Open Sans', Helvetica, Arial, sans-serif !important;
    @include theme() {
        border: 1px solid theme-get('border-color-input') !important;
        color: theme-get('text-color') !important;
        background-color: theme-get('bg-color-input') !important;
    }
    color: $text-w !important;
    outline: none !important;
    padding: 0 $px-15 !important;
    min-height: 24px !important;
    font-size: $font-12 !important;
    position: relative !important;
    &:focus {
        @include box-shadow;
    }
    &__item {
        background-color: $d-background !important;
        padding: 0 $px-15 !important;
        @include font-12;
        @include theme() {
            background-color: theme-get('bg-color') !important;
            color: theme-get('text-color') !important;
        }
    }
    -webkit-appearance: auto !important;
    appearance: auto !important;
}
.drager_bottom div::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.drager_bottom div::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
.drager_bottom div {
    overflow-x: auto !important;
    overflow-y: hidden;
}

.code-area textarea::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.code-area textarea::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.code-area textarea::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
.log-form::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.log-form::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}
.log-form::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}

.file-import-icon {
    cursor: pointer;
}
.hide_header .code_area {
    height: 100% !important;
}
.log-query {
    // overflow: hidden;
}
.log-status {
    overflow: hidden;
    font-style: italic;
    line-height: 15px;
}

.log-padding {
    height: 10px;
}

.delete-left-border {
    border-left: none !important;
}
.dark-sql {
    textarea {
        pointer-events: bounding-box;
    }
    height: 100%;
    /*!
  Theme: Windows 95
  Author: Fergus Collins (https://github.com/C-Fergus)
  License: ~ MIT (or more permissive) [via base16-schemes-source]
  Maintainer: @highlightjs/core-team
  Version: 2021.09.0
*/
    pre code.hljs {
        display: block;
        overflow-x: auto;
        padding: 1em;
    }
    code.hljs {
        padding: 3px 5px;
    }
    .hljs {
        color: #a8a8a8;
    }
    .hljs ::selection,
    .hljs::selection {
        background-color: rgba(56, 56, 56, 0.5);
    }
    .hljs-comment {
        color: #545454;
    }
    .hljs-tag {
        color: #7e7e7e;
    }
    .hljs-operator,
    .hljs-punctuation,
    .hljs-subst {
        color: #a8a8a8;
    }
    .hljs-operator {
        opacity: 0.7;
    }
    .hljs-bullet,
    .hljs-deletion,
    .hljs-name,
    .hljs-selector-tag,
    .hljs-template-variable,
    .hljs-variable {
        color: #fc5454;
    }
    .hljs-attr,
    .hljs-link,
    .hljs-literal,
    .hljs-number,
    .hljs-symbol,
    .hljs-variable.constant_ {
        color: #a85400;
    }
    .hljs-class .hljs-title,
    .hljs-title,
    .hljs-title.class_ {
        color: #fcfc54;
    }
    .hljs-strong {
        font-weight: 700;
        color: #fcfc54;
    }
    .hljs-addition,
    .hljs-code,
    .hljs-string,
    .hljs-title.class_.inherited__ {
        color: #54fc54;
    }
    .hljs-built_in,
    .hljs-doctag,
    .hljs-keyword.hljs-atrule,
    .hljs-quote,
    .hljs-regexp {
        color: #54fcfc;
    }
    .hljs-attribute,
    .hljs-function .hljs-title,
    .hljs-section,
    .hljs-title.function_,
    .ruby .hljs-property {
        color: #5454fc;
    }
    .diff .hljs-meta,
    .hljs-keyword,
    .hljs-template-tag,
    .hljs-type {
        color: #fc54fc;
    }
    .hljs-emphasis {
        color: #fc54fc;
        font-style: italic;
    }
    .hljs-meta,
    .hljs-meta .hljs-keyword,
    .hljs-meta .hljs-string {
        color: #00a800;
    }
    .hljs-meta .hljs-keyword,
    .hljs-meta-keyword {
        font-weight: 700;
    }
    height: 100%;
}
.white-sql {
    textarea {
        pointer-events: bounding-box;
    }
    height: 100%;
    /*!
  Theme: Windows 95 Light
  Author: Fergus Collins (https://github.com/C-Fergus)
  License: ~ MIT (or more permissive) [via base16-schemes-source]
  Maintainer: @highlightjs/core-team
  Version: 2021.09.0
*/
    pre code.hljs {
        display: block;
        overflow-x: auto;
        padding: 1em;
    }
    code.hljs {
        padding: 3px 5px;
    }
    .hljs {
        color: #545454;
    }
    .hljs ::selection,
    .hljs::selection {
        background-color: rgba(56, 56, 56, 0.5);
    }
    .hljs-comment {
        color: #a8a8a8;
    }
    .hljs-tag {
        color: #7e7e7e;
    }
    .hljs-operator,
    .hljs-punctuation,
    .hljs-subst {
        color: #545454;
    }
    .hljs-operator {
        opacity: 0.7;
    }
    .hljs-bullet,
    .hljs-deletion,
    .hljs-name,
    .hljs-selector-tag,
    .hljs-template-variable,
    .hljs-variable {
        color: #a80000;
    }
    .hljs-attr,
    .hljs-link,
    .hljs-literal,
    .hljs-number,
    .hljs-symbol,
    .hljs-variable.constant_ {
        color: #3a65d0;
    }
    .hljs-class .hljs-title,
    .hljs-title,
    .hljs-title.class_ {
        color: #a85400;
    }
    .hljs-strong {
        font-weight: 700;
        color: #a85400;
    }
    .hljs-addition,
    .hljs-code,
    .hljs-string,
    .hljs-title.class_.inherited__ {
        color: #00a800;
    }
    .hljs-built_in,
    .hljs-doctag,
    .hljs-keyword.hljs-atrule,
    .hljs-quote,
    .hljs-regexp {
        color: #00a8a8;
    }
    .hljs-attribute,
    .hljs-function .hljs-title,
    .hljs-section,
    .hljs-title.function_,
    .ruby .hljs-property {
        color: #0000a8;
    }
    .diff .hljs-meta,
    .hljs-keyword,
    .hljs-template-tag,
    .hljs-type {
        color: #a800a8;
    }
    .hljs-emphasis {
        color: #a800a8;
        font-style: italic;
    }
    .hljs-meta,
    .hljs-meta .hljs-keyword,
    .hljs-meta .hljs-string {
        color: #54fc54;
    }
    .hljs-meta .hljs-keyword,
    .hljs-meta-keyword {
        font-weight: 700;
    }
}
.code_editor {
    .header {
        display: none;
    }
}
.code-area {
    border-radius: 0 !important;
}
.editor-option {
    transform: rotate(180deg);
}
</style>
