<template>
    <DragCol height="100%" slider-bg-color="#202020" width="100%">
        <template #left>
            <div :class="cIsDarkMode ? 'dark-sql' : 'white-sql'">
                <div class="editor-header">
                    <div class="header-toggle">
                        <!-- MACHBASE -->
                        <v-btn @click="getButtonData" density="comfortable" icon="mdi-play" size="36px" variant="plain"></v-btn>
                    </div>
                    <div class="header-btn-list">
                        <ComboboxSelect
                            @e-on-change="(aValue) => changeTimeFormat(aValue)"
                            class="select-width"
                            :p-data="sTimeFormatList"
                            :p-show-default-option="false"
                            :p-value="sSelectedFormat"
                        />
                        <ComboboxAuto
                            @e-on-change="(aValue) => changeTimezone(aValue)"
                            class="select-width"
                            :p-data="IANA_TIMEZONES"
                            :p-disabled="sSelectedFormat === ''"
                            :p-show-default-option="false"
                            :p-value="sSelectedTimezone"
                        />
                        <v-icon @click="download" class="icon" icon="mdi-content-save" size="16px"></v-icon>
                        <label class="item">
                            <v-icon class="file-import-icon" icon="mdi-folder-open" size="16px"></v-icon>
                            <input @change="upload" accept=".sql" class="file-import" type="file" />
                        </label>
                        <v-tooltip location="bottom">
                            <template #activator="{ props }">
                                <v-icon v-bind="props"> mdi-help-circle-outline </v-icon>
                            </template>
                            <span>
                                Enter the query statements to be executed.<br />
                                - Separate each query statement with a semicolon. <br />- Place the cursor on the query statement you want to execute and press the Ctrl-Enter key
                                or click the Execute button.
                            </span>
                        </v-tooltip>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="sText"
                    @keydown.enter.stop="setSQL($event)"
                    border_radius="0"
                    height="calc(100% - 34px)"
                    hide_header
                    :languages="sLang"
                    min_height="calc(100% - 34px)"
                    theme=""
                    width="100%"
                />
            </div>
        </template>

        <template #right>
            <v-sheet class="tab-list" color="#202020" fixed-tabs height="40px">
                <button
                    @click="changeTab('table')"
                    class="delete-left-border"
                    :style="sTab === 'table' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                >
                    <div>
                        <v-icon>mdi-table</v-icon>
                        RESULT
                    </div>
                </button>
                <button
                    @click="changeTab('log')"
                    :style="sTab === 'log' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                >
                    <div>
                        <v-icon>mdi-information</v-icon>
                        LOG
                    </div>
                </button>
            </v-sheet>

            <Table v-if="sTab === 'table'" @UpdateItems="UpdateItems" :headers="sHeader" :items="sData" :p-timezone="sPropsTypeOption" :p-type="sType" />

            <v-sheet v-if="sTab === 'log'" ref="rLog" class="log-form" color="transparent" height="calc(100% - 40px)">
                <v-btn @click="deleteLog()" class="log-delete-icon" density="comfortable" icon="mdi-delete-circle-outline" size="36px" variant="plain"></v-btn>

                <div v-for="(aLog, aIdx) in sLogField" :key="aIdx" :style="{ color: aLog.color }">{{ aLog.elapse }} / {{ aLog.query }}</div>
            </v-sheet>
        </template>
    </DragCol>
</template>

<script setup lang="ts" name="Editor">
import CodeEditor from 'simple-code-editor';
import Table from './Table.vue';
import { ref, watch, defineEmits, defineProps, computed, onMounted, nextTick } from 'vue';
import { store } from '../../store';
import { fetchData } from '../../api/repository/machiot';
import { copyText } from 'vue3-clipboard';
import { DragCol, DragRow, ResizeCol, ResizeRow, Resize } from 'vue-resizer';
import { MutationTypes } from '../../store/mutations';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxAuto from '@/components/common/combobox/combobox-auto/index.vue';
import { IANA_TIMEZONES, IanaTimezone } from '@/assets/ts/timezones.ts';
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

let sPropsTypeOption = ref<string>('');
let sText = ref<any>('');
let rLog = ref<any>('');
let sData = ref<any>([]);
let sHeader = ref<any>([]);
let sType = ref<any>([]);
let currentPage = ref<number>(1);
let sSql = ref<string>('');
let sTab = ref<string>('table');

const sTimeFormatList = ref<any>([
    { name: 'TIMESTAMP', id: '' },
    { name: 'YYYY-MM-DD', id: '2006-01-02' },
    { name: 'YYYY-DD-MM', id: '2006-02-01' },
    { name: 'DD-MM-YYYY', id: '02-01-2006' },
    { name: 'MM-DD-YYYY', id: '01-02-2006' },
    { name: 'YY-DD-MM', id: '06-02-01' },
    { name: 'YY-MM-DD', id: '06-01-02' },
    { name: 'MM-DD-YY', id: '01-02-06' },
    { name: 'DD-MM-YY', id: '02-01-06' },
    { name: 'YYYY-MM-DD HH:MI:SS', id: '2006-01-02 15:04:05' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSS', id: '2006-01-02 15:04:05.999' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSS', id: '2006-01-02 15:04:05.999999' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', id: '2006-01-02 15:04:05.999999999' },
    { name: 'YYYY-MM-DD HH', id: '2006-01-02 15' },
    { name: 'YYYY-MM-DD HH:MI', id: '2006-01-02 15:04' },
    { name: 'HH:MI:SS', id: '03:04:05' },
]);

const sSelectedFormat = ref<any>('2006-01-02 15:04:05');
const sSelectedTimezone = ref<any>('LOCAL');

let sLogField = ref<{ query: string; color: string; elapse: string }[]>([]);
const gTableList = computed(() => store.state.gTableList);

const changeTimeFormat = (aItem: string) => {
    sSelectedFormat.value = aItem;
    if (aItem === 'TIMESTAMP') changeTimezone('UTC');
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
    const sLimit = sSql.value.toLowerCase().indexOf('limit'.toLowerCase());
    currentPage.value++;
    if (sLimit === -1) getSQLData();
};

const changeTabMode = (aItem: string) => {
    sTab.value = aItem;
    nextTick(() => {
        if (sTab.value === 'log') rLog.value.$el.scrollTop = rLog.value.$el.scrollHeight + 200;
    });
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

const copyData = () => {
    const selectText = window.getSelection()?.toString();
    if (!selectText) {
        alert('Please drag the query.');
    } else {
        copyText(selectText, undefined, (error: string, event: string) => {
            if (error) {
                alert('Can not copy');
                console.log(error);
            } else {
                alert('Copied');
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
    const sPointer = event.target.selectionStart === 0 ? event.target.selectionStart : event.target.selectionStart - 1;

    const splitValue = gBoard.value.code.split(';');

    const realValue = splitValue.map((aItem: string) => {
        return aItem + ';';
    });

    sSql.value = realValue.filter((aItem: string) => {
        const sStartIdx = gBoard.value.code.indexOf(aItem);
        const sEndIdx = sStartIdx + aItem.length - 1;
        if (sStartIdx <= sPointer && sPointer <= sEndIdx && aItem !== undefined) return aItem;
    })[0];

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
        const sLimit = sSql.value.toLowerCase().indexOf('limit'.toLowerCase());
        const sResult: any = await fetchData(
            sSql.value.replaceAll(/\n/g, ' ').replace(';', ''),
            sSelectedFormat.value,
            sSelectedTimezone.value,
            sLimit === -1 ? currentPage.value : ''
        );

        if (sResult.status >= 400) {
            changeTab('log');
            sLogField.value.push({
                query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.data.reason,
                color: '#a85400',
                elapse: sResult.data.elapse,
            });
        }
        if (sResult && sResult.success) {
            if (!sResult.data) {
                sLogField.value.push({
                    query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason,
                    color: '#217DF8',
                    elapse: sResult.elapse,
                });

                changeTab('log');
            } else {
                sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason, color: '', elapse: sResult.elapse });

                changeTab('table');
                sPropsTypeOption.value = sSelectedTimezone.value;
                sType.value = sResult.data.types;
                sHeader.value = sResult.data.columns;
                sResult.data.rows.forEach((aItem: any) => {
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
    if (!gBoard.value.code) {
        if (gTableList.value[0]) {
            gBoard.value.code = `select * from ${gTableList.value[0]};`;
            sSql.value = gBoard.value.code;
            await getSQLData();
        }
    }
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
}

.drager_top div {
    overflow: auto !important;
}

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
    .log-delete-icon {
        position: absolute;
        top: 10px;
        right: 10px;
    }
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
    overflow: auto !important;
}

.hide_header textarea::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.hide_header textarea::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.hide_header textarea::-webkit-scrollbar-thumb {
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
.hide_header .code_area {
    height: 100% !important;
}

.delete-left-border {
    border-left: none !important;
}
.dark-sql {
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
</style>
