<template>
    <v-dialog
        v-model="sDialog"
        @update:model-value="onClosePopup"
        class="dialog-wrap"
        :class="cIsDarkMode ? 'dark' : 'light'"
        transition="dialog-top-transition"
        :width="pWidth || '400px'"
    >
        <div class="dialog-wrap__content">
            <div class="dialog-wrap__content--header">
                <p>{{ pType === PopupType.TIME_DURATION ? PopupType.TIME_RANGE : pType }}</p>
                <img @click="onClosePopup" :src="i_b_close" />
            </div>
            <div class="dialog-wrap__content--body">
                <ManageDashboard v-if="pType === PopupType.MANAGE_DASHBOARD" @eClosePopup="onClosePopup" />
                <NewChart v-if="pType === PopupType.NEW_CHART" @eClosePopup="onClosePopup" />
                <NewTags v-if="pType === PopupType.NEW_TAGS" @e-submit="onSubmitTag" @eClosePopup="onClosePopup" :no-of-select-tags="props.pNoOfSelectTags as number" />
                <Preferences v-if="pType === PopupType.PREFERENCES" @eClosePopup="onClosePopup" />
                <SaveDashboard v-if="pType === PopupType.SAVE_DASHBOARD" @eClosePopup="onClosePopup" />
                <TimeRange v-if="pType === PopupType.TIME_RANGE" @eClosePopup="onClosePopup" :p-time-range="pTimeRange" />
                <TimeDuration
                    v-if="pType === PopupType.TIME_DURATION"
                    @eClosePopup="onClosePopup"
                    @eSettingPopup="onSettingPopup"
                    :p-is-from-time="pIsFromTime"
                    :p-time-range="pTimeRange"
                />
                <AddTab v-if="pType === PopupType.ADD_TAB" @eClosePopup="onClosePopup" />
            </div>
        </div>
    </v-dialog>
</template>

<script setup lang="ts" name="PopupWrap">
import i_b_close from '@/assets/image/i_b_close.png';
import { PopupType } from '@/enums/app';
import { useStore } from '@/store';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';
import ManageDashboard from './popup/ManageDashboard.vue';
import NewChart from './popup/NewChart.vue';
import NewTags from './popup/NewTags.vue';
import Preferences from './popup/Preferences.vue';
import SaveDashboard from './popup/SaveDashboard.vue';
import AddTab from '@/components/popup-list/popup/AddTab.vue';
import TimeDuration from './popup/TimeDuration.vue';
import TimeRange from './popup/TimeRange.vue';
import { TimeLineType } from '@/interface/date';
const onSubmitTag = (data: any) => {
    emit('eSubmitTags', data);
};
interface PopupWrapProps {
    pType: PopupType;
    pShow: boolean;
    pWidth?: string;
    pNoOfSelectTags?: number;
    pIsFromTime?: boolean;
    pTimeRange?: TimeLineType;
}
const props = defineProps<PopupWrapProps>();
const emit = defineEmits(['eClosePopup', 'eSubmitTags', 'eSettingPopup']);
const store = useStore();
const sDialog = ref<boolean>(false);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const onClosePopup = () => {
    sDialog.value = false;
    emit('eClosePopup');
};
const onSettingPopup = (aValue: any) => {
    sDialog.value = false;
    emit('eSettingPopup', aValue);
};

watch(
    () => props.pShow,
    () => {
        if (props.pShow === true) sDialog.value = true;
    }
    // { immediate: true }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
