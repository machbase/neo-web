<template>
    <div class="general-tab">
        <div class="first-col">
            <label for="_cfg_chart_title">Chart title</label>
            <div class="cfg-input">
                <input v-model="title" id="_cfg_chart_title" class="input" type="text" />
            </div>
        </div>
        <div class="col1"></div>
        <div class="col2">
            <label for="_cfg_zoom">Zoom</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="zoom" id="_cfg_zoom" type="checkbox" /></div>
                <input class="input" data-for="_cfg_zoom" readonly type="text" value="Use zoom when dragging" />
            </div>
            <div v-if="zoom">
                <label for="_cfg_drill">Drill down</label>
                <div class="cfg-input input-wrapper">
                    <div class="checkbox-wrapper"><input v-model="drillDown" id="_cfg_drill" type="checkbox" /></div>
                    <input class="input" data-for="_cfg_drill" readonly type="text" value="Use drill down when zooming" />
                </div>
            </div>
            <label for="_cfg_start">Start with Zoom</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="zoomStart" id="_cfg_start" type="checkbox" /></div>
                <input class="input" data-for="_cfg_start" readonly type="text" value="Start with Zoom." />
            </div>
        </div>
        <div class="col3">
            <label for="_cfg_raw_time_range">raw data time range (millisecond)</label>
            <div class="cfg-input">
                <input v-model="rawChart" id="_cfg_raw_time_range" class="input" style="width: 270px" type="text" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="GeneralTab">
import { defineEmits, ref, watchEffect, defineProps } from 'vue';
import { PanelInfo } from '@/interface/chart';

interface PropsTab {
    pChartData: PanelInfo;
}
const props = defineProps<PropsTab>();
const emit = defineEmits(['eOnChange']);

const title = ref<string>(props.pChartData.chart_title);
const width = ref<number | string>(props.pChartData.chart_width);
const height = ref<number>(props.pChartData.chart_height);
const actionIndex = ref<number>(props.pChartData.use_detail); // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
const detailCount = ref<number>(props.pChartData.detail_count || 0);
const detailRows = ref<number>(props.pChartData.detail_rows || 0);
const zoom = ref<boolean>(props.pChartData.use_zoom.toUpperCase() === 'Y');
const zoomStart = ref<boolean>(props.pChartData.start_with_vport.toUpperCase() === 'Y');
const drillDown = ref<boolean>(props.pChartData.drilldown_zoom.toUpperCase() === 'Y');
const normalize = ref<boolean>(props.pChartData?.use_normalize.toUpperCase() === 'Y');
// eslint-disable-next-line vue/no-setup-props-destructure
const gRawChartThreshold = props.pChartData?.raw_chart_threshold; // >1 : count, <1 : ratio of total count, =0 : total / count * 2, <0 : not use
const rawChart = ref<number>(gRawChartThreshold < 0 ? gRawChartThreshold * -1 : gRawChartThreshold);

const onChangeAction = (item: string) => {
    actionIndex.value = parseInt(item);
};
const actions = [
    { id: 0, name: 'No action' },
    { id: 1, name: 'Show Raw data chart' },
    { id: 2, name: 'Show Raw data table' },
];
watchEffect(() => {
    let raw_chart_threshold = rawChart.value;
    if (isNaN(raw_chart_threshold)) {
        raw_chart_threshold = 5000;
    } else if (raw_chart_threshold > 0) {
        raw_chart_threshold *= -1;
    }
    const data: Partial<PanelInfo> = {
        chart_title: title.value,
        chart_width: parseInt(width.value as any),
        chart_height: parseInt(height.value as any),
        use_detail: parseInt(actionIndex.value as any),
        detail_count: parseInt(detailCount.value as any),
        detail_rows: parseInt(detailRows.value as any),
        use_zoom: zoom.value ? 'Y' : 'N',
        drilldown_zoom: drillDown.value ? 'Y' : 'N',
        start_with_vport: zoomStart.value ? 'Y' : 'N',
        use_normalize: normalize.value ? 'Y' : 'N',
        raw_chart_threshold,
    };
    emit('eOnChange', data);
});
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
