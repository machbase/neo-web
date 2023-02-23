<template>
    <div class="display-wrapper">
        <div class="chart-type-wrapper"><span>Chart Type</span><ChartSelect class="chart-type-div" :is-row="false" :p-data="chartTypeMapped" @e-on-change="onSelectChart" /></div>
        <div class="input-col2">
            <label for="_cfg_show_point">Show data points</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input id="_cfg_show_point" v-model="showPoint" type="checkbox" /></div>
                <input type="text" class="input" data-for="_cfg_show_point" value="Display data points in the line chart." readonly />
            </div>
            <label for="_cfg_point_radius">Point radius</label>
            <div class="cfg-input">
                <input id="_cfg_point_radius" v-model="pointRadius" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_show_bottom_legend">Legend</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input id="_cfg_show_bottom_legend" v-model="showLegend" type="checkbox" /></div>
                <input type="text" class="input" data-for="_cfg_show_bottom_legend" value="Display legend." readonly />
            </div>
        </div>
        <div class="input-col2">
            <label for="_cfg_fill">Opacity of fill area</label>
            <div class="cfg-input">
                <input id="_cfg_fill" v-model="fillOpacity" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_stroke">Line thickness</label>
            <div class="cfg-input">
                <input id="_cfg_stroke" v-model="lineThick" type="text" class="input point_radius_input" />
            </div>
            <label for="_cfg_border_color">Border color</label>
            <div class="cfg-input">
                <input id="_cfg_border_color" v-model="colorBorder" type="text" class="input point_radius_input" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="DisplayTab">
import ChartSelect from '@/components/common/chart-select/index.vue';
import { ChartType } from '@/enums/app';
import { computed, defineEmits, reactive, ref, watch, watchEffect } from 'vue';
import { useStore } from '@/store';
import { useRoute } from 'vue-router';
import { PanelInfo, TagSet } from '@/interface/chart';

const mapToPropsChartSelect: any = {
    line: ChartType.Line,
    areaLine: ChartType.Zone,
    pointLine: ChartType.Dot,
};

const emit = defineEmits(['eOnChange']);
const store = useStore();
const route = useRoute();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const chartSelected = CPanels.value[route.params.id as any];

const chartTypeMapped = mapToPropsChartSelect[chartSelected[0].chart_type];
const colorBorder = ref<string>(chartSelected[0].border_color.toUpperCase() || '');
const showPoint = ref<boolean>(chartSelected[0].show_point.toUpperCase() == 'Y');
const showLegend = ref<boolean>(chartSelected[0].show_legend.toUpperCase() == 'B');
const fillOpacity = ref<number>(chartSelected[0].fill || 0);
const lineThick = ref<number>(chartSelected[0].stroke || 0);
const chartType = ref<ChartType>(ChartType.Zone);
const pointRadius = ref<number>(chartSelected[0].point_radius || 0);

const onSelectChart = (data: ChartType) => {
    chartType.value = data;
    if (data === ChartType.Dot) {
        showPoint.value = true;
        fillOpacity.value = 0;
        lineThick.value = 0;
    } else if (data === ChartType.Zone) {
        showPoint.value = false;
        lineThick.value = 1;
        fillOpacity.value = 0.15;
    } else {
        showPoint.value = true;
        lineThick.value = 1;
        fillOpacity.value = 0;
    }
};
const mapChartType = {
    [ChartType.Line]: 'line',
    [ChartType.Zone]: 'area',
    [ChartType.Dot]: 'line',
};
watchEffect(() => {
    let border_color = colorBorder.value.trim().toLowerCase();
    if (border_color == 'none') {
        border_color = 'NONE';
    } else if (border_color.slice(0, 1) == '#') {
        border_color = border_color.slice(1);
    }
    const chart_type = mapChartType[chartType.value];
    const data: Partial<PanelInfo> = {
        chart_type,
        show_point: showPoint.value ? 'Y' : 'N',
        point_radius: isNaN(pointRadius.value) ? 3 : parseFloat(pointRadius.value as any),
        show_legend: showLegend.value ? 'B' : 'N',
        fill: isNaN(fillOpacity.value) ? 0.15 : parseFloat(fillOpacity.value as any),
        stroke: isNaN(lineThick.value) ? 1.5 : parseFloat(lineThick.value as any),
        border_color,
    };
    emit('eOnChange', data);
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
