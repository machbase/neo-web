<template>
    <div v-if="route.name !== RouteNames.LOGIN" class="header" :style="cIsDarkMode ? { boxShadow: '0 0 10px 10px rgba(0, 0, 0, 0.2)' } : {}">
        <div v-if="sLoading" class="loading-rollUp">
            <img class="icon" :src="cIsDarkMode ? loader_b : loader_w" />
        </div>
        <v-sheet color="transparent" width="4%">
            <img class="icon" :src="logo" />
        </v-sheet>
        <v-sheet class="header__link" color="transparent" width="81%">
            <div class="tab-form">
                <button
                    v-for="(aTab, aIdx) in gTabList"
                    :key="aIdx"
                    @click="setSelectedTab(aTab.board_id)"
                    @mouseleave="aTab.hover = false"
                    @mouseover="aTab.hover = true"
                    :style="
                        gSelectedTab === aTab.board_id
                            ? cIsDarkMode
                                ? { backgroundColor: '#121212' }
                                : { backgroundColor: '#ffffff', color: '#121212' }
                            : { backgroundColor: '#202020' }
                    "
                >
                    <div>
                        <v-icon v-if="aTab.type === 'dashboard'" size="16px">mdi-chart-line</v-icon>
                        <v-icon v-if="aTab.type == 'new'" size="16px">mdi-note-outline</v-icon>
                        <v-icon v-if="aTab.type == 'SQL Editor'" size="16px">mdi-file-document-outline</v-icon>
                        <v-icon v-if="aTab.type == 'Terminal'" size="16px">mdi-console</v-icon>
                        <v-icon v-if="aTab.type == 'Tql'" size="16px">mdi-chart-scatter-plot</v-icon>

                        {{ aTab.board_name }}
                    </div>
                    <v-icon
                        v-if="aTab.type !== 'new'"
                        @click.stop="gTabList.length !== 1 && (gSelectedTab === aTab.id || aTab.hover === true) && deleteTab(aTab.board_id)"
                        :size="gTabList.length !== 1 && (gSelectedTab === aTab.id || aTab.hover === true) ? '16px' : aTab.savedCode !== aTab.code ? '12px' : '16px'"
                    >
                        {{ gTabList.length !== 1 && (gSelectedTab === aTab.id || aTab.hover === true) ? 'mdi-close' : aTab.savedCode !== aTab.code ? 'mdi-circle' : '' }}
                    </v-icon>
                    <v-icon
                        v-if="aTab.type === 'new' && gTabList.length !== 1 && (gSelectedTab === aTab.id || aTab.hover === true)"
                        @click.stop="deleteTab(aTab.board_id)"
                        size="16px"
                    >
                        mdi-close
                    </v-icon>
                </button>
            </div>
            <v-btn @click="addTab" density="comfortable" icon="mdi-plus" size="36px" variant="plain"> </v-btn>
        </v-sheet>
        <v-sheet class="header__tool" color="transparent" width="15%">
            <div @click="onChildGroup" class="header__link--group-item drop">
                <v-icon>mdi-cog</v-icon>
                <div ref="childGroup" class="child-group">
                    <div @click="onClickPopupItem(PopupType.PREFERENCES)" class="item">
                        <v-icon
                            v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                            @click="onClickPopupItem(PopupType.SAVE_DASHBOARD)"
                            class="icon"
                            icon="mdi-cog-transfer-outline"
                            size="small"
                        ></v-icon>
                        {{ PREFERENCE }}
                    </div>
                    <div>
                        <img v-if="sHeaderType === RouteNames.CHART_EDIT" @click="onSaveEdit" class="icon" :src="i_b_save_2" />
                    </div>
                    <div @click="onClickPopupItem(PopupType.LICENSE)" class="item">
                        <v-icon class="icon" icon="mdi-license" size="small"></v-icon>
                        license
                    </div>
                    <div @click="logout" class="item">
                        <v-icon class="icon" icon="mdi-logout" size="small"></v-icon>
                        Logout
                    </div>
                </div>
            </div>
        </v-sheet>
    </div>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-width="cWidthPopup" />
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
import { computed, ref, watch, provide, defineEmits, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from './constant';
import { BarPanel, BoardInfo, startTimeToendTimeType } from '@/interface/chart';
import { fetchRollUp } from '@/api/repository/machiot';
import Joi from 'joi';
import { logOut } from '../../api/repository/login';
import { postFileList } from '../../api/repository/api';

const emit = defineEmits(['download']);

export type headerType = RouteNames.TAG_VIEW | RouteNames.VIEW | RouteNames.CHART_VIEW | RouteNames.CHART_EDIT | RouteNames.NEW;
const store = useStore();
const cTimeRange = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return { start: gTabList.value[sIdx].range_bgn, end: gTabList.value[sIdx].range_end, refresh: gTabList.value[sIdx].refresh };
});
const router = useRouter();
const route = useRoute();
const sHeaderType = ref<headerType>(route.name as headerType);
const sDialog = ref<boolean>(false);
const childGroup = ref();
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cTableList = computed((): [] => store.state.gTableList);
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const cBoard = computed(() => store.state.gBoard);
const cBoardOld = computed(() => store.state.gBoardOld);
const sPopupType = ref<PopupType>(PopupType.NEW_CHART);
const gBoard = computed(() => store.state.gBoard);
const gTabList = computed(() => store.state.gTabList);
const gSelectedTab = computed(() => store.state.gSelectedTab);
const sLoading = ref<boolean>(false);
let sFileOption = ref<string>('');

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

const addTab = () => {
    const sId = String(new Date().getTime());
    store.commit(MutationTypes.pushTab, {
        type: 'new',
        board_id: sId,
        board_name: 'new',
        range_end: '',
        refresh: '',
        range_bgn: '',
        panels: [],
        code: '',
        hover: false,
    });
    store.commit(MutationTypes.setLastSelectedTab, gSelectedTab.value);

    store.commit(MutationTypes.setSelectedTab, sId);
};

const setSelectedTab = (aItem: string) => {
    store.commit(MutationTypes.setLastSelectedTab, gSelectedTab.value);
    store.commit(MutationTypes.setSelectedTab, aItem);
};

const deleteTab = (aId: string) => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === aId);

    const sCopyTabList = JSON.parse(JSON.stringify(gTabList.value));

    if (gSelectedTab.value === aId) {
        if (sIdx === sCopyTabList.length - 1) {
            store.commit(MutationTypes.setSelectedTab, sCopyTabList[sIdx - 1].board_id);
        } else {
            store.commit(MutationTypes.setSelectedTab, sCopyTabList[sIdx + 1].board_id);
        }
    }

    sCopyTabList.splice(sIdx, 1);
    store.commit(MutationTypes.changeTabList, sCopyTabList as BoardInfo);
};

const onUploadChart = (aEvent: any) => {
    sLoading.value = true;
    const file = aEvent.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event: any) => {
        const fileContent: any = await JSON.parse(event.target.result);
        const status = await validateTest(schema, fileContent);
        if (status === false) {
            sLoading.value = false;
            return;
        }

        store.commit(MutationTypes.changeTabList, cloneDeep(fileContent) as BoardInfo);

        setSelectedTab(cloneDeep(fileContent)[0].board_id);
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
        case PopupType.ADD_TAB:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.NEW_TAGS:
            return '667px';
        case PopupType.FILE_BROWSER:
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
const onClickPopupItem = (aPopupName: PopupType, aFileOption?: string) => {
    if (aFileOption === 'save') {
        sFileOption.value = 'save';
    } else {
        sFileOption.value = 'open';
    }
    sPopupType.value = aPopupName;
    sDialog.value = true;
};
const onReload = () => {
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

const download = () => {
    onClickPopupItem(PopupType.SAVE_DASHBOARD);
};

watch(
    () => route.name,
    () => {
        if (route.name) sHeaderType.value = route.name as headerType;
    }
);
onMounted(async () => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    if (!(sIdx === -1)) {
        store.commit(MutationTypes.setSelectedTab, gTabList.value[sIdx].board_id);
    } else store.commit(MutationTypes.setSelectedTab, gTabList.value[0].board_id);
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
