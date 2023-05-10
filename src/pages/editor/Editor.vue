<template>
    <!-- theme="vs" -->
    <DragCol height="100%" slider-bg-color="#202020" width="100%">
        <template #left>
            <!-- your content -->
            <div :class="cIsDarkMode ? 'dark-sql' : 'white-sql'">
                <!-- <MonacoEditor
            v-model:value="editorStr"
            theme="vs"
            :options="options"
            language="javascript"
            :width="800"
            :height="600"
            @change="handleChange(value)"
            @mouseup="handleSelectText"
        /> -->
                <!-- hide_header -->
                <div class="editor-header">
                    <div class="header-toggle">MACHBASE</div>
                    <div class="header-btn-list">
                        <v-btn @click="copyData" density="comfortable" icon="mdi-content-copy" size="36px" variant="plain"></v-btn>
                        <v-btn @click="getButtonData" density="comfortable" icon="mdi-play" size="36px" variant="plain"></v-btn>
                    </div>
                </div>
                <CodeEditor
                    v-model="gBoard.code"
                    ref="text"
                    @keydown.enter="setSQL($event)"
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
            <!-- your content -->
            <!-- <v-sheet color="transparent" height="10%" width="100%"> -->

            <v-sheet class="tab-list" color="#202020" fixed-tabs height="40px">
                <button
                    @click="changeTabMode('table')"
                    :style="sTab === 'table' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                >
                    <div>
                        <v-icon>mdi-table</v-icon>
                        TABLE
                    </div>
                </button>
                <button
                    @click="changeTabMode('log')"
                    :style="sTab === 'log' ? (cIsDarkMode ? { backgroundColor: '#121212' } : { backgroundColor: '#ffffff', color: '#121212' }) : { backgroundColor: '#202020' }"
                >
                    <div>
                        <v-icon>mdi-information</v-icon>

                        LOG
                    </div>
                </button>
            </v-sheet>
            <!-- </v-sheet> -->

            <Table v-show="sTab === 'table'" @UpdateItems="UpdateItems" :headers="sHeader" :items="sData" />

            <v-sheet v-show="sTab === 'log'" class="log-form" color="transparent" height="calc(100% - 40px)">
                <div v-for="(aLog, aIdx) in sLogField" :key="aIdx" :style="{ color: aLog.color }">
                    {{ aLog.query }}
                    <!-- {{ aLog.query }} -->
                </div>
            </v-sheet>
        </template>
    </DragCol>

    <!-- <button :onClick="handleRun">run</button> -->
</template>

<script setup lang="ts" name="Editor">
import CodeEditor from 'simple-code-editor';
import Table from './Table.vue';
// import base style

// import more codemirror resource...

import { ref, watch, defineEmits, defineProps, computed, onMounted } from 'vue';
import { store } from '../../store';
import { fetchData } from '../../api/repository/machiot';
import { copyText } from 'vue3-clipboard';
import { DragCol, DragRow, ResizeCol, ResizeRow, Resize } from 'vue-resizer';
import { MutationTypes } from '../../store/mutations';
interface PropsNoteData {
    pPanelData: boolean;
}

const props = defineProps<PropsNoteData>();

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sLang = [['SQL', 'MACHBASE']];

const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});

let sData = ref<any>([]);
let sHeader = ref<any>([]);
let currentPage = ref<number>(1);
let sSql = ref<string>('');

let sTab = ref<string>('table');

let sLogField = ref<{ query: string; color: string }[]>([]);
const gTableList = computed(() => store.state.gTableList);

const changeTab = (aItem: string) => {
    sTab.value = aItem;
};
const UpdateItems = () => {
    const sLimit = sSql.value.toLowerCase().indexOf('limit'.toLowerCase());
    currentPage.value++;
    if (sLimit === -1) getSQLData();
};
const changeTabMode = (aItem: string) => {
    sTab.value = aItem;
};

const copyData = () => {
    const selectText = window.getSelection()?.toString();
    if (!selectText) {
        alert('Drag the query you want to send.');
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

    handleChange(event.ctrlKey);
};

const getButtonData = async () => {
    const selectText = window.getSelection()?.toString();
    if (!selectText) {
        alert('Drag the query you want to send.');
        return;
    }
    currentPage.value = 1;
    sData.value = [];

    if (selectText) {
        const sLimit = selectText.toLowerCase().indexOf('limit'.toLowerCase());
        sSql.value = selectText;
        const sResult: any = await fetchData(selectText.replace(';', ''), sLimit === -1 ? currentPage.value : '');
        if (sResult.status >= 400) {
            changeTab('log');
            sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.data.reason, color: '#a85400' });
        }
        if (sResult && sResult.success) {
            // sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '') + ' : ' + sResult.reason, color: '' });
            console.log(sResult.reason);
            if (sResult.reason === 'executed.') {
                sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason, color: '#rgb(31,123,246)' });

                changeTab('log');
            } else {
                sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason, color: '' });

                changeTab('table');
                sHeader.value = sResult.data.columns;
                sResult.data.rows.forEach((aItem: any) => {
                    sData.value.push(aItem);
                });
            }
        }
    }
};

const handleChange = async (aKeyPress: boolean) => {
    if (aKeyPress) {
        currentPage.value = 1;
        sData.value = [];
        getSQLData();
    }
};

const getSQLData = async () => {
    const sLimit = sSql.value.toLowerCase().indexOf('limit'.toLowerCase());
    const sResult: any = await fetchData(sSql.value.replaceAll(/\n/g, ' ').replace(';', ''), sLimit === -1 ? currentPage.value : '');

    if (sResult.status >= 400) {
        changeTab('log');
        sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.data.reason, color: '#a85400' });
    }
    if (sResult && sResult.success) {
        console.log(sResult.reason);
        if (sResult.reason === 'executed.') {
            sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason, color: '#217DF8' });

            changeTab('log');
        } else {
            sLogField.value.push({ query: sSql.value.replaceAll(/\n/g, ' ').replace(';', '').toUpperCase() + ' : ' + sResult.reason, color: '' });

            changeTab('table');
            sHeader.value = sResult.data.columns;
            sResult.data.rows.forEach((aItem: any) => {
                sData.value.push(aItem);
            });
        }
    }
};

onMounted(async () => {
    gBoard.value.code = `select * from ${gTableList.value[0]};`;
    sSql.value = gBoard.value.code;
    sLogField.value.push({ query: 'The connection is complete.', color: '#217DF8' });
    await getSQLData();
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
    align-items: end;
}
</style>

<style lang="scss">
@import 'index.scss';

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
    // padding: 0px 20px 20px 20px !important;
    // padding-top: 0px !important;
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
        background-color: #383838;
        color: #a8a8a8;
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
        background-color: #c4c4c4;
        color: #545454;
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
