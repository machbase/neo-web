<template>
    <div class="display-wrapper">
        <div class="chart-type-wrapper"><span>Chart Type</span><ChartSelect @e-on-change="onSelectChart" class="chart-type-div" :is-row="false" :p-data="chartTypeMapped" /></div>
        <div class="input-col2">
            <label for="_cfg_show_point">Show data points</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="showPoint" id="_cfg_show_point" type="checkbox" /></div>
                <input class="input" data-for="_cfg_show_point" readonly type="text" value="Display data points in the line chart." />
            </div>
            <label for="_cfg_point_radius">Point radius</label>
            <div class="cfg-input">
                <input v-model="pointRadius" id="_cfg_point_radius" class="input point_radius_input" type="text" />
            </div>
            <label for="_cfg_show_bottom_legend">Legend</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="showLegend" id="_cfg_show_bottom_legend" type="checkbox" /></div>
                <input class="input" data-for="_cfg_show_bottom_legend" readonly type="text" value="Display legend." />
            </div>
        </div>
        <div class="input-col2">
            <label for="_cfg_fill">Opacity of fill area</label>
            <div class="cfg-input">
                <input v-model="fillOpacity" id="_cfg_fill" class="input point_radius_input" type="text" />
            </div>
            <label for="_cfg_stroke">Line thickness</label>
            <div class="cfg-input">
                <input v-model="lineThick" id="_cfg_stroke" class="input point_radius_input" type="text" />
            </div>
            <!-- <label for="_cfg_border_color">Border color</label>
            <div class="cfg-input">
                <input v-model="colorBorder" id="_cfg_border_color" class="input point_radius_input" type="text" />
            </div> -->
        </div>
    </div>
</template>

<script setup lang="ts" name="DisplayTab">
import ChartSelect from '@/components/common/chart-select/index.vue';
import { ChartType } from '@/enums/app';
import { defineEmits, ref, watchEffect, defineProps } from 'vue';
import { PanelInfo } from '@/interface/chart';

interface PropsTab {
    pChartData: PanelInfo;
}
const props = defineProps<PropsTab>();
const mapToPropsChartSelect: any = {
    line: ChartType.Line,
    areaLine: ChartType.Zone,
    pointLine: ChartType.Dot,
};

const emit = defineEmits(['eOnChange']);

const chartTypeMapped = mapToPropsChartSelect[props.pChartData.chart_type];
const colorBorder = ref<string>(props.pChartData.border_color.toUpperCase() || '');
const showPoint = ref<boolean>(props.pChartData.show_point.toUpperCase() == 'Y');
const showLegend = ref<boolean>(props.pChartData.show_legend.toUpperCase() == 'B');
const fillOpacity = ref<number>(props.pChartData.fill || 0);
const lineThick = ref<number>(props.pChartData.stroke || 0);
const chartType = ref<ChartType>(ChartType.Zone);
const pointRadius = ref<number>(props.pChartData.point_radius || 0);

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
