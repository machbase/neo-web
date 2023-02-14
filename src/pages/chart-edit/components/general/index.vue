<template>
    <div class="general-tab">
        <div class="first-col">
            <label for="_cfg_chart_title">Chart title</label>
            <div class="cfg-input">
                <input id="_cfg_chart_title" type="text" class="input" />
            </div>
            <label for="_cfg_chart_width">Width</label>
            <div class="cfg-input">
                <input id="_cfg_chart_width" type="text" class="input" />
            </div>
            <label for="_cfg_chart_height">Height</label>
            <div class="cfg-input">
                <input id="_cfg_chart_height" type="text" class="input" />
            </div>
        </div>
        <div class="col1">
            <label for="_cfg_chart_action">Action on click</label>
            <div class="select-div cfg-input">
                <ComboboxSelect style="width: 250px" class="select" :p-show-default-option="false" :p-data="actions" :p-value="'1'" @e-on-change="onChangeAction" />
            </div>
            <div v-if="actionIndex === 2">
                <label for="_cfg_chart_table_limit">Raw data table limits</label>
                <div class="cfg-input">
                    <input id="_cfg_chart_table_limit" type="text" class="input" />
                </div>
                <label for="_cfg_chart_row">Rows per page</label>
                <div class="cfg-input">
                    <input id="_cfg_chart_row" type="text" class="input" />
                </div>
            </div>
        </div>
        <div class="col2">
            <label for="_cfg_zoom">Zoom</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_zoom" v-model="zoom" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_zoom" value="Use zoom when dragging" readonly />
            </div>
            <div v-if="zoom">
                <label for="_cfg_drill">Drill down</label>
                <div class="cfg-input">
                    <span class="input"><input id="_cfg_drill" v-model="drillDown" type="checkbox" /></span>
                    <input type="text" class="input" data-for="_cfg_drill" value="Use drill down when zooming" readonly />
                </div>
            </div>
            <label for="_cfg_start">Start with Zoom</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_start" v-model="zoomStart" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_start" value="Start with Zoom." readonly />
            </div>
        </div>
        <div class="col3">
            <label for="_cfg_normalize">Normalize</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_normalize" v-model="normalize" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_normalize" value="Adjusted values to a common scale" readonly />
            </div>
            <label for="_cfg_raw_time_range">raw data time range (millisecond)</label>
            <div class="cfg-input">
                <input id="_cfg_raw_time_range" type="text" class="input1" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="GeneralTab">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { computed, defineEmits, reactive, ref, watch } from 'vue';
const actionIndex = ref<number>(1);
const zoom = ref<boolean>(true);
const zoomStart = ref<boolean>(true);
const drillDown = ref<boolean>(true);
const normalize = ref<boolean>(true);

const onChangeAction = (item: string) => {
    actionIndex.value = parseInt(item);
};
const actions = [
    { id: 0, name: 'No action' },
    { id: 1, name: 'Show Raw data chart' },
    { id: 2, name: 'Show Raw data table' },
];
</script>
<style lang="scss" scoped>
@import 'index.scss';
</style>
