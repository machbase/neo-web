<template>
    <div class="chart-select-wrapper" :style="{ flexDirection: props.isRow ? 'row' : 'column' }">
        <label>
            <input @click="() => onClick(ChartType.Zone)" type="radio" name="test" checked />
            <img :src="cIsDarkMode ? i_b_graph_1 : i_w_graph_1" alt="Option 1" />
        </label>
        <label>
            <input @click="() => onClick(ChartType.Dot)" type="radio" name="test" />
            <img :src="cIsDarkMode ? i_b_graph_2 : i_w_graph_2" alt="Option 2" />
        </label>
        <label>
            <input @click="() => onClick(ChartType.Line)" type="radio" name="test" />
            <img :src="cIsDarkMode ? i_b_graph_3 : i_w_graph_3" alt="Option 3" />
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
import { ChartType } from './constant';
import { defineProps, defineEmits, withDefaults, computed } from 'vue';
import { useStore } from '../../../store';
const store = useStore();
const cIsDarkMode = computed(() => store.state.gDarkMode);
interface ChartSelectProps {
    isRow: boolean;
}
const props = withDefaults(defineProps<ChartSelectProps>(), {
    isRow: true,
});
const emit = defineEmits(['eOnChange']);
const onClick = (data: ChartType) => {
    emit('eOnChange', data);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
