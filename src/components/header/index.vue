<template>
    <div class="header">
        <div v-if="sLoading" class="loading-rollUp">
            <img :src="cIsDarkMode ? loader_b : loader_w" class="icon" />
        </div>
        <div class="header__link">
            <img :src="logo" class="icon" />
            <span class="header__name">{{ cBoard.board_name }}</span>
            <!-- <ComboboxSelect
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                :p-data="cBoardListSelect"
                :p-value="route.params.id || route.query.id || (cBoardListSelect[0]?.id && route.query.id !== null)"
                @e-on-change="onChangeRoute"
            /> -->
            <div v-if="sHeaderType === RouteNames.VIEW" class="share-header">{{ boardSelected }}</div>
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW" class="header__link--group">
                <router-link class="header__link--group-item" :to="{ name: RouteNames.NEW }" target="_blank">{{ NEW_DASHBOARD }}</router-link>
                <img :src="i_b_menu_1" class="icon" />
                <div class="header__link--group-item drop" @click="onChildGroup">
                    {{ SET }}
                    <div ref="childGroup" class="child-group">
                        <div class="item" @click="onClickPopupItem(PopupType.PREFERENCES)">{{ PREFERENCE }}</div>
                        <div class="item" @click="onRollUp">{{ REQUEST_ROLLUP }}</div>
                    </div>
                </div>
                <img :src="i_b_menu_1" class="icon" />
                <div class="header__link--group-item">{{ LOGOUT }}</div>
            </div>
        </div>
        <div class="header__tool">
            <!-- <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.VIEW" class="time-range icon" @click="onClickPopupItem(PopupType.TIME_RANGE)">
                {{
                    !isEmpty(cTimeRange)
                        ? `${cTimeRange.start ? cTimeRange.start : ''} ~ ${cTimeRange.end ? cTimeRange.end : ''} ${cTimeRange.refresh ? `refresh every ${cTimeRange.refresh}` : ''}`
                        : TIME_RANGE_NOT_SET
                }}
            </div> -->
            <!-- <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new'" :src="i_b_timerange" class="icon" />             -->
            <v-icon
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                size="small"
                class="icon"
                icon="mdi-content-save"
                @click="onClickPopupItem(PopupType.SAVE_DASHBOARD)"
            ></v-icon>
            <label v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW">
                <v-icon size="small" class="icon file-import-icon" icon="mdi-upload"></v-icon>
                <input class="file-import" type="file" accept="application/JSON" @change="onUploadChart" />
            </label>
            <img
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW || sHeaderType === RouteNames.VIEW"
                :src="i_b_timerange"
                class="icon"
                @click="onClickPopupItem(PopupType.TIME_RANGE)"
            />
            <img :src="i_b_refresh" class="icon" @click="onReload" />
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW">
                <router-link
                    v-if="route.params.id || cBoardListSelect[0]?.id"
                    :to="{ name: RouteNames.VIEW, params: { id: route.params.id || route.query.id as string || cBoardListSelect[0]?.id } }"
                    target="_blank"
                >
                    <img :src="i_b_share" class="icon" />
                </router-link>
            </div>
            <img v-if="sHeaderType === RouteNames.CHART_EDIT" class="icon" :src="i_b_save_2" @click="onSaveEdit" />
            <a class="icon"><img v-if="sHeaderType === RouteNames.CHART_EDIT" :src="i_b_close" style="margin-top: 7px" @click="router.go(-1)" /></a>
        </div>
    </div>
    <PopupWrap :p-type="sPopupType" :p-show="sDialog" :p-width="cWidthPopup" @eClosePopup="onClosePopup" />
</template>

<script setup lang="ts" name="Header">
import { clone, cloneDeep, isEmpty } from 'lodash';
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_menu_1 from '@/assets/image/i_b_menu_1.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import i_b_share from '@/assets/image/i_b_share.png';
import i_b_timerange from '@/assets/image/i_b_timerange.png';
import loader_b from '@/assets/image/ajax-loader-b.gif';
import loader_w from '@/assets/image/ajax-loader-w.gif';
import logo from '@/assets/image/i_logo.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { RouteNames } from '@/enums/routes';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { MutationTypes } from '@/store/mutations';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from './constant';
import { BarPanel, BoardInfo, startTimeToendTimeType } from '@/interface/chart';
import { fetchRollUp } from '@/api/repository/machiot';

export type headerType = RouteNames.TAG_VIEW | RouteNames.VIEW | RouteNames.CHART_VIEW | RouteNames.CHART_EDIT | RouteNames.NEW;
const store = useStore();
const cTimeRange = computed(() => store.state.gTimeRange);
const router = useRouter();
const route = useRoute();
const sHeaderType = ref<headerType>(route.name as headerType);
const sDialog = ref<boolean>(false);
const sPopupType = ref<PopupType>(PopupType.NEW_CHART);
const childGroup = ref();
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cTableList = computed((): [] => store.state.gTableList);
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const cBoard = computed(() => store.state.gBoard);
const cBoardOld = computed(() => store.state.gBoardOld);
const boardSelected = computed((): string => cBoardList.value.find(({ board_id }) => board_id === route.params.id)?.board_name as string);
const gBoard = computed(() => store.state.gBoard);
const sLoading = ref<boolean>(false);
const cBoardListSelect = computed(() =>
    cBoardList.value.map((aItem) => {
        return {
            ...aItem,
            id: aItem.board_id,
            name: aItem.board_name,
        };
    })
);

function validateObject(obj: any) {
    // for (let key in template) {
    //     if (typeof obj[key] === 'undefined') {
    //         return false;
    //     }
    //     if (typeof template[key] === 'object') {
    //         if (!validateObject(obj[key], template[key])) {
    //             return false;
    //         }
    //     }
    // }
    return true;
}

const onUploadChart = (aEvent: any) => {
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = (event: any) => {
        try {
            const fileContent: BoardInfo = JSON.parse(event.target.result);
            store.commit(MutationTypes.setBoardOld, cloneDeep(fileContent) as BoardInfo);
            store.commit(MutationTypes.setBoardByFileUpload, cloneDeep(fileContent) as BoardInfo);
        } catch (error) {
            console.log('fileContent', error);
        }
    };
    reader.readAsText(file);
};

const cWidthPopup = computed((): string => {
    switch (sPopupType.value) {
        case PopupType.PREFERENCES:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.TIME_RANGE:
            return WIDTH_DEFAULT.TIME_RANGE;
        case PopupType.TIME_DURATION:
            return WIDTH_DEFAULT.TIME_DURATION;
        case PopupType.MANAGE_DASHBOARD:
            return WIDTH_DEFAULT.MANAGE_DASHBOARD;
        case PopupType.SAVE_DASHBOARD:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.NEW_TAGS:
            return '667px';
        default:
            return WIDTH_DEFAULT.DEFAULT;
    }
});
const onChildGroup = () => {
    childGroup.value.classList.toggle('active');
};
const onClosePopup = () => {
    sDialog.value = false;
};
const onChangeRoute = (aValue: string) => {
    router.replace({ query: { id: aValue } });
    if (route.name === RouteNames.VIEW) router.replace({ query: {} });
    if (route.name === RouteNames.NEW) router.replace({ name: RouteNames.TAG_VIEW, query: { id: aValue } });
};
const onClickPopupItem = (aPopupName: PopupType) => {
    sPopupType.value = aPopupName;
    sDialog.value = true;
};
//
// const fetchPanelData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
//     const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
//     let sLimit = aPanelInfo.count;
//     let sCount = -1;
//     if (sLimit < 0) {
//         sCount = Math.ceil(sChartWidth / sInnerValue.sTickPixels);
//     }
//     let sDatasets = [] as HighchartsDataset[];
//     const sTagList: ReturnTagData[][] = [];
//     const sTagSet = aPanelInfo.tag_set || [];
//     if (!sTagSet.length) return;
//     let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
//     if (!aCustomRange) {
//         sTimeRange = {
//             // startTime: moment(sTimeRange.startTime).valueOf() - 133000,
//             startTime: moment(moment(sTimeRange.endTime).valueOf() - 100000).format('YYYY-MM-DDTHH:mm:ss'),
//             endTime: sTimeRange.endTime,
//         };
//         data.sTimeLine = sTimeRange;
//     } else {
//         sTimeRange = aCustomRange;
//     }
//     const sIntervalTime =
//         aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(data.sTimeLine.startTime as string, data.sTimeLine.endTime as string, sChartWidth) : data.sIntervalData;
//     data.sIntervalData = sIntervalTime;
//     for (let index = 0; index < sTagSet.length; index++) {
//         const sTagSetElement = sTagSet[index];
//         const sFetchResult = await store.dispatch(ActionTypes.fetchTagData, {
//             Table: sTagSetElement.table,
//             TagNames: sTagSetElement.tag_names,
//             Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
//             End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
//             CalculationMode: sTagSetElement.calculation_mode.toLowerCase(),
//             ...sIntervalTime,
//             Count: sCount,
//             Direction: 0,
//         });
//         sTagList.push(sFetchResult);
//     }
//     const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
//     await sTagList.forEach(async (_, i: number) => {
//         const sTag = aPanelInfo.tag_set[i];
//         const sRes: ReturnTagData[] = sTagList.map((tag) => {
//             return tag[0];
//         });
//         let sConvertData;
//         sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
//         sDatasets = sConvertData;
//     });
//     data.sDisplayData = { datasets: sDatasets };
//     data.sMaxYChart = getMaxValue(sDatasets);
// };
// const fetchViewPortData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
//     const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
//     let sLimit = aPanelInfo.count;
//     let sCount = -1;
//     if (sLimit < 0) {
//         sCount = Math.ceil(sChartWidth / sInnerValue.sTickPixels);
//     }
//     let sDatasets = [] as HighchartsDataset[];
//     const sTagList: ReturnTagData[][] = [];
//     const sTagSet = aPanelInfo.tag_set || [];
//     if (!sTagSet.length) return;
//     let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
//     if (!aCustomRange)
//         data.sTimeRangeViewPort = {
//             startTime: sTimeRange.startTime,
//             endTime: sTimeRange.endTime,
//         };
//     else {
//         data.sTimeRangeViewPort = aCustomRange;
//         sTimeRange = aCustomRange;
//     }
//     const sIntervalTime =
//         aPanelInfo.interval_type.toLowerCase() === ''
//             ? calcInterval(data.sTimeRangeViewPort.startTime as string, data.sTimeRangeViewPort.endTime as string, sChartWidth)
//             : data.sIntervalData;
//     data.sIntervalData = sIntervalTime;
//     for (let index = 0; index < sTagSet.length; index++) {
//         const sTagSetElement = sTagSet[index];
//         const sFetchResult = await store.dispatch(ActionTypes.fetchTagData, {
//             Table: sTagSetElement.table,
//             TagNames: sTagSetElement.tag_names,
//             Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
//             End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
//             CalculationMode: sTagSetElement.calculation_mode.toLowerCase(),
//             ...sIntervalTime,
//             Count: sCount,
//             Direction: 0,
//         });
//         sTagList.push(sFetchResult);
//     }
//     const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
//     await sTagList.forEach(async (_, i: number) => {
//         const sTag = aPanelInfo.tag_set[i];
//         const sRes: ReturnTagData[] = sTagList.map((tag) => {
//             return tag[0];
//         });
//         let sConvertData;
//         sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
//         sDatasets = sConvertData;
//     });
//     data.sViewPortData = { datasets: sDatasets };
// };

// const intializePanelData = async (aCustomRange?: startTimeToendTimeType, aViewPortRange?: startTimeToendTimeType) => {
//     try {
//         if (!aCustomRange && !aViewPortRange) {
//             await fetchPanelData(props.panelInfo);
//             await fetchViewPortData(props.panelInfo);
//         } else {
//             await fetchPanelData(props.panelInfo, aCustomRange);
//             await fetchViewPortData(props.panelInfo, aViewPortRange);
//         }
//     } catch (error) {
//         console.log(error);
//     }
// };
//
const onReload = () => {
    // let id = route.query.id || cBoardList.value[0]?.board_id;
    const newBord = cloneDeep(cBoardOld.value);
    store.commit(MutationTypes.setBoardByFileUpload, newBord);
};
const onRollUp = async () => {
    sLoading.value = true;
    for (let i = 0; i < cTableList.value.length; i++) {
        let aTable = cTableList.value[i];
        await fetchRollUp(aTable)
            .then((res: any) => {
                var sRes = res.Data;
                if (sRes.length > 0 && sRes[0][0].hasOwnProperty('EXECUTE RESULT')) {
                    alert(aTable + ' : ' + sRes[0][0]['EXECUTE RESULT']);
                } else if (res.ErrorMessage != '') {
                    alert(res.ErrorMessage);
                } else {
                    alert("'EXEC ROLLUP_FORCE(" + aTable + ")' does not respond.");
                }
            })
            .catch((err) => {
                alert('code:' + err.status + '\n' + 'message:' + err.responseText + '\n' + 'error:' + err);
            });
    }
    sLoading.value = false;
};
const onSaveEdit = async () => {
    await store.commit(MutationTypes.setChartBoardEdit);
    router.push({
        name: RouteNames.TAG_VIEW,
    });
};
store.dispatch(ActionTypes.fetchBoardList);

watch(
    () => route.name,
    () => {
        if (route.name) sHeaderType.value = route.name as headerType;
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
