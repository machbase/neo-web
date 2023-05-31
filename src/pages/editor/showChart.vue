<template>
    <v-sheet color="transparent" height="100%">
        <v-sheet class="popup__input-content" color="transparent" height="40px">
            <div>
                X axis
                <ComboboxSelect @e-on-change="(aValue) => handleXInfo(aValue, true)" :p-data="cHeaderList" :p-show-default-option="false" :p-value="sXaxis" />
            </div>
            <div>
                Y axis
                <ComboboxSelect @e-on-change="(aValue) => handleYInfo(aValue, true)" :p-data="cHeaderList" :p-show-default-option="false" :p-value="sYaxis" />
            </div>
            <v-btn @click="getChartEl" density="comfortable" icon="mdi-play" size="24px" variant="plain"></v-btn>
        </v-sheet>

        <v-sheet ref="rBodyEl" color="transparent" height="calc(100% - 40px)">
            <iframe v-if="sHtml" ref="iframeDom" id="iframeMapViewComponent" frameborder="0" height="100%" scrolling="no" :srcdoc="sHtml" width="100%"></iframe>
        </v-sheet>
    </v-sheet>
</template>
<script setup="setup" lang="ts" name="Login">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';

import { defineProps, ref, defineEmits, computed, onMounted, defineExpose } from 'vue';
import { getChartElement } from '../../api/repository/machiot';

const props = defineProps({
    pHeaders: {
        type: [],
        default: [] as any[],
    },
    pSql: {
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

const getChartEl = async () => {
    sHtml.value = '';
    const sVertical = localStorage.getItem('vertical');
    const sInput = `INPUT( SQL('${props.pSql.replace(';', '')} limit 5000') )`;
    const sOutput = `OUTPUT(CHART_LINE(xaxis(1, '${sXaxis.value}'), yaxis(2, '${sYaxis.value}'), dataZoom('slider', 40, 60), seriesLabels('${sXaxis.value}', '${sYaxis.value}'), size($width, $height)))`;
    if (sVertical === 'true') {
        sHtml.value = await getChartElement(sInput, sOutput, rBodyEl.value.$el.clientWidth, rBodyEl.value.$el.clientHeight * 0.7);
    } else {
        sHtml.value = await getChartElement(sInput, sOutput, rBodyEl.value.$el.clientWidth, rBodyEl.value.$el.clientHeight * 0.7);
    }
};
onMounted(async () => {
    window.addEventListener('resize', getChartEl);
    getChartEl();
});

defineExpose({ getChartEl });
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
