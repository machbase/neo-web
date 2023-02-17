<template>
    <div class="chart-wrap">
        <div class="chart-wrap__header">
            <div class="title">
                <p></p>
                <span>{{ props.panelInfo.chart_title }}</span>
            </div>
            <div>2022-12-30 16:05:19 ~ 2022-12-30 16:07:32 ( interval : 1 sec )</div>
            <!--  -->
            <div v-if="cIsDarkMode" class="chart-wrap__header-icons">
                <v-icon size="small" class="icon" icon="mdi-content-save"></v-icon>
                <router-link v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW" :to="{ name: RouteNames.CHART_VIEW }" target="_blank">
                    <img :src="i_b_newwin" class="icon" />
                </router-link>
                <router-link
                    v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW && route.name !== RouteNames.VIEW"
                    :to="{ name: RouteNames.CHART_EDIT, params: { id: panelInfo.i } }"
                >
                    <img :src="i_b_edit" class="icon" />
                </router-link>
                <img :src="i_b_refresh" class="icon" />
                <img v-if="route.name !== RouteNames.CHART_EDIT && route.name !== RouteNames.CHART_VIEW && route.name !== RouteNames.VIEW" :src="i_b_del" class="icon" />
            </div>
            <!--  -->
            <div v-else class="chart-wrap__header-icons">
                <v-icon v-if="route.name !== RouteNames.CHART_EDIT" class="icon" icon="mdi-content-save"></v-icon>
                <v-icon v-if="route.name !== RouteNames.CHART_EDIT" size="small" class="icon" icon="mdi-content-save"></v-icon>
                <router-link v-if="route.name !== RouteNames.CHART_EDIT" :to="{ name: RouteNames.CHART_VIEW }" target="_blank">
                    <img :src="i_w_newwin" class="icon" />
                </router-link>
                <router-link v-if="route.name !== RouteNames.CHART_EDIT" :to="{ name: RouteNames.CHART_EDIT, params: { id: panelInfo.i } }">
                    <img :src="i_w_edit" class="icon" />
                </router-link>
                <img v-if="route.name === RouteNames.CHART_EDIT || route.name === RouteNames.TAG_VIEW" :src="i_w_refresh" class="icon" />
                <img v-if="route.name !== RouteNames.CHART_EDIT" :src="i_w_del" class="icon" />
            </div>
        </div>
        <slot :contact="props.panelInfo.i" />
        <ViewPort />
    </div>
</template>

<script lang="ts" setup name="ChartWrap">
// interface ChartWrapProps {}

import { useStore } from '@/store';
import { computed, useSlots } from 'vue';
import i_b_newwin from '@/assets/image/i_b_newwin.png';
import ViewPort from './viewport/index.vue';
import i_b_edit from '@/assets/image/i_b_edit.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_b_del from '@/assets/image/i_b_del.png';
import i_w_newwin from '@/assets/image/i_w_newwin.png';
import i_w_edit from '@/assets/image/i_w_edit.png';
import i_w_refresh from '@/assets/image/i_w_refresh.png';
import i_w_del from '@/assets/image/i_w_del.png';
import { RouteNames } from '@/enums/routes';
import { LinePanel } from '@/interface/chart';
import { withDefaults, defineProps, watch, ref } from 'vue';
import { useRoute } from 'vue-router';

interface ChartWrapProps {
    panelInfo: LinePanel;
}
const props = withDefaults(defineProps<ChartWrapProps>(), {});
const store = useStore();
const route = useRoute();

const cIsDarkMode = computed(() => store.getters.getDarkMode);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
