<template>
    <div class="chart-wrap__header">
        <div class="title">
            <p></p>
            <span>{{ props.panelInfo.chart_title }}</span>
        </div>
        <div>{{ toDateUtcChart(xAxisMinRange) }} ~ {{ toDateUtcChart(xAxisMaxRange) }} ( interval : {{ pIntervalData.IntervalValue }} {{ pIntervalData.IntervalType }} )</div>
        <div class="chart-wrap__header-icons">
            <img
                v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW"
                :src="cIsDarkMode ? i_b_newwin : i_w_newwin"
                class="icon"
                @click="openNewChartPage"
            />
            <router-link
                v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW && route.name !== RouteNames.VIEW"
                :to="{ name: RouteNames.CHART_EDIT, params: { id: panelInfo.i } }"
            >
                <img :src="cIsDarkMode ? i_b_edit : i_w_edit" class="icon" />
            </router-link>
            <img :src="i_b_refresh" class="icon" @click="onReloadChart" />
            <img
                v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW && route.name !== RouteNames.VIEW"
                :src="cIsDarkMode ? i_b_del : i_w_del"
                class="icon"
                @click="onDeleteBoard"
            />
        </div>
    </div>
</template>

<script setup lang="ts" name="ChartHeader">
import i_b_del from '@/assets/image/i_b_del.png';
import i_b_edit from '@/assets/image/i_b_edit.png';
import i_b_newwin from '@/assets/image/i_b_newwin.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_w_del from '@/assets/image/i_w_del.png';
import i_w_edit from '@/assets/image/i_w_edit.png';
import i_w_newwin from '@/assets/image/i_w_newwin.png';
import { RouteNames } from '@/enums/routes';
import { BoardInfo, LinePanel } from '@/interface/chart';
import router from '@/routes';
import { useStore } from '@/store';
import { MutationTypes } from '@/store/mutations';
import { toDateUtcChart } from '@/utils/utils';
import { computed, defineEmits, defineProps, withDefaults } from 'vue';
import { useRoute } from 'vue-router';

interface ChartHeaderProps {
    panelInfo: LinePanel;
    xAxisMinRange: number;
    xAxisMaxRange: number;
    pIntervalData: { IntervalValue: number; IntervalType: string };
}
const props = withDefaults(defineProps<ChartHeaderProps>(), {});
const emit = defineEmits(['eOnReload']);

const store = useStore();
const route = useRoute();
const CBoard = computed((): BoardInfo => store.state.gBoard);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const onDeleteBoard = () => {
    if (!confirm(`Are you sure you want to delete this chart(${props.panelInfo.chart_title})?`)) {
        return;
    }
    store.commit(MutationTypes.setDeleteChart, props.panelInfo.i);
};
const openNewChartPage = () => {
    const routeData = router.resolve({ name: RouteNames.CHART_VIEW, params: { id: props.panelInfo.i } });
    document.cookie = `data=${JSON.stringify(CBoard.value)}; expires=${new Date(Date.now() + 10000).toUTCString()}`;
    window.open(routeData.href, '_blank');
};
const onReloadChart = () => {
    emit('eOnReload');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
