<template>
    <v-sheet v-html="sText" class="sheet-form" color="transparent"></v-sheet>
</template>

<script setup="setup" lang="ts" name="WorkSheet">
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
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { WIDTH_DEFAULT } from '../../components/header/constant';
import { getWindowOs } from '../../utils/utils';
import { postFileList, postMd } from '../../api/repository/api';
import setMermaid from '@/plugins/mermaid';
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);

interface PropsNoteData {
    pContents?: any;
    pType?: string;
}
const sText = ref<any>(null);

const props = defineProps<PropsNoteData>();

const cIsDarkMode = computed(() => store.getters.getDarkMode);

const init = async () => {
    if (props.pContents) {
        if (props.pType === 'mrk') {
            const sData = await postMd(props.pContents);
            sText.value = `<article class="${cIsDarkMode.value ? `markdown-body-dark` : `markdown-body-light`} markdown-body">${sData}</article>`;
        } else {
            sText.value = `<article class="${cIsDarkMode.value ? `markdown-body-dark` : `markdown-body-light`} markdown-body">${props.pContents}</article>`;
        }
    }

    nextTick(() => {
        setMermaid();
    });
};

onMounted(() => {
    init();
});
defineExpose({ init });
</script>

<style lang="scss">
@import '@/assets/md/md.css';
.sheet-form {
    ul,
    ol {
        list-style: revert;
    }
}
</style>
