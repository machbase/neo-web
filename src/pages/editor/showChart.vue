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
            <iframe v-if="sType && sHtml" ref="iframeDom" id="iframeMapViewComponent" frameborder="0" height="100%" scrolling="no" :srcdoc="sHtml" width="100%"></iframe>
            <v-sheet v-if="!sType" color="transparent">
                {{ sHtml }}
            </v-sheet>
        </v-sheet>
    </v-sheet>
</template>
<script setup="setup" lang="ts" name="Login">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';

import { defineProps, ref, defineEmits, computed, onMounted, defineExpose } from 'vue';
import { getTqlChart } from '../../api/repository/machiot';

const props = defineProps({
    pHeaders: {
        type: [],
        default: [] as any[],
    },
    pSql: {
        type: String,
    },
    pType: {
        type: [],
    },
});

const rBodyEl = ref();
const sHtml = ref();
const sType = ref();

const sXaxis = ref<string>(props.pHeaders[0]);
const sYaxis = ref<string>(props.pHeaders[1] ? props.pHeaders[1] : props.pHeaders[0]);

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

    const sInput =
        'INPUT(SQL(`' +
        props.pSql.replace(';', '').replaceAll('\n', ' ') +
        '`))\n' +
        'TAKE(5000)\n' +
        `OUTPUT(CHART_LINE(xAxis(${cHeaderList.value.findIndex((aItem: { id: string; name: string }) => aItem.id === sXaxis.value)}, '${
            sXaxis.value
        }'), yAxis(${cHeaderList.value.findIndex((aItem: { id: string; name: string }) => aItem.id === sYaxis.value)}, '${
            sYaxis.value
        }'), dataZoom('slider', 35, 65), size($w ?? '${rBodyEl.value.$el.clientWidth}px',$h ??'${rBodyEl.value.$el.clientHeight * 0.7}px')))`;

    const sResult = await getTqlChart(sInput);
    if (sResult.status >= 400) {
        sType.value = false;
        sHtml.value = sResult.data.reason;
    } else {
        sType.value = true;

        sHtml.value = sResult.data;
    }
};
onMounted(async () => {
    if (props.pType && props.pType.length <= 1 && props.pType[0] === 'string') {
        //
    } else if (props.pType.length > 0) getChartEl();
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
