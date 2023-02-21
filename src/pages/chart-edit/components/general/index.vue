<template>
    <div class="general-tab">
        <div class="first-col">
            <label for="_cfg_chart_title">Chart title</label>
            <div class="cfg-input">
                <input id="_cfg_chart_title" v-model="title" type="text" class="input" />
            </div>
            <label for="_cfg_chart_width">Width</label>
            <div class="cfg-input">
                <input id="_cfg_chart_width" v-model="width" type="text" class="input" />
            </div>
            <label for="_cfg_chart_height">Height</label>
            <div class="cfg-input">
                <input id="_cfg_chart_height" v-model="height" type="text" class="input" />
            </div>
        </div>
        <div class="col1">
            <label for="_cfg_chart_action">Action on click</label>
            <div class="cfg-input">
                <ComboboxSelect
                    style="width: 250px"
                    class="select input"
                    :p-show-default-option="false"
                    :p-data="actions"
                    :p-value="actionIndex.toString()"
                    @e-on-change="onChangeAction"
                />
            </div>
            <div v-if="actionIndex === 2">
                <label for="_cfg_chart_table_limit">Raw data table limits</label>
                <div class="cfg-input">
                    <input id="_cfg_chart_table_limit" style="width: 250px" v-model="detailRows" type="text" class="input" />
                </div>
                <label for="_cfg_chart_row">Rows per page</label>
                <div class="cfg-input">
                    <input id="_cfg_chart_row" style="width: 250px" type="text" class="input" />
                </div>
            </div>
        </div>
        <div class="col2">
            <label for="_cfg_zoom">Zoom</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input id="_cfg_zoom" v-model="zoom" type="checkbox" /></div>
                <input type="text" class="input" data-for="_cfg_zoom" value="Use zoom when dragging" readonly />
            </div>
            <div v-if="zoom">
                <label for="_cfg_drill">Drill down</label>
                <div class="cfg-input input-wrapper">
                    <div class="checkbox-wrapper"><input id="_cfg_drill" v-model="drillDown" type="checkbox" /></div>
                    <input type="text" class="input" data-for="_cfg_drill" value="Use drill down when zooming" readonly />
                </div>
            </div>
            <label for="_cfg_start">Start with Zoom</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input id="_cfg_start" v-model="zoomStart" type="checkbox" /></div>
                <input type="text" class="input" data-for="_cfg_start" value="Start with Zoom." readonly />
            </div>
        </div>
        <div class="col3">
            <label for="_cfg_normalize">Normalize</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input id="_cfg_normalize" v-model="normalize" type="checkbox" /></div>
                <input type="text" class="input" data-for="_cfg_normalize" value="Adjusted values to a common scale" readonly />
            </div>
            <label for="_cfg_raw_time_range">raw data time range (millisecond)</label>
            <div class="cfg-input">
                <input id="_cfg_raw_time_range" v-model="rawChart" type="text" style="width: 270px" class="input" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="GeneralTab">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { computed, defineEmits, reactive, ref, watch, watchEffect } from 'vue';
import { useStore } from '@/store';
import { useRoute } from 'vue-router';
import { PanelInfo, TagSet } from '@/interface/chart';

const emit = defineEmits(['eOnChange']);
const store = useStore();
const route = useRoute();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const chartSelected = CPanels.value[route.params.id as any];

const title = ref<string>(chartSelected[0].chart_title);
const width = ref<number>(chartSelected[0].chart_width);
const height = ref<number>(chartSelected[0].chart_height);
const actionIndex = ref<number>(chartSelected[0].use_detail || 1); // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
const detailCount = ref<number>(chartSelected[0].detail_count || 0);
const detailRows = ref<number>(chartSelected[0].detail_rows || 0);
const zoom = ref<boolean>(chartSelected[0].use_zoom.toUpperCase() == 'Y');
const zoomStart = ref<boolean>(chartSelected[0].start_with_vport.toUpperCase() == 'Y');
const drillDown = ref<boolean>(chartSelected[0].drilldown_zoom.toUpperCase() == 'Y');
const normalize = ref<boolean>(chartSelected[0]?.use_normalize.toUpperCase() == 'Y');
let gRawChartThreshold = chartSelected[0]?.raw_chart_threshold; // >1 : count, <1 : ratio of total count, =0 : total / count * 2, <0 : not use
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
        chart_width: width.value,
        chart_height: height.value,
        use_detail: actionIndex.value,
        detail_count: detailCount.value,
        detail_rows: detailRows.value,
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
