<template>
    <div class="chart-wrap__header">
        <div class="title">
            <p></p>
            <span>{{ props.panelInfo.chart_title }}</span>
        </div>
        <div>
            {{ moment(xAxisMinRange).format(FORMAT_FULL_DATE) }} ~ {{ moment(xAxisMaxRange).format(FORMAT_FULL_DATE) }} ( interval : {{ pIntervalData.IntervalValue }}
            {{ pIntervalData.IntervalType }} )
        </div>
        <!--  -->
        <div class="chart-wrap__header-icons">
            <!-- <div class="save-chart-ex" @click="onSaveChart">
                <v-icon size="small" class="icon" icon="mdi-content-save"></v-icon>
            </div>
            <label>
                <v-icon size="small" class="icon file-import-icon" icon="mdi-upload"></v-icon>
                <input class="file-import" type="file" @change="onUploadChart" />
            </label> -->

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
import i_w_refresh from '@/assets/image/i_w_refresh.png';
import { RouteNames } from '@/enums/routes';
import { BoardInfo, LinePanel, PanelInfo } from '@/interface/chart';
import { BoardPanelEdit } from '@/interface/tagView';
import router from '@/routes';
import { useStore } from '@/store';
import { MutationTypes } from '@/store/mutations';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import fs from 'fs';
import { isUndefined } from 'lodash';
import moment from 'moment';
import { watch } from 'vue';
import { computed, defineEmits, defineProps, ref, withDefaults } from 'vue';
import { useRoute } from 'vue-router';

interface ChartHeaderProps {
    panelInfo: LinePanel;
    xAxisMinRange: string | number;
    xAxisMaxRange: string | number;
    pIntervalData: { IntervalValue: number; IntervalType: string };
}
const props = withDefaults(defineProps<ChartHeaderProps>(), {});
const emit = defineEmits(['eOnReload']);

const store = useStore();
const route = useRoute();
const sDateLeft = ref<string>(moment().format(FORMAT_FULL_DATE));
const sDateRight = ref<string>(moment().format(FORMAT_FULL_DATE));
const CBoard = computed((): BoardInfo => store.state.gBoard);
const cIsDarkMode = computed(() => store.getters.getDarkMode);
function convertInterType(gUnit: string) {
    switch (gUnit) {
        case 's':
            return 'sec';
        case 'm':
            return 'min';
        case 'h':
            return 'hour';
        case 'd':
            return 'day';
        default:
            return gUnit;
    }
}
const onDeleteBoard = () => {
    if (!confirm(`Are you sure you want to delete this chart(${props.panelInfo.chart_title})?`)) {
        return;
    }
    store.commit(MutationTypes.setDeleteChart, props.panelInfo.i);
};
const onSaveChart = () => {
    const jsonString = JSON.stringify(store.state.gBoard.panels[props.panelInfo.i as number][0]);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.panelInfo.chart_title}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
const onUploadChart = (aEvent: any) => {
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = (event: any) => {
        const fileContent = JSON.parse(event.target.result);
        store.commit(MutationTypes.setBoardByFileUpload, {
            index: props.panelInfo.i,
            item: fileContent,
        } as BoardPanelEdit);
    };
    reader.readAsText(file);
};
const intervalId = setInterval(() => {
    const cookieData = document.cookie.split('; ').find((row) => row.startsWith('data='));
    if (cookieData) {
        const json = cookieData.split('=')[1];
        const data = JSON.parse(json);
        const expiration = cookieData.split(';')[1].split('=')[1];
        if (new data(expiration) < new Date()) {
            document.cookie = 'data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    } else {
        clearInterval(intervalId);
    }
}, 1000);

const openNewChartPage = () => {
    const routeData = router.resolve({ name: RouteNames.CHART_VIEW, params: { id: props.panelInfo.i } });
    document.cookie = `data=${JSON.stringify(CBoard.value)}; expires=${new Date(Date.now() + 10000).toUTCString()}`;
    intervalId;
    window.open(routeData.href, '_blank');
};
const onReloadChart = () => {
    emit('eOnReload');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
