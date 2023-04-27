<template>
    <!-- theme="vs" -->
    <DragRow width="100%" height="100%">
        <template #top>
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
                        <button @click="copyData"><v-icon color="#ffffff">mdi-content-copy</v-icon></button>
                        <button @click="getButtonData"><v-icon color="#ffffff">mdi-play</v-icon></button>
                    </div>
                </div>

                <CodeEditor
                    ref="text"
                    v-model="sCode"
                    hide_header
                    theme=""
                    :languages="sLang"
                    width="100%"
                    height="100%"
                    min_height="100%"
                    border_radius="0"
                    @keydown.ctrl="sFreshCtrl = true"
                    @keyup.ctrl="sFreshCtrl = false"
                    @keydown.enter="setSQL($event)"
                />
            </div>
        </template>
        <template #bottom>
            <!-- your content -->
            <Table :items="sData" :headers="sHeader" class="" @UpdateItems="UpdateItems" />
        </template>
    </DragRow>

    <!-- <button :onClick="handleRun">run</button> -->
</template>

<script setup lang="ts" name="Editor">
import CodeEditor from 'simple-code-editor';
import Table from './Table.vue';
// import base style

// import more codemirror resource...

import { ref, defineEmits, defineProps, computed, onMounted } from 'vue';
import { store } from '../../store';
import { fetchData } from '../../api/repository/machiot';
import { copyText } from 'vue3-clipboard';
import { DragCol, DragRow, ResizeCol, ResizeRow, Resize } from 'vue-resizer';

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sLang = [['SQL', 'MACHBASE']];
const sCode = ref<string>(`SELECT * FROM TAG; 
SELECT NAME
FROM TAG
WHERE NAME = 1;`);

const sFreshCtrl = ref<boolean>(false);

let sData = ref<any>([]);
let sHeader = ref<any>([]);
let currentPage = ref<number>(1);
let sSql = ref<string>('');

const UpdateItems = () => {
    const sLimit = sSql.value.indexOf('limit'.toLowerCase());
    currentPage.value++;
    if (sLimit === -1) getSQLData();
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

const setSQL = async (event: any, aType?: string) => {
    const sPointer = event.target.selectionStart === 0 ? event.target.selectionStart : event.target.selectionStart - 1;

    const splitValue = sCode.value.split(';');

    const realValue = splitValue.map((aItem: string) => {
        return aItem + ';';
    });

    sSql.value = realValue.filter((aItem: string) => {
        const sStartIdx = sCode.value.indexOf(aItem);
        const sEndIdx = sStartIdx + aItem.length - 1;
        if (sStartIdx <= sPointer && sPointer <= sEndIdx && aItem !== undefined) return aItem;
    })[0];

    handleChange();
};

const getButtonData = async () => {
    const selectText = window.getSelection()?.toString();
    if (!selectText) {
        alert('Drag the query you want to send.');
    }
    currentPage.value = 1;
    sData.value = [];

    if (selectText) {
        const sLimit = selectText.indexOf('limit'.toLowerCase());
        sSql.value = selectText;
        const sResult: any = await fetchData(selectText.replace(';', ''), sLimit === -1 ? currentPage.value : '');
        if (sResult && sResult.success) {
            sHeader.value = sResult.data.columns;
            sResult.data.rows.forEach((aItem: any) => {
                sData.value.push(aItem);
            });
        }
    }
};

const handleChange = async () => {
    if (sFreshCtrl.value === true) {
        currentPage.value = 1;
        sData.value = [];
        getSQLData();
    }
};

const getSQLData = async () => {
    const sLimit = sSql.value.indexOf('limit'.toLowerCase());

    const sResult: any = await fetchData(sSql.value.replaceAll(/\n/g, ' ').replace(';', ''), sLimit === -1 ? currentPage.value : '');
    if (sResult && sResult.success) {
        sHeader.value = sResult.data.columns;
        sResult.data.rows.forEach((aItem: any) => {
            sData.value.push(aItem);
        });
    }
};
</script>

<style scoped>
.editor-header {
    display: flex;
    font-size: 12px;
    position: relative;
    z-index: 2;
    height: 34px;
    box-sizing: border-box;
    /* padding: 0px 20px 0px 20px; */
    justify-content: space-between;
    align-items: end;
}
</style>

<style lang="scss">
.drager_top div {
    overflow: auto !important;
}
.drager_bottom div {
    overflow: auto !important;
}
.hide_header .code_area {
    height: 100% !important;
    // padding: 0px 20px 20px 20px !important;
    // padding-top: 0px !important;
}

.dark-sql {
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
}
.white-sql {
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
