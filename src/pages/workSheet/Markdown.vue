<template>
    <v-sheet v-html="sText" class="mrk-form" color="transparent"></v-sheet>
</template>

<script setup="setup" lang="ts" name="WorkSheet">
import { ref, computed, defineProps, onMounted } from 'vue';
import { store } from '../../store';
import { postMd } from '../../api/repository/api';

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
            const sData = await postMd(props.pContents, cIsDarkMode.value);
            sText.value = `<article class="${cIsDarkMode.value ? `markdown-body-dark` : `markdown-body-light`} markdown-body">${sData}</article>`;
        } else {
            sText.value = `<article class="${cIsDarkMode.value ? `markdown-body-dark` : `markdown-body-light`} markdown-body">${props.pContents}</article>`;
        }
    }
};

onMounted(() => {
    init();
});
defineExpose({ init });
</script>

<style lang="scss">
@import '@/assets/md/md.css';
.mrk-form {
    display: flex;
    width: 100%;
    position: relative;
    ul,
    ol {
        list-style: revert;
    }
}
</style>
