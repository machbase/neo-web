<template>
    <v-sheet color="transparent" height="100%">
        <v-sheet class="popup__input-content" color="transparent" height="40px">
            <!-- <div>
                Slider
                <ComboboxSelect @e-on-change="(aValue) => handleSlider(aValue, true)" :p-data="sSliderList" :p-show-default-option="false" :p-value="sSlider" />
            </div> -->
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
            <v-sheet v-html="sText" class="tql-chart-form" color="transparent"></v-sheet>
            <v-sheet v-if="!sType" color="transparent">
                {{ sHtml }}
            </v-sheet>
        </v-sheet>
    </v-sheet>
</template>
<script setup="setup" lang="ts" name="Login">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';

import { defineProps, ref, computed, onMounted, defineExpose } from 'vue';
import { getTqlChart } from '../../api/repository/machiot';
import { store } from '../../store';
import showChart from '../../plugins/eChart';

const props = defineProps({
    pHeaders: {
        type: Array,
        default: [] as string[],
    },
    pSql: {
        type: String,
        default: [] as string[],
    },
    pType: {
        type: Array,
        default: [] as string[],
    },
});

const rBodyEl = ref();
const sHtml = ref();
const sType = ref();
const sText = ref();

const sXaxis = ref<string>(props.pHeaders[0]);
const sYaxis = ref<string>(props.pHeaders[1] ? props.pHeaders[1] : props.pHeaders[0]);

const sSlider = ref<string>('40, 60');
const sSliderList = ref([
    { id: 'none', name: 'none' },
    { id: '0, 100', name: '100%' },
    { id: '25, 75', name: '50%' },
    { id: '40, 60', name: '20%' },
    { id: '47.5, 52.5', name: '5%' },
]);

const cHeaderList = computed(() =>
    props.pHeaders.map((aItem: string) => {
        return { id: aItem, name: aItem };
    })
);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const handleSlider = (aValue: string) => {
    sSlider.value = aValue;
};
const handleXInfo = (aValue: string) => {
    sXaxis.value = aValue;
};
const handleYInfo = (aValue: string) => {
    sYaxis.value = aValue;
};

const getChartEl = async () => {
    sHtml.value = '';

    const sInput =
        'SQL(`' +
        props.pSql.replace(';', '').replaceAll('\n', ' ') +
        '`)\n' +
        'TAKE(5000)\n' +
        `CHART_LINE(xAxis(${cHeaderList.value.findIndex((aItem: { id: string; name: string }) => aItem.id === sXaxis.value)}, '${
            sXaxis.value
        }'), yAxis(${cHeaderList.value.findIndex((aItem: { id: string; name: string }) => aItem.id === sYaxis.value)}, '${sYaxis.value}'), ${
            sSlider.value === 'none' ? '' : `dataZoom('slider', 0, 100),`
        } size($w ?? '${rBodyEl.value.$el.clientWidth}px',$h ??'${rBodyEl.value.$el.clientHeight * 0.7}px'))`;

    const sResult = await getTqlChart(sInput);
    if (sResult.status >= 400) {
        sType.value = false;
        sHtml.value = sResult.data.reason;
    } else {
        sType.value = true;

        sHtml.value = sResult.data;
        let divScripts = document.getElementsByTagName('head')[0];

        let newScript = document.createElement('script');
        newScript.src = `/web/echarts/themes/${sHtml.value.theme === '-' ? `westeros` : sHtml.value.theme}.js`;

        if (divScripts) {
            divScripts.appendChild(newScript);
        }

        sText.value = ` <div class="chart_container">
            <div class="chart_item" id="${sHtml.value.chartID}" style="width:${sHtml.value.style.width};height:${sHtml.value.style.height};"></div>
        </div>`;

        setTimeout(() => {
            if (sHtml.value.chartOption && sHtml.value.chartOption.series[1]) {
                const sClientWidth = rBodyEl.value.$el.clientWidth;
                const sDataLength = sHtml.value.chartOption.series[1].data.length;
                sHtml.value.chartOption.dataZoom[0].start = 100 - (5 * sClientWidth) / sDataLength;
                sHtml.value.chartOption.dataZoom[0].end = 100;
            }

            showChart(sHtml.value);
        }, 100);
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
