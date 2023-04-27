<template>
    <div class="header">
        <div v-if="sLoading" class="loading-rollUp">
            <img class="icon" :src="cIsDarkMode ? loader_b : loader_w" />
        </div>
        <div class="header__link">
            <img class="icon" :src="logo" />
            <!-- <span class="header__name">{{ cBoard.board_name }}</span> -->
            <!-- <ComboboxSelect
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                :p-data="cBoardListSelect"
                :p-value="route.params.id || route.query.id || (cBoardListSelect[0]?.id && route.query.id !== null)"
                @e-on-change="onChangeRoute"
            /> -->
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW" class="header__link--group">
                <router-link class="header__link--group-item" target="_blank" :to="{ name: RouteNames.NEW }">{{ NEW_DASHBOARD }}</router-link>
                <img class="icon" :src="i_b_menu_1" />
                <div @click="onChildGroup" class="header__link--group-item drop">
                    {{ SET }}
                    <div ref="childGroup" class="child-group">
                        <div @click="onClickPopupItem(PopupType.PREFERENCES)" class="item">{{ PREFERENCE }}</div>
                        <!-- <div class="item" @click="onRollUp">{{ REQUEST_ROLLUP }}</div> -->
                    </div>
                </div>
                <!-- <img :src="i_b_menu_1" class="icon" /> -->
                <!-- <div class="header__link--group-item">{{ LOGOUT }}</div> -->
            </div>
        </div>
        <div class="header__tool">
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.VIEW" @click="onClickPopupItem(PopupType.TIME_RANGE)" class="time-range icon">
                {{
                    !isEmpty(cTimeRange)
                        ? `${cTimeRange.start ? cTimeRange.start : ''} ~ ${cTimeRange.end ? cTimeRange.end : ''} ${cTimeRange.refresh ? `refresh every ${cTimeRange.refresh}` : ''}`
                        : TIME_RANGE_NOT_SET
                }}
            </div>
            <!-- <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new'" :src="i_b_timerange" class="icon" />             -->
            <v-icon
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                @click="onClickPopupItem(PopupType.SAVE_DASHBOARD)"
                class="icon"
                icon="mdi-content-save"
                size="small"
            ></v-icon>
            <label v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW">
                <v-icon class="icon file-import-icon" icon="mdi-upload" size="small"></v-icon>
                <input @change="onUploadChart" accept="application/JSON" class="file-import" type="file" />
            </label>
            <img
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW || sHeaderType === RouteNames.VIEW"
                @click="onClickPopupItem(PopupType.TIME_RANGE)"
                class="icon"
                :src="i_b_timerange"
            />
            <img @click="onReload" class="icon" :src="i_b_refresh" />
            <!-- <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW">
                <router-link :to="{ name: RouteNames.VIEW }" target="_blank">
                    <img :src="i_b_share" class="icon" @click="openNewChartPage" />
                </router-link>
            </div> -->
            <img v-if="sHeaderType === RouteNames.CHART_EDIT" @click="onSaveEdit" class="icon" :src="i_b_save_2" />
            <img v-if="sHeaderType === RouteNames.TAG_VIEW" @click="logout" class="icon" :src="i_b_logout" />
            <a class="icon"><img v-if="sHeaderType === RouteNames.CHART_EDIT" @click="router.go(-1)" :src="i_b_close" style="margin-top: 7px" /></a>
        </div>
    </div>
    <PopupWrap @eClosePopup="onClosePopup" :p-show="sDialog" :p-type="sPopupType" :p-width="cWidthPopup" />
</template>

<script setup lang="ts" name="Header">
import { clone, cloneDeep, isEmpty } from 'lodash';
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_menu_1 from '@/assets/image/i_b_menu_1.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import i_b_logout from '@/assets/image/i_b_logout.png';
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
import Joi from 'joi';
import { logOut } from '../../api/repository/login';
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
const cLocation = computed(() => {
    return window.location.href.indexOf('web') === -1 ? false : true;
});

const openNewChartPage = () => {
    document.cookie = `data=${JSON.stringify(cBoard.value)}; expires=${new Date(Date.now() + 10000).toUTCString()}`;
};

const schema = Joi.object({
    board_id: Joi.string().required(),
    range_end: Joi.string().allow('').required(),
    range_bgn: Joi.string().allow('').required(),
    refresh: Joi.string().allow('').required(),
    board_name: Joi.string().required(),
    old_id: Joi.string(),
    panels: Joi.array()
        .items(
            Joi.array().items(
                Joi.object({
                    chart_id: Joi.string().allow('').required(),
                    tag_set: Joi.array()
                        .required()
                        .items(
                            Joi.object({
                                onRollup: Joi.boolean(),
                                id: Joi.number(),
                                weight: Joi.number().required(),
                                offset: Joi.number(),
                                min: Joi.number().required(),
                                max: Joi.number().required(),
                                alias: Joi.string().allow('').required(),
                                use_y2: Joi.string().required().pattern(/Y|N/),
                                tag_names: Joi.string().required(),
                                table: Joi.string().required(),
                                calculation_mode: Joi.string()
                                    .required()
                                    .pattern(/avg|cnt|min|max|sum|raw/),
                            })
                        ),
                    range_bgn: Joi.string().allow('').required(),
                    range_end: Joi.string().allow('').required(),
                    count: Joi.number().required(),
                    interval_type: Joi.string().allow('').required(),
                    interval_value: Joi.number().required(),
                    refresh: Joi.string().allow('').required(),
                    csstype: Joi.string()
                        .required()
                        .pattern(/machIoTchartBlack|machIoTchartWhite/),
                    show_legend: Joi.string().required().pattern(/N|R|B/),
                    start_with_vport: Joi.string().required().pattern(/Y|N/),
                    raw_chart_limit: Joi.number().required(),
                    raw_chart_threshold: Joi.number().required(),
                    fill: Joi.number().required(),
                    stroke: Joi.number().required(),
                    show_point: Joi.string().required().pattern(/Y|N/),
                    point_radius: Joi.number().required(),
                    pixels_per_tick: Joi.number().required(),
                    use_zoom: Joi.string().required().pattern(/Y|N/),
                    drilldown_zoom: Joi.string().required().pattern(/Y|N/),
                    use_normalize: Joi.string().required().pattern(/Y|N/),
                    border_color: Joi.string().allow('').required(),
                    chart_title: Joi.string().required(),
                    zero_base: Joi.string().required().pattern(/Y|N/),
                    use_custom_max: Joi.string().required().pattern(/Y|N/),
                    custom_max: Joi.number().required(),
                    use_custom_min: Joi.string().required().pattern(/Y|N/),
                    custom_min: Joi.number().required(),
                    use_custom_drilldown_max: Joi.string().required().pattern(/Y|N/),
                    custom_drilldown_max: Joi.number().required(),
                    use_custom_drilldown_min: Joi.string().required().pattern(/Y|N/),
                    custom_drilldown_min: Joi.number().required(),

                    use_right_y2: Joi.string().required().pattern(/Y|N/),
                    zero_base2: Joi.string().pattern(/Y|N/),
                    use_custom_max2: Joi.string().required().pattern(/Y|N/),
                    custom_max2: Joi.number().required(),
                    use_custom_min2: Joi.string().required().pattern(/Y|N/),
                    custom_min2: Joi.number().required(),
                    use_custom_drilldown_max2: Joi.string().required().pattern(/Y|N/),
                    custom_drilldown_max2: Joi.number().required(),
                    use_custom_drilldown_min2: Joi.string().required().pattern(/Y|N/),
                    custom_drilldown_min2: Joi.number().required(),

                    show_x_tickline: Joi.string().required().pattern(/Y|N/),
                    show_y_tickline: Joi.string().required().pattern(/Y|N/),
                    show_y_tickline2: Joi.string().required().pattern(/Y|N/),

                    use_custom_color: Joi.string().required().pattern(/Y|N/),
                    color_set: Joi.string().required(),
                    chart_height: Joi.number().required(),
                    chart_width: Joi.number().required(),

                    timeout: Joi.number().required(),
                    x_axis_type: Joi.string().required(),
                    chart_type: Joi.string().required(),
                    sec_rollup: Joi.object({
                        TAG: Joi.string(),
                        MYTAG: Joi.string(),
                    }),

                    legend_width: Joi.number().required(),
                    show_legend_value: Joi.object({
                        max: Joi.string(),
                        sum: Joi.string(),
                        avg: Joi.string(),
                        min: Joi.string(),
                    }).required(),
                    name_legend_value: Joi.array()
                        .items(Joi.string().pattern(/avg|cnt|min|max|sum|raw/))
                        .required(),
                    use_detail: Joi.number().required(),
                    detail_count: Joi.number().required(),
                    detail_rows: Joi.number().required(),

                    i: Joi.number(),
                    panel_title: Joi.string(),
                    panel_type: Joi.string(),
                    select_count_type: Joi.string(),
                    font_size: Joi.number(),
                    connect_info: Joi.any(),
                    inner_radius: Joi.number(), // for pie chart
                    outer_radius: Joi.number(), // for pie chart
                    min_value: Joi.number(),
                    background_color: Joi.number(),
                    min_width: Joi.number(), // for bar chart
                    bar_width: Joi.number(), // for bar chart
                    total_width: Joi.number(), // for bar chart
                    percent_text_annotation: Joi.string(), // for bar chart
                    usage: Joi.any(), // for 1.4 All panels in the dashboard have a parameter usage keyW
                    url: Joi.string(), // url store for path 2.3 information panel
                    timezone_key: Joi.string(),
                    timezone_value: Joi.string(),
                })
            )
        )
        .required()
        .allow(),
});
const validateTest = async (joiSchema: any, testObject: any) => {
    return true;
};

const logout = async () => {
    const sLogout: any = await logOut();
    if (sLogout.success) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push({
            name: RouteNames.LOGIN,
        });
    }
};

const onUploadChart = (aEvent: any) => {
    sLoading.value = true;
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event: any) => {
        const fileContent: BoardInfo = await JSON.parse(event.target.result);
        const status = await validateTest(schema, fileContent);
        if (status === false) {
            sLoading.value = false;
            return;
        }
        store.commit(MutationTypes.setBoardOld, cloneDeep(fileContent) as BoardInfo);
        store.commit(MutationTypes.setBoardByFileUpload, cloneDeep(fileContent) as BoardInfo);
        sLoading.value = false;
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
// store.dispatch(ActionTypes.fetchBoardList);

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
