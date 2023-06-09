<template>
    <v-dialog
        v-model="sDialog"
        @update:model-value="onClosePopup"
        class="dialog-wrap"
        :class="cIsDarkMode ? 'dark' : 'light'"
        :fullscreen="pType === 'EDIT CHART'"
        :style="pType === 'EDIT CHART' ? {} : { marginTop: '5%' }"
        transition="dialog-top-transition"
        :width="pType === 'EDIT CHART' ? '100%' : pWidth || '400px'"
    >
        <div class="dialog-wrap__content" :style="pType === 'EDIT CHART' ? { height: '100%' } : {}">
            <div class="dialog-wrap__content--header">
                <p>{{ pType === PopupType.TIME_DURATION ? PopupType.TIME_RANGE : pType === PopupType.FILE_BROWSER ? pInfo : pType }}</p>
                <img @click="onClosePopup" :src="i_b_close" />
            </div>
            <div class="dialog-wrap__content--body" :style="pType === 'EDIT CHART' ? { height: 'calc(100% - 45px)' } : {}">
                <NewChart v-if="pType === PopupType.NEW_CHART" @eClosePopup="onClosePopup" />
                <License v-if="pType === PopupType.LICENSE" @eClosePopup="onClosePopup" />
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
                <ChartEdit v-if="pType === 'EDIT CHART'" :id="props.id" @eClosePopup="onClosePopup" :p-tab-idx="props.pTabIdx" />

                <AddTab v-if="pType === PopupType.ADD_TAB" @eClosePopup="onClosePopup" />
                <div v-if="pType === 'SHOW CONTENT'" @eClosePopup="onClosePopup">
                    <div class="content-info">
                        <div class="answer">
                            {{ changeNumberType(pInfo) }}
                        </div>
                    </div>
                </div>

                <FileBrowser v-if="pType === PopupType.FILE_BROWSER" @eClosePopup="onClosePopup" :p-info="pInfo" :p-new-open="pNewOpen" :p-upload-type="pUploadType" />
            </div>
        </div>
    </v-dialog>
</template>

<script setup lang="ts" name="PopupWrap">
import i_b_close from '@/assets/image/i_b_close.png';
import { PopupType } from '@/enums/app';
import { useStore } from '@/store';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';
import FileBrowser from './popup/FileBrowser.vue';
import NewChart from './popup/NewChart.vue';
import NewTags from './popup/NewTags.vue';
import License from './popup/License.vue';
import Preferences from './popup/Preferences.vue';
import SaveDashboard from './popup/SaveDashboard.vue';
import AddTab from '@/components/popup-list/popup/AddTab.vue';
import TimeDuration from './popup/TimeDuration.vue';
import TimeRange from './popup/TimeRange.vue';
import ChartEdit from '@/pages/chart-edit/index.vue';
import { TimeLineType } from '@/interface/date';
import { changeNumberType } from '@/utils/utils';

const onSubmitTag = (data: any) => {
    emit('eSubmitTags', data);
};
interface PopupWrapProps {
    pType: PopupType;
    pShow: boolean;
    pWidth?: string;
    pUploadType?: any;
    pNoOfSelectTags?: number;
    pNewOpen?: string;
    pIsFromTime?: boolean;
    pTimeRange?: TimeLineType;
    id?: number;
    pTabIdx?: number;
    pInfo?: string;
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
.content-info {
    width: 100%;
    word-break: break-all;
    .header {
        display: flex;
        justify-content: center;
        font-size: 16px;
        font-weight: 600;
    }
}
</style>
