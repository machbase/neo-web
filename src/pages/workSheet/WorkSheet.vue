<template>
    <v-sheet class="sheet-list" :class="cIsDarkMode ? 'is-dark' : 'is-white'" color="transparent" height="100%" width="100%">
        <v-sheet class="save-sheet" color="transparent" width="80%">
            <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'save')" class="icon" icon="mdi-content-save" size="16px"></v-icon>
            <v-icon @click="onClickPopupItem(PopupType.FILE_BROWSER, 'open')" class="icon" icon="mdi-folder-open" size="16px"></v-icon>
        </v-sheet>
        <v-sheet v-for="(aSheet, aIdx) in gBoard.sheet" :key="aSheet.id" :ref="(el) => (rSheet[aSheet.id] = el)" class="sheet-form" color="transparent" width="80%">
            <div v-if="!aSheet.minimal" class="create-sheet">
                <v-btn
                    @click="checkCtrl({ ctrlKey: true }, aIdx, 'mouse')"
                    class="create-sheet-top-btn"
                    density="comfortable"
                    :disabled="aSheet.type === 'mrk' && aSheet.status"
                    size="20px"
                    variant="plain"
                >
                    <v-icon size="20px"> mdi-play </v-icon>
                </v-btn>
                <v-btn @click="sortSheet(aIdx, 'top')" class="create-sheet-top-btn" density="comfortable" :disabled="aIdx === 0" size="20px" variant="plain">
                    <v-icon size="20px"> mdi-arrow-up </v-icon>
                </v-btn>
                <v-btn
                    @click="sortSheet(aIdx, 'bottom')"
                    class="create-sheet-top-btn"
                    density="comfortable"
                    :disabled="aIdx === gBoard.sheet.length - 1"
                    size="20px"
                    variant="plain"
                >
                    <v-icon size="20px"> mdi-arrow-down </v-icon>
                </v-btn>
                <v-btn @click="addSheet(aIdx, 'top')" class="create-sheet-top-btn" density="comfortable" size="20px" variant="plain">
                    <v-icon size="20px"> mdi-shape-rectangle-plus </v-icon>
                </v-btn>
                <v-btn @click="addSheet(aIdx, 'bottom')" class="create-sheet-bottom-btn" density="comfortable" size="20px" variant="plain">
                    <v-icon size="20px"> mdi-shape-rectangle-plus </v-icon>
                </v-btn>
                <v-btn @click="deleteSheet(aIdx)" class="create-sheet-top-btn" density="comfortable" :disabled="gBoard.sheet.length === 1" size="18px" variant="plain">
                    <v-icon size="20px"> mdi-delete </v-icon>
                </v-btn>
            </div>
            <ResizeRow
                v-if="!(aSheet.status && aSheet.type === 'mrk') && !aSheet.minimal"
                @isDragging="setHeight($event, aIdx)"
                :height="aSheet.height"
                :slider-bg-color="'transparent'"
                :slider-bg-hover-color="`transparent`"
                :slider-color="'transparent'"
                :slider-hover-color="`transparent`"
                :slider-width="5"
                :style="cIsDarkMode ? { boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)' } : { boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)' }"
                width="100%"
            >
                <v-sheet color="transparent" height="100%">
                    <CodeEditor
                        v-model="aSheet.contents"
                        @keydown.enter.stop="checkCtrl($event, aIdx, 'key')"
                        @lang="(aLang) => getLanguage(aLang, aIdx)"
                        :autofocus="true"
                        border_radius="0"
                        :copy-code="false"
                        :font-size="cPrefrence + 'px'"
                        :header="true"
                        height="100%"
                        :languages="aSheet.lang"
                        :line_nums="false"
                        theme=""
                        width="100%"
                    />
                </v-sheet>
            </ResizeRow>
            <v-sheet class="result-form" :class="aSheet.status && aSheet.type === 'mrk' ? 'mrk-hover' : ''" color="transparent">
                <v-sheet class="result-tool-form" color="transparent">
                    <v-btn v-if="aSheet.type !== 'mrk' && aSheet.status" @click="setMinimal(aIdx)" class="minimal-sheet-btn" density="comfortable" size="20px" variant="plain">
                        <v-icon size="20px"> mdi-resize </v-icon>
                    </v-btn>
                </v-sheet>
                <v-sheet v-if="aSheet.status && aSheet.type === 'mrk'" color="transparent">
                    <Markdown @dblclick="changeStatus(aIdx, 'click')" :p-contents="aSheet.contents" />
                </v-sheet>
                <v-sheet v-else-if="aSheet.type === 'tql' && aSheet.tqlType === 'html'" color="transparent">
                    <iframe ref="iframeDom" id="iframeMapViewComponent" @load="setSize(aSheet.id)" frameborder="0" :srcdoc="aSheet.result" width="100%"></iframe>
                </v-sheet>
                <v-sheet
                    v-else-if="(aSheet.type === 'tql' && aSheet.tqlType === 'csv') || (aSheet.type === 'sql' && aSheet.tqlType === 'csv')"
                    class="result-set-form"
                    color="transparent"
                    max-height="500px"
                >
                    <Table :headers="aSheet.result.columns" :items="aSheet.result.rows" :p-tab-option="'wrk'" p-timezone="ns" :p-type="aSheet.result.types" />
                    <div class="total-count-form">Total {{ sCsvDataLeng ? sCsvDataLeng.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '' }} records</div>
                </v-sheet>

                <v-sheet v-else-if="aSheet.tqlType === 'text'" class="result-set-form" color="transparent">
                    <pre>{{ changeJsonFormat(aSheet.result) }}</pre>
                </v-sheet>
            </v-sheet>
        </v-sheet>
    </v-sheet>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-upload-type="'wrk'" :p-width="cWidthPopup" />
</template>

<script setup="setup" lang="ts" name="WorkSheet">
import PopupWrap from '@/components/popup-list/index.vue';
import CodeEditor from 'simple-code-editor';
import Table from '../Tql/Table.vue';
import Markdown from './Markdown.vue';
import { ResizeRow } from 'vue-resizer';

import { ref, computed, defineProps, reactive, nextTick, onMounted } from 'vue';
import { postLogin } from '@/api/repository/login';
import router from '../../routes';
import { RouteNames } from '../../enums/routes';
import { toast, ToastOptions } from 'vue3-toastify';
import { store } from '../../store';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { fetchData, getTqlChart } from '@/api/repository/machiot';
import { BoardInfo } from '../../interface/chart';
import { PopupType } from '../../enums/app';
import { WIDTH_DEFAULT } from '../../components/header/constant';
import { getWindowOs } from '../../utils/utils';
import { postFileList } from '../../api/repository/api';
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);

interface PropsNoteData {
    pPanelData: BoardInfo;
}
let sFileOption = ref<string>('');

const props = defineProps<PropsNoteData>();
const sLang = [
    ['markdown', 'Markdown'],
    ['SQL', 'SQL'],
    ['javascript', 'TQL'],
];

const rSheet = ref<any>([]);
const iframeDom = ref<any>();

const sCsvDataLeng = ref<any>();
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === props.pPanelData.board_id);
    return gTabList.value[sIdx];
});
const sDialog = ref<boolean>(false);

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sLanguage = ref<string>('markdown');
const onClosePopup = () => {
    sDialog.value = false;
};

const changeJsonFormat = (aItem: any) => {
    if (typeof aItem === 'string') {
        return JSON.stringify(JSON.parse(aItem), null, 4).replace(
            `[
                    "",
                    "",
                    ""
                ],`,
            '...'
        );
    } else {
        return JSON.stringify(aItem, null, 4).replace(
            `[
                    "",
                    "",
                    ""
                ],`,
            '...'
        );
    }
};

const cPrefrence = computed(() => {
    const sStorageData = localStorage.getItem('gPreference');
    return sStorageData && JSON.parse(sStorageData).font ? Number(JSON.parse(sStorageData).font) : 18;
});

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

const onClickPopupItem = (aPopupName: PopupType, aFileOption?: string) => {
    if (aFileOption === 'save') {
        sFileOption.value = 'save';
    } else {
        sFileOption.value = 'open';
    }
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

const getLanguage = (aLang: string, aIdx: number) => {
    const sItem = gBoard.value.sheet[aIdx].lang.find((aItem: string[]) => aItem[0] === aLang);
    const sItemIdx = gBoard.value.sheet[aIdx].lang.findIndex((aItem: string[]) => aItem[0] === aLang);

    gBoard.value.sheet[aIdx].lang.splice(sItemIdx, 1);
    gBoard.value.sheet[aIdx].lang.splice(0, 0, sItem);

    if (aLang === 'SQL') gBoard.value.sheet[aIdx].type = 'sql';
    if (aLang === 'javascript') gBoard.value.sheet[aIdx].type = 'tql';
    if (aLang === 'markdown') gBoard.value.sheet[aIdx].type = 'mrk';
};

const setHeight = (aEvent: any, aIdx: number) => {
    if (!aEvent) {
        gBoard.value.sheet[aIdx].height = rSheet.value[gBoard.value.sheet[aIdx].id].$el.children[1].clientHeight;
    }
};

const sortSheet = (aIdx: number, aType: string) => {
    const sData = gBoard.value.sheet[aIdx];
    if (aType === 'top') {
        gBoard.value.sheet.splice(aIdx, 1);
        gBoard.value.sheet.splice(aIdx - 1, 0, sData);
    } else {
        gBoard.value.sheet.splice(aIdx, 1);
        gBoard.value.sheet.splice(aIdx + 1, 0, sData);
    }
    const sIdx = gBoard.value.sheet.findIndex((aItem: any) => aItem.status === false);
    if (sIdx !== -1) {
        const sExistingEl = rSheet.value[gBoard.value.sheet[aIdx].id].$el?.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0];
        if (sExistingEl) {
            sExistingEl.focus();
        }
    }
};

const setMinimal = (aIdx: number) => {
    gBoard.value.sheet[aIdx].minimal = !gBoard.value.sheet[aIdx].minimal;
};

const addSheet = (aIdx: number, aType: string) => {
    const sNewId = String(new Date().getTime()) + (Math.random() * 1000).toFixed();
    const sNewSheet = {
        id: sNewId,
        type: 'mrk',
        contents: '# Lorem ipsum \n Lorem ipsum dolor sit amet,\n consectetur adipiscing elit,\n sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        status: true,
        result: '' as any,
        height: 200,
        lang: [
            ['markdown', 'Markdown'],
            ['SQL', 'SQL'],
            ['javascript', 'TQL'],
        ],
        minimal: false,
    };

    if (aType === 'top') {
        gBoard.value.sheet.splice(aIdx, 0, sNewSheet);
    }
    if (aType === 'bottom') {
        gBoard.value.sheet.splice(aIdx + 1, 0, sNewSheet);
    }

    const sIdx = gBoard.value.sheet.findIndex((aItem: any) => aItem.status === false);
    if (sIdx !== -1) {
        const sExistingEl = rSheet.value[gBoard.value.sheet[aIdx].id].$el?.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0];
        if (sExistingEl) {
            sExistingEl.focus();
        }
    }
};

const deleteSheet = (aIdx: number) => {
    gBoard.value.sheet.splice(aIdx, 1);
};

const changeStatus = (aIdx: number) => {
    gBoard.value.sheet.forEach((aItem: any) => {
        aItem.status = true;
    });
    if (gBoard.value.sheet[aIdx].status) {
        gBoard.value.sheet[aIdx].status = !gBoard.value.sheet[aIdx].status;
        nextTick(() => {
            const sNewExistEl = rSheet.value[gBoard.value.sheet[aIdx].id].$el?.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0];
            if (sNewExistEl) {
                sNewExistEl.focus();
                sNewExistEl.title = '';
            }
        });
    }
};

const checkCtrl = async (event: any, aIdx: number, aType: string) => {
    if (!event.ctrlKey) return;
    if (aType === 'key') event.preventDefault();
    if (gBoard.value.sheet[aIdx].type == 'sql') {
        const sResult: any = await getTqlChart('INPUT(SQL(`' + gBoard.value.sheet[aIdx].contents + '`))\n' + "OUTPUT(JSON(timeformat('ns'), tz('LOCAL')))");
        if (sResult.status !== 200) {
            gBoard.value.sheet[aIdx].tqlType = 'text';
            gBoard.value.sheet[aIdx].result = sResult.data.reason;
        } else {
            sCsvDataLeng.value = sResult.data.data.rows.length;
            if (sResult.data.data.rows.length > 10) {
                const sData = [] as any;

                for (let i = 0; i < 5; i++) {
                    sData.push(sResult.data.data.rows[i]);
                }
                sData.push([]);
                sResult.data.data.rows[0].forEach((aIdx: any) => {
                    aIdx;
                    sData[sData.length - 1].push('');
                });
                for (let i = 5; i >= 1; i--) {
                    sData.push(sResult.data.data.rows[sResult.data.data.rows.length - i]);
                }

                sResult.data.data.rows = sData;
            }

            gBoard.value.sheet[aIdx].tqlType = 'csv';
            gBoard.value.sheet[aIdx].result = sResult.data.data;
        }
        gBoard.value.sheet[aIdx].status = true;
    }
    if (gBoard.value.sheet[aIdx].type == 'tql') {
        const sResult: any = await getTqlChart(gBoard.value.sheet[aIdx].contents);
        if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/html') {
            gBoard.value.sheet[aIdx].tqlType = 'html';
            gBoard.value.sheet[aIdx].result = sResult.data;
        } else if (sResult.status === 200 && sResult.headers && sResult.headers['content-type'] === 'text/csv') {
            gBoard.value.sheet[aIdx].tqlType = 'csv';
            gBoard.value.sheet[aIdx].result = {
                rows: [],
                columns: [],
                types: [],
            };
            sResult.data.split('\n').map((aItem: string) => {
                gBoard.value.sheet[aIdx].result.rows.push(aItem.split(','));
            });
            gBoard.value.sheet[aIdx].result.rows.pop();

            sCsvDataLeng.value = gBoard.value.sheet[aIdx].result.rows.length;
            if (sCsvDataLeng.value > 10) {
                const sData = [] as any;

                for (let i = 0; i < 5; i++) {
                    sData.push(gBoard.value.sheet[aIdx].result.rows[i]);
                }
                sData.push([]);
                gBoard.value.sheet[aIdx].result.rows[0].forEach((aIdx: any) => {
                    aIdx;
                    sData[sData.length - 1].push('');
                });
                for (let i = 5; i >= 1; i--) {
                    sData.push(gBoard.value.sheet[aIdx].result.rows[gBoard.value.sheet[aIdx].result.rows.length - i]);
                }

                gBoard.value.sheet[aIdx].result.rows = sData;
            }
        } else {
            gBoard.value.sheet[aIdx].tqlType = 'text';
            if (sResult.status === 200) {
                sCsvDataLeng.value = sResult.data.data.rows.length;
                if (sResult.data.data.rows.length > 10) {
                    const sData = [] as any;

                    for (let i = 0; i < 5; i++) {
                        sData.push(sResult.data.data.rows[i]);
                    }
                    sData.push([]);
                    sResult.data.data.rows[0].forEach((aIdx: any) => {
                        aIdx;
                        sData[sData.length - 1].push('');
                    });
                    for (let i = 5; i >= 1; i--) {
                        sData.push(sResult.data.data.rows[sResult.data.data.rows.length - i]);
                    }

                    sResult.data.data.rows = sData;
                }
                gBoard.value.sheet[aIdx].result = sResult.data;
            } else {
                gBoard.value.sheet[aIdx].result = sResult.data.reason;
            }
        }
        gBoard.value.sheet[aIdx].status = true;
    }

    if (gBoard.value.sheet[aIdx].status === false && gBoard.value.sheet[aIdx].type === 'mrk') {
        gBoard.value.sheet[aIdx].status = !gBoard.value.sheet[aIdx].status;
    }
};
const setSize = (aId: number) => {
    const sValue = gBoard.value.sheet.find((aItem: any) => aItem.id === aId);

    if (sValue.minimal) {
        nextTick(() => {
            rSheet.value[aId].$el.children[0].children[1].children[0].style.height = `${
                rSheet.value[aId].$el.children[0].children[1].children[0].contentDocument.body.clientHeight + 100
            }px`;
        });
    } else {
        nextTick(() => {
            rSheet.value[aId].$el.children[2].children[1].children[0].style.height = `${
                rSheet.value[aId].$el.children[2].children[1].children[0].contentDocument.body.clientHeight + 100
            }px`;
        });
    }
};

onMounted(() => {
    for (const aItem in rSheet.value) {
        const sDefaultSheet = rSheet.value[aItem].$el.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0];
        if (sDefaultSheet) {
            sDefaultSheet.title = '';
        }
    }
});
</script>

<style lang="scss" scoped="scoped">
.sheet-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    padding: 0 0 20px 0;
}
.save-sheet {
    display: flex;
    padding: 8px 8px;
    justify-content: end;

    .icon {
        margin-right: 4px;
    }
}
.markdown-sheet {
    padding: 20px;
}
.sheet-form {
    position: relative;
    margin: 20px;
}

.create-sheet {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
    button {
        margin-right: 4px;
    }
    .create-sheet-bottom-btn {
        transform: scaleY(-1);
        transition: 0.3s;
    }
}
.result-set-form {
    .total-count-form {
        display: flex;
        justify-content: start;
    }
}

.sheet-list::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.sheet-list::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.sheet-list::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
.result-set-form::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.result-set-form::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.result-set-form::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
</style>

<style lang="scss">
@import '@/assets/scss/theme.scss';

.sheet-list {
    .dropdown {
        .list:before {
            opacity: 1;
            @include theme() {
                color: theme-get(bg-tab-content);
            }
        }
    }

    .markdown-sheet {
        background: transparent;
    }
    .language-SQL,
    .language-javascript,
    .language-markdown,
    textarea {
        font-family: 'D2Coding' !important;
    }
    .markdown-sheet {
        font-family: 'D2Coding' !important;
        .hljs {
            font-family: 'D2Coding' !important;
        }
    }
}

.is-dark {
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
        color: #f8f8f8;
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
.is-white {
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

.result-form {
    .result-tool-form {
        padding-top: 4px;
        display: flex;
        justify-content: end;
    }
    position: relative;
    overflow: auto;
    .minimal-sheet-btn {
        z-index: 15;
    }
}
.text-wrap {
    white-space: pre-wrap;
}
.sheet-list {
    table {
        font-family: 'D2Coding' !important;
    }
}
</style>
