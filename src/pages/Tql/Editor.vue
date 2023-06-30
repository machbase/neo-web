<template>
    <DragCol
        v-if="!sVerticalType"
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
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'open')" class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="sText"
                    @keydown="saveSQL"
                    @keydown.enter.stop="setSQL($event)"
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
                        class="delete-left-border"
                        :style="
                            sTab === 'chart'
                                ? cIsDarkMode
                                    ? { backgroundColor: '#121212' }
                                    : { backgroundColor: '#ffffff', color: '#121212', border: '1px solid #ffffff !important' }
                                : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon v-if="sResultType === 'html'">mdi-chart-line</v-icon>
                            <v-icon v-if="sResultType === 'csv'">mdi-file-delimited-outline</v-icon>
                            <v-icon v-if="sResultType === 'text'">mdi-note-outline</v-icon>
                            Result
                        </div>
                    </button>
                </v-sheet>

                <v-sheet class="tool-bar" color="transparent">
                    <v-btn v-if="sResultType === 'text'" @click="setJsonFormat()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon v-if="!sJsonOption" size="20px">mdi-text</v-icon>
                        <v-icon v-else size="20px">mdi-code-json</v-icon>
                    </v-btn>
                    <v-btn v-if="sResultType === 'csv'" @click="setCsvHeaderOption()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon v-if="!sCsvHeaderOption" size="20px">mdi-table-headers-eye</v-icon>
                        <v-icon v-else size="20px">mdi-table-headers-eye-off</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(false)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-horizontal</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(true)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-vertical</v-icon>
                    </v-btn>
                </v-sheet>
            </v-sheet>
            <ShowChart v-if="sResultType === 'html'" ref="rChartTab" :p-headers="sHeader" :p-html="sHtml" />
            <Table
                v-if="sResultType === 'csv'"
                :headers="
                    sCsvHeaderOption
                        ? sCsvHeader
                        : sCsvHeader.map((aItem, aIdx) => {
                              return 'column ' + aIdx;
                          })
                "
                :items="sCSV"
                :p-timezone="''"
                :p-type="''"
            />

            <v-sheet v-else class="sheet-text" :class="cLogFormFontSizeClassName" color="transparent" height="calc(100% - 40px)" width="100%">
                <div v-if="sJsonOption">{{ sTextField }}</div>
                <pre v-else>{{ JSON.stringify(JSON.parse(sTextField), null, 4) }}</pre>
            </v-sheet>

            <v-sheet />
        </template>
    </DragCol>
    <DragRow
        v-if="sVerticalType"
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
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                        <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'open')" class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="sText"
                    @keydown="saveSQL"
                    @keydown.enter.stop="setSQL($event)"
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
                        class="delete-left-border"
                        :style="
                            sTab === 'chart' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }
                        "
                    >
                        <div>
                            <v-icon v-if="sResultType === 'html'">mdi-chart-line</v-icon>
                            <v-icon v-if="sResultType === 'csv'">file-delimited-outline</v-icon>
                            <v-icon v-if="sResultType === 'text'">mdi-note-outline</v-icon>
                            Result
                        </div>
                    </button>
                </v-sheet>

                <v-sheet class="tool-bar" color="transparent">
                    <v-btn v-if="sResultType === 'text'" @click="setJsonFormat()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon v-if="!sJsonOption" size="20px">mdi-text</v-icon>
                        <v-icon v-else size="20px">mdi-code-json</v-icon>
                    </v-btn>
                    <v-btn v-if="sResultType === 'csv'" @click="setCsvHeaderOption()" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon v-if="!sCsvHeaderOption" size="20px">mdi-table-headers-eye</v-icon>
                        <v-icon v-else size="20px">mdi-table-headers-eye-off</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(false)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-horizontal</v-icon>
                    </v-btn>
                    <v-btn @click="changeVerticalType(true)" class="log-delete-icon" density="comfortable" icon="" size="16px" variant="plain">
                        <v-icon size="20px">mdi-flip-vertical</v-icon>
                    </v-btn>
                </v-sheet>
            </v-sheet>

            <ShowChart v-if="sResultType === 'html'" ref="rChartTab" :p-headers="sHeader" :p-html="sHtml" />
            <Table
                v-if="sResultType === 'csv'"
                :headers="
                    sCsvHeaderOption
                        ? sCsvHeader
                        : sCsvHeader.map((aItem, aIdx) => {
                              return 'column ' + aIdx;
                          })
                "
                :items="sCSV"
                :p-timezone="''"
                :p-type="''"
            />

            <v-sheet v-else class="sheet-text" :class="cLogFormFontSizeClassName" color="transparent" height="100%" width="100%">
                <div v-if="sJsonOption">{{ sTextField }}</div>
                <pre v-else>{{ JSON.stringify(JSON.parse(sTextField), null, 4) }}</pre>
            </v-sheet>
        </template>
    </DragRow>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-upload-type="'tql'" :p-width="cWidthPopup" />
</template>

<script setup lang="ts" name="Editor">
import CodeEditor from 'simple-code-editor';
import PopupWrap from '@/components/popup-list/index.vue';
import Table from './Table.vue';
import ShowChart from './showChart.vue';
import { ref, watch, defineEmits, defineProps, computed, onMounted, nextTick } from 'vue';
import { store } from '../../store';
import { fetchData, getTqlChart } from '../../api/repository/machiot';
import { copyText } from 'vue3-clipboard';
import { DragCol, DragRow, ResizeCol, ResizeRow, Resize } from 'vue-resizer';
import { MutationTypes } from '../../store/mutations';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxAuto from '@/components/common/combobox/combobox-auto/index.vue';
import { IANA_TIMEZONES, IanaTimezone } from '@/assets/ts/timezones.ts';
import { PopupType } from '@/enums/app';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from '@/components/header/constant';
import { postFileList } from '../../api/repository/api';
import { getWindowOs } from '../../utils/utils';
import { toast, ToastOptions } from 'vue3-toastify';

const sLang = [['javascript', 'machbase']];
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);

let sFileOption = ref<string>('');
let sData = ref<any>([]);
let sHeader = ref<any>([]);
let sTab = ref<string>('chart');
let sResultType = ref<string>('text');
let sVerticalType = ref<boolean>(false);

let sHtml = ref<string>('');
let sCSV = ref<string[][]>([]);
let sTextField = ref<string>('');
let sText = ref<any>('');

let sJsonBtnOption = ref<boolean>(false);
let sJsonOption = ref<boolean>(true);

let sCsvHeaderBtn = ref<boolean>(false);
let sCsvHeader = ref<any>([]);
let sCsvHeaderOption = ref<boolean>(false);
const sDialog = ref<boolean>(false);

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

const onClosePopup = () => {
    sDialog.value = false;
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

function getLineIndex(position: number) {
    let textUntilPosition = gBoard.value.code.substr(0, position);
    let lines = textUntilPosition.split('\n');

    return lines.length - 1;
}

const saveSQL = async (aEvent: any) => {
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
                    if (!lines[i].startsWith('//')) {
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
                        lines[i] = '//' + lines[i];
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
                    if (!lines[i].startsWith('//')) {
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
                        lines[i] = '//' + lines[i];
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
                const sResult: any = await postFileList(gBoard.value.code, gBoard.value.path, gBoard.value.board_name);

                if (sResult.success) {
                    gBoard.value.savedCode = gBoard.value.code;
                }
            } else {
                onClickPopupItem(PopupType.FILE_BROWSER, 'save');
            }
        } else if (!getWindowOs() && aEvent.metaKey) {
            aEvent.preventDefault();
            if (gBoard.value.path !== '') {
                const sResult: any = await postFileList(gBoard.value.code, gBoard.value.path, gBoard.value.board_name);
                if (sResult.success) {
                    gBoard.value.savedCode = gBoard.value.code;
                }
            } else {
                onClickPopupItem(PopupType.FILE_BROWSER, 'save');
            }
        }
    }
};
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

const copyData = () => {
    const selectText = window.getSelection()?.toString();
    if (!selectText) {
        toast('Please drag the query.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    } else {
        copyText(selectText, undefined, (error: string, event: string) => {
            if (error) {
                toast('Can not copy', {
                    autoClose: 1000,
                    theme: cIsDarkMode.value ? 'dark' : 'light',
                    position: toast.POSITION.TOP_RIGHT,
                    type: 'error',
                } as ToastOptions);
                console.log(error);
            } else {
                toast('Copied', {
                    autoClose: 1000,
                    theme: cIsDarkMode.value ? 'dark' : 'light',
                    position: toast.POSITION.TOP_RIGHT,
                    type: 'error',
                } as ToastOptions);
                console.log(event);
            }
        });
    }
};

watch(
    () => gBoard.value.code,
    () => {
        store.commit(MutationTypes.updateCode, gBoard.value.code);
    }
);

const setSQL = async (event: any, aType?: string) => {
    if (!event.ctrlKey) return;

    if (event.ctrlKey) {
        event.preventDefault();
        getTqlData();
    }
};

const getButtonData = () => {
    getTqlData();
};

const setJsonFormat = () => {
    sJsonOption.value = !sJsonOption.value;
};
const setCsvHeaderOption = () => {
    sCsvHeaderOption.value = !sCsvHeaderOption.value;
    if (sCsvHeaderOption.value) {
        sCSV.value.shift();
    } else {
        sCSV.value.unshift(sCsvHeader.value);
    }
};

const getTqlData = async () => {
    const sResult: any = await getTqlChart(gBoard.value.code);

    if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/html') {
        sResultType.value = 'html';
        sHtml.value = sResult.data;
    } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/csv') {
        sResultType.value = 'csv';

        sCsvHeaderOption.value = false;
        sCsvHeaderBtn.value = true;

        sCSV.value = [];
        sCsvHeader.value = [];

        sResult.data.split('\n').map((aItem: string) => {
            sCSV.value.push(aItem.split(','));
        });

        sCSV.value[0].map((aItem) => {
            sCsvHeader.value.push(aItem);
        });
        sCSV.value.pop();
        return;
    } else {
        sResultType.value = 'text';
        if (sResult.status === 200) {
            sJsonBtnOption.value = true;
            sTextField.value = JSON.stringify(sResult.data);
            return;
        } else {
            sTextField.value = sResult.data.reason;
            sJsonOption.value = true;
        }
    }
    sCsvHeaderBtn.value = false;
    sJsonBtnOption.value = false;
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
    .language-javascript {
        font-family: 'D2Coding' !important;
    }
}
.drager_top,
.drager_bottom {
    textarea,
    table,
    .language-javascript {
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

.file-import-icon {
    cursor: pointer;
}

.hide_header .code_area {
    height: 100% !important;
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
.text-wrap {
    white-space: pre-wrap;
}
.sheet-text {
    overflow: auto !important;
}

.sheet-text::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.sheet-text::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}
.sheet-text::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
</style>
