<template>
    <div v-if="props.pIsZoom" class="view-port">
        <div class="view-port__header">
            <div class="view-port__header--events">
                <div class="date-picker button" @click="onOpenPopup(false)">{{ toDateUtcChart(sDateLeft) }}</div>
                <div class="button blue" @click="onUndoTime()">Undo</div>
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
                    <v-icon :color="cIsDarkMode ? '#fff' : '#2ec0df'" size="x-large" icon="mdi-image-filter-center-focus-strong-outline" @click="adjustViewportFocus"></v-icon>
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
                <button :class="props.pIsRaw ? '' : 'font-color'" class="button" @click="onChangeEmit(0)">STAT</button>
                <button :class="props.pIsRaw ? 'font-color' : ''" class="button" @click="onChangeEmit(1)">RAW</button>
                <div class="date-picker button" @click="onOpenPopup(true)">{{ toDateUtcChart(sDateRight) }}</div>
            </div>
        </div>
        <v-icon icon="mdi-close-thick" class="icon-close" @click="emit('eonCloseNavigator')"></v-icon>
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
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { LinePanel } from '@/interface/chart';
import { TimeLineType } from '@/interface/date';
import { useStore } from '@/store';
import { computed, defineEmits, defineProps, ref, watch, withDefaults } from 'vue';
import { toDateUtcChart, toTimeUtcChart } from '@/utils/utils';

interface ViewPortProps {
    panelInfo: LinePanel;
    rangeTime: TimeLineType;
    pIsRaw: boolean;
    pIsZoom: boolean;
}

const props = withDefaults(defineProps<ViewPortProps>(), {});
const emit = defineEmits(['eOnChange', 'eOnChangeAdjust', 'eOnChangeSRF', 'eOnFocus', 'eonCloseNavigator', 'eOnUndoTime']);
const store = useStore();
const sDialog = ref<boolean>(false);
const sDateLeft = ref<number>(0);
const sDateRight = ref<number>(0);
const sIsFromTime = ref<boolean>(false);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const onChangeEmit = (aValue: number) => {
    emit('eOnChangeSRF', aValue);
};
const adjustViewportRange = (aEvent: { type: 'O' | 'I' | 'F'; zoom: number }) => {
    emit('eOnChangeAdjust', aEvent);
};
const adjustViewportFocus = () => {
    emit('eOnFocus');
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
const onUndoTime = () => {
    emit('eOnUndoTime');
};

watch(
    () => props.rangeTime,
    () => {
        sDateLeft.value = props.rangeTime.startTime;
        sDateRight.value = props.rangeTime.endTime;
    },
    {
        deep: true,
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
.font-color {
    color: #4050cd !important;
}
</style>
