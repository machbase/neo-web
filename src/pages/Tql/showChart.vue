<template>
    <v-sheet color="transparent" height="100%">
        <v-sheet ref="rBodyEl" color="transparent" height="100%">
            <iframe v-if="pHtml" ref="iframeDom" id="iframeMapViewComponent" frameborder="0" height="100%" :srcdoc="pHtml" width="100%"></iframe>
        </v-sheet>
    </v-sheet>
</template>
<script setup="setup" lang="ts" name="Login">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';

import { defineProps, ref, defineEmits, computed, onMounted, defineExpose } from 'vue';

const props = defineProps({
    pHeaders: {
        type: [],
        default: [] as any[],
    },
    pHtml: {
        type: String,
    },
});

const rBodyEl = ref();
const sHtml = ref();

const sXaxis = ref<string>(props.pHeaders[1]);
const sYaxis = ref<string>(props.pHeaders[2]);

const cHeaderList = computed(() =>
    props.pHeaders.map((aItem: string) => {
        return { id: aItem, name: aItem };
    })
);
const handleXInfo = (aValue: string) => {
    sXaxis.value = aValue;
};
const handleYInfo = (aValue: string) => {
    sYaxis.value = aValue;
};
</script>
<style lang="scss" scoped>
.popup__input-content {
    display: flex;
    justify-content: end;
    padding: 4px 8px;
    align-items: center;
    .combobox-select {
        margin: 0 4px;
    }
    div {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        margin-right: 8px;
    }
}
</style>
