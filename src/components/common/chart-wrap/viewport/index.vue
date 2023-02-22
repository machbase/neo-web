<template>
    <div class="view-port">
        <div class="view-port__header">
            <div class="view-port__header--events">
                <div class="date-picker button" @click="onOpenPopup(false)">{{ sDateLeft }}</div>
                <div class="button blue">Undo</div>
            </div>
            <div class="view-port__header--events icon">
                <div>
                    <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline" @click="adjustViewportRange({ type: 'O', zoom: 0.4 })"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom out x4</v-tooltip>
                </div>
                <div>
                    <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline" @click="adjustViewportRange({ type: 'O', zoom: 0.2 })"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom out x2</v-tooltip>
                </div>
                <div>
                    <v-icon color="#fff" size="x-large" icon="mdi-image-filter-center-focus-strong-outline" @click="adjustViewportRange({ type: 'O', zoom: 1 })"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Focus</v-tooltip>
                </div>
                <div>
                    <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline" @click="adjustViewportRange({ type: 'I', zoom: 0.2 })"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom in x2</v-tooltip>
                </div>
                <div>
                    <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline" @click="adjustViewportRange({ type: 'I', zoom: 0.4 })"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom in x4</v-tooltip>
                </div>
            </div>
            <div class="view-port__header--events">
                <div class="button" @click="onChangeEmit('1')">STAT</div>
                <div class="button" @click="onChangeEmit('2')">RAW</div>
                <div class="button" @click="onChangeEmit('3')">FAST</div>
                <div class="date-picker button" @click="onOpenPopup(true)">{{ sDateRight }}</div>
            </div>
        </div>
        <v-icon icon="mdi-close-thick" class="icon-close"></v-icon>
        <PopupWrap
            :width="'667px'"
            :p-type="PopupType.TIME_DURATION"
            :p-time-range="{ endTime: sDateRight, startTime: sDateLeft }"
            :p-show="sDialog"
            :p-is-from-time="sIsFromTime"
            @e-close-popup="onClosePopup"
            @eSettingPopup="onSettingPopup"
        />
        <!-- @eSettingPopup="onSettingPopup" -->
    </div>
</template>

<script setup lang="ts" name="ViewPort">
import i_b_close from '@/assets/image/i_b_close.png';
import { LinePanel } from '@/interface/chart';
import PopupWrap from '@/components/popup-list/index.vue';
import { useStore } from '@/store';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { formatDate } from '@/utils/utils';
import Datepicker from '@vuepic/vue-datepicker';
import moment from 'moment';
import { ref, watch, defineEmits, defineProps, withDefaults, computed } from 'vue';
import { PopupType } from '@/enums/app';
import { TimeLineType } from '@/interface/date';

interface ViewPortProps {
    panelInfo: LinePanel;
    rangeTime: TimeLineType;
}
const props = withDefaults(defineProps<ViewPortProps>(), {});
const emit = defineEmits(['eOnChange', 'eOnChangeAdjust']);
const store = useStore();
const sDialog = ref<boolean>(false);
const sDateLeft = ref<string | number>('');
const sDateRight = ref<string | number>('');
const sIsFromTime = ref<boolean>(false);
const cRangeData = computed(() => store.state.gRangeData);
const onChangeEmit = (aValue: any) => {
    console.log('aValue', aValue);
};
const adjustViewportRange = (aEvent: { type: 'O' | 'I'; zoom: number }) => {
    emit('eOnChangeAdjust', aEvent);
};
const onOpenPopup = (isFrom: boolean) => {
    sIsFromTime.value = isFrom;
    sDialog.value = true;
};
const onClosePopup = () => {
    sDialog.value = false;
};
const onSettingPopup = (aDate: any) => {
    sDialog.value = false;
    emit('eOnChange', aDate);
};

watch(
    () => props.rangeTime,
    () => {
        sDateLeft.value =
            typeof props.rangeTime.startTime === 'string' ? moment(formatDate(props.rangeTime.startTime as string)).format(FORMAT_FULL_DATE) : props.rangeTime.startTime;
        sDateRight.value = typeof props.rangeTime.endTime === 'string' ? moment(formatDate(props.rangeTime.endTime as string)).format(FORMAT_FULL_DATE) : props.rangeTime.endTime;
    },    
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
