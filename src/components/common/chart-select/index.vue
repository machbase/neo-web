<template>
    <div class="chart-select-wrapper" :style="{ flexDirection: props.isRow ? 'row' : 'column' }">
        <label>
            <input @click="() => onClick(ChartType.Zone)" :checked="props.pData === ChartType.Zone" name="test" type="radio" />
            <img alt="Option 1" :height="props.isRow ? undefined : '48'" :src="cIsDarkMode ? i_b_graph_1 : i_w_graph_1" :width="props.isRow ? '86' : '130'" />
        </label>
        <label>
            <input @click="() => onClick(ChartType.Dot)" :checked="props.pData === ChartType.Dot" name="test" type="radio" />
            <img alt="Option 2" :height="props.isRow ? undefined : '48'" :src="cIsDarkMode ? i_b_graph_2 : i_w_graph_2" :width="props.isRow ? '86' : '130'" />
        </label>
        <label>
            <input @click="() => onClick(ChartType.Line)" :checked="props.pData === ChartType.Line" name="test" type="radio" />
            <img alt="Option 3" :height="props.isRow ? undefined : '48'" :src="cIsDarkMode ? i_b_graph_3 : i_w_graph_3" :width="props.isRow ? '86' : '130'" />
        </label>
    </div>
</template>

<script setup lang="ts" name="ChartSelect">
import i_b_graph_1 from '@/assets/image/i_b_graph_1.png';
import i_w_graph_1 from '@/assets/image/i_w_graph_1.png';
import i_b_graph_2 from '@/assets/image/i_b_graph_2.png';
import i_w_graph_2 from '@/assets/image/i_w_graph_2.png';
import i_b_graph_3 from '@/assets/image/i_b_graph_3.png';
import i_w_graph_3 from '@/assets/image/i_w_graph_3.png';
import { defineProps, defineEmits, withDefaults, computed } from 'vue';
import { useStore } from '../../../store';
import { ChartType } from '@/enums/app';
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
interface ChartSelectProps {
    isRow: boolean;
    pData?: ChartType;
}
const props = withDefaults(defineProps<ChartSelectProps>(), {
    isRow: true,
    pData: ChartType.Zone,
});
const emit = defineEmits(['eOnChange']);
const onClick = (data: ChartType) => {
    emit('eOnChange', data);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
