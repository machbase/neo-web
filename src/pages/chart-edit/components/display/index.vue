<template>
    <div class="display-wrapper">
        <div class="chart-type-wrapper"><span>Chart Type</span><ChartSelect class="chart-type-div" :is-row="false" @e-on-change="onSelectChart" /></div>
        <div class="input-col2">
            <label for="_cfg_show_point">Show data points</label>
            <div class="cfg-input">
                <span class="input"><input v-model="showPoint" id="_cfg_show_point" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_show_point" value="Display data points in the line chart." readonly />
            </div>
            <label for="_cfg_point_radius">Point radius</label>
            <div class="cfg-input">
                <input id="_cfg_point_radius" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_show_bottom_legend">Legend</label>
            <div class="cfg-input">
                <span class="input"><input v-model="showLegend" id="_cfg_show_bottom_legend" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_show_bottom_legend" value="Display legend." readonly />
            </div>
        </div>
        <div class="input-col2">
            <label for="_cfg_fill">Opacity of fill area</label>
            <div class="cfg-input">
                <input v-model="fillOpacity" id="_cfg_fill" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_stroke">Line thickness</label>
            <div class="cfg-input">
                <input v-model="lineThick" id="_cfg_stroke" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_border_color">Border color</label>
            <div class="cfg-input">
                <input id="_cfg_border_color" type="text" class="input point_radius_input" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="DisplayTab">
import ChartSelect from '@/components/common/chart-select/index.vue';
import { ChartType } from '@/enums/app';
import { computed, defineEmits, reactive, ref, watch } from 'vue';
const showPoint = ref<boolean>(false);
const showLegend = ref<boolean>(true);
const fillOpacity = ref<string>();
const lineThick = ref<string>();
const chartType = ref<ChartType>(ChartType.Zone);
const onSelectChart = (data: ChartType) => {
    console.log(data, 'data');
    if (data === ChartType.Dot) {
        showPoint.value = true;
        fillOpacity.value = '0';
        lineThick.value = '0';
    } else if (data === ChartType.Zone) {
        showPoint.value = false;
    } else {
        lineThick.value = '0';
    }
    chartType.value = data;
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
