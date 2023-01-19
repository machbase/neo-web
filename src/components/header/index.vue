<template>
    <div class="header">
        <div class="header__link">
            <img :src="logo" class="icon" />
            <ComboboxSelect
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                :p-data="cBoardListSelect"
                :p-value="route.params.id || route.query.id || (cBoardListSelect[0]?.id && route.query.id !== null)"
                @e-on-change="onChangeRoute"
            />
            <div v-if="sHeaderType === RouteNames.VIEW" class="share-header">{{ NEW_DASHBOARD }}</div>
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW" class="header__link--group">
                <router-link class="header__link--group-item" :to="{ name: RouteNames.NEW }" target="_blank">{{ NEW_DASHBOARD }}</router-link>
                <img :src="i_b_menu_1" class="icon" />
                <div class="header__link--group-item drop" @click="onChildGroup">
                    {{ SET }}
                    <div ref="childGroup" class="child-group">
                        <div class="item" @click="onClickPopupItem(PopupType.PREFERENCES)">{{ PREFERENCE }}</div>
                        <div class="item" @click="onClickPopupItem(PopupType.MANAGE_DASHBOARD)">{{ MANAGE_DASHBOARD }}</div>
                        <div class="item">{{ REQUEST_ROLLUP }}</div>
                    </div>
                </div>
                <img :src="i_b_menu_1" class="icon" />
                <div class="header__link--group-item">{{ LOGOUT }}</div>
            </div>
        </div>
        <div class="header__tool">
            <div v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.VIEW" class="time-range icon" @click="onClickPopupItem(PopupType.TIME_RANGE)">
                {{
                    !isEmpty(cTimeRange)
                        ? `${cTimeRange.start ? cTimeRange.start : ''} ~ ${cTimeRange.end ? cTimeRange.end : ''} ${cTimeRange.refresh ? `refresh every ${cTimeRange.refresh}` : ''}`
                        : TIME_RANGE_NOT_SET
                }}
            </div>
            <!-- <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new'" :src="i_b_timerange" class="icon" />             -->
            <v-icon
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW"
                class="icon"
                icon="mdi-content-save"
                @click="onClickPopupItem(PopupType.SAVE_DASHBOARD)"
            ></v-icon>
            <img
                v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW || sHeaderType === RouteNames.VIEW"
                :src="i_b_timerange"
                class="icon"
                @click="onClickPopupItem(PopupType.TIME_RANGE)"
            />
            <img :src="i_b_refresh" class="icon" @click="onClickPopupItem(PopupType.TIME_DURATION)" />
            <router-link
                v-if="route.params.id || cBoardListSelect[0]?.id"
                :to="{ name: RouteNames.VIEW, params: { id: route.params.id || cBoardListSelect[0]?.id }, query: {} }"
                target="_blank"
            >
                <img v-if="sHeaderType === RouteNames.TAG_VIEW || sHeaderType === RouteNames.NEW" :src="i_b_share" class="icon" />
            </router-link>
            <img v-if="sHeaderType === RouteNames.CHART_EDIT" :src="i_b_save_2" class="icon" />
            <img v-if="sHeaderType === RouteNames.CHART_EDIT" :src="i_b_close" class="icon" />
        </div>
    </div>
    <PopupWrap :p-type="sPopupType" :p-show="sDialog" :p-width="cWidthPopup" @eClosePopup="onClosePopup" />
</template>

<script setup lang="ts" name="Header">
import { isEmpty } from 'lodash';
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_menu_1 from '@/assets/image/i_b_menu_1.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import i_b_share from '@/assets/image/i_b_share.png';
import i_b_timerange from '@/assets/image/i_b_timerange.png';
import logo from '@/assets/image/i_logo.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { RouteNames } from '@/enums/routes';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from './constant';

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
const cBoardListSelect = computed(() =>
    cBoardList.value.map((aItem) => {
        return {
            ...aItem,
            id: aItem.board_id,
            name: aItem.board_name,
        };
    })
);
const cWidthPopup = computed((): string => {
    switch (sPopupType.value) {
        case PopupType.PREFERENCES:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.TIME_RANGE:
            return WIDTH_DEFAULT.TIME_RANGE;
        case PopupType.TIME_DURATION:
            return WIDTH_DEFAULT.TIME_DURATION;
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
    console.log(aValue);
};
const onClickPopupItem = (aPopupName: PopupType) => {
    sPopupType.value = aPopupName;
    sDialog.value = true;
};
store.dispatch(ActionTypes.fetchBoardList);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
