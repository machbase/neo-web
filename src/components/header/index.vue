<template>
    <div class="header">
        <div class="header__link">
            <img :src="logo" class="icon" />
            <ComboboxSelect v-if="sHeaderType === 'tag-view'" :p-data="cBoardListSelect" :p-value="cBoardListSelect[0]?.id" />
            <div v-if="sHeaderType === 'share-view'" class="share-header">{{ NEW_DASHBOARD }}</div>
            <div v-if="sHeaderType === 'tag-view'" class="header__link--group">
                <div class="header__link--group-item">{{ NEW_DASHBOARD }}</div>
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
            <div
                v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard' || sHeaderType === 'share-view'"
                class="time-range icon"
                @click="onClickPopupItem(PopupType.TIME_RANGE)"
            >
                {{ TIME_RANGE_NOT_SET }}
            </div>
            <!-- <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'" :src="i_b_timerange" class="icon" />             -->
            <v-icon
                v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'"
                class="icon"
                icon="mdi-content-save"
                @click="onClickPopupItem(PopupType.SAVE_DASHBOARD)"
            ></v-icon>
            <img
                v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard' || sHeaderType === 'share-view'"
                :src="i_b_timerange"
                class="icon"
                @click="onClickPopupItem(PopupType.TIME_RANGE)"
            />
            <img :src="i_b_refresh" class="icon" />
            <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'" :src="i_b_share" class="icon" />
            <img v-if="sHeaderType === 'edit-chart'" :src="i_b_save_2" class="icon" />
            <img v-if="sHeaderType === 'edit-chart'" :src="i_b_close" class="icon" />
        </div>
    </div>
    <PopupWrap :p-type="sPopupType" :p-show="sDialog" :p-width="cWidthPopup" @eClosePopup="onClosePopup" />
</template>

<script setup lang="ts" name="Header">
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
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, ref } from 'vue';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET } from './constant';

export type headerType = 'tag-view' | 'share-view' | 'chart-view' | 'edit-chart' | 'new-dashboard';
const sHeaderType = ref<headerType>('tag-view');

const store = useStore();
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
            return '400';
        default:
            return '400px';
    }
});
const onChildGroup = () => {
    childGroup.value.classList.toggle('active');
};
const onClosePopup = () => {
    console.log('first');
    sDialog.value = false;
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
