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
                        <div class="item">{{ PREFERENCE }}</div>
                        <div class="item">{{ MANAGE_DASHBOARD }}</div>
                        <div class="item">{{ REQUEST_ROLLUP }}</div>
                    </div>
                </div>
                <img :src="i_b_menu_1" class="icon" />
                <div class="header__link--group-item">{{ LOGOUT }}</div>
            </div>
        </div>
        <ComboboxTime />
        <div class="header__tool">
            <div v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard' || sHeaderType === 'share-view'" class="time-range icon">{{ TIME_RANGE_NOT_SET }}</div>
            <!-- <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'" :src="i_b_timerange" class="icon" />             -->
            <v-icon v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'" class="icon" icon="mdi-content-save"></v-icon>
            <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard' || sHeaderType === 'share-view'" :src="i_b_timerange" class="icon" />
            <img :src="i_b_refresh" class="icon" />
            <img v-if="sHeaderType === 'tag-view' || sHeaderType === 'new-dashboard'" :src="i_b_share" class="icon" />
            <img v-if="sHeaderType === 'edit-chart'" :src="i_b_save_2" class="icon" />
            <img v-if="sHeaderType === 'edit-chart'" :src="i_b_close" class="icon" />
        </div>
    </div>
</template>

<script setup lang="ts" name="Header">
import logo from '@/assets/image/i_logo.png';
import i_b_menu_1 from '@/assets/image/i_b_menu_1.png';
import i_b_close from '@/assets/image/i_b_close.png';
import i_b_refresh from '@/assets/image/i_b_refresh.png';
import i_b_save_2 from '@/assets/image/i_b_save_2.png';
import i_b_share from '@/assets/image/i_b_share.png';
import i_b_timerange from '@/assets/image/i_b_timerange.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import { Board } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { ref, computed } from 'vue';
import { NEW_DASHBOARD, SET, LOGOUT, MANAGE_DASHBOARD, REQUEST_ROLLUP, PREFERENCE, TIME_RANGE_NOT_SET } from './constant';

export type headerType = 'tag-view' | 'share-view' | 'chart-view' | 'edit-chart' | 'new-dashboard';
const sHeaderType = ref<headerType>('tag-view');

const store = useStore();
const childGroup = ref();
const cBoardList = computed((): Board[] => store.state.gBoardList);
const cBoardListSelect = computed(() =>
    cBoardList.value.map((aItem) => {
        return {
            ...aItem,
            id: aItem.board_id,
            name: aItem.board_name,
        };
    })
);
const onChildGroup = () => {
    childGroup.value.classList.toggle('active');
};

store.dispatch(ActionTypes.fetchBoardList);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
