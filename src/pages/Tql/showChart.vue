<template>
    <v-sheet color="transparent" height="100%">
        <v-sheet ref="rBodyEl" color="transparent" height="100%">
            <v-sheet v-html="sText" class="tql-chart-form" color="transparent"></v-sheet>
        </v-sheet>
    </v-sheet>
</template>
<script setup="setup" lang="ts" name="Login">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { defineProps, ref, defineEmits, computed, onMounted, defineExpose, nextTick } from 'vue';
import showChart from '@/plugins/eChart.ts';
import { store } from '../../store';
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const props = defineProps({
    pData: {
        type: Object,
        default: Object,
    },
});

const sText = ref();

const init = async () => {
    let divScripts = document.getElementsByTagName('head')[0];

    let newScript = document.createElement('script');
    newScript.src = `/web/echarts/themes/${props.pData.theme === '-' ? (cIsDarkMode.value ? 'dark' : 'white') : props.pData.theme}.js`;

    if (divScripts) {
        divScripts.appendChild(newScript);
    }

    sText.value = ` <div class="chart_container">
            <div class="chart_item" id="${props.pData.chartID}" style="width:${props.pData.style.width};height:${props.pData.style.height};"></div>
        </div>`;

    setTimeout(() => {
        showChart(props.pData);
    }, 100);
};
onMounted(() => {});
defineExpose({ init });
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
.tql-chart-form {
    justify-content: center;
    align-items: center;
}
</style>
<style>
.chart_container {
    margin-top: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.chart_item {
    margin: auto;
}
</style>
