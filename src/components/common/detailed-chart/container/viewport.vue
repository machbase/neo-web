<template>
    <div v-if="!props.panelInfo.option" class="view-port">
        <div class="move-chart-size" :style="{ left: '7px' }">
            <div @click="moveChart('left')" @mouseleave="sDateMove = false" @mouseover="sDateMove = true" class="form">
                <v-icon color="#0fc9f0" size="36px">mdi-chevron-left</v-icon>
            </div>
        </div>
        <div class="move-chart-size" :style="{ right: '7px' }">
            <div @click="moveChart('right')" @mouseleave="sDateMove = false" @mouseover="sDateMove = true" class="form">
                <v-icon color="#0fc9f0" size="36px">mdi-chevron-right</v-icon>
            </div>
        </div>
        <div></div>
        <div class="view-port__header">
            <!-- <div class="view-port__header--events">
                <div @click="onOpenPopup(false)" class="date-picker button">{{ toDateUtcChart(sDateLeft) }}</div>
                <div @click="onUndoTime()" class="button blue">Undo</div>
            </div> -->
            <div class="view-port__header--events icon">
                <div>
                    <v-icon @click="adjustViewportRange({ type: 'I', zoom: 0.4 })" color="#0fc9f0" icon="mdi-magnify-minus-outline" size="24px"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom out x4</v-tooltip>
                </div>
                <div>
                    <v-icon @click="adjustViewportRange({ type: 'I', zoom: 0.2 })" color="#0fc9f0" icon="mdi-magnify-minus-outline" size="24px"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom out x2</v-tooltip>
                </div>
                <div class="icon-div">
                    <img @click="addChart('fft')" class="icon-size-fft" src="@/assets/image/btn_fft.png" />
                    <!-- <img @click="addChart('rms')" class="icon-size icon-size-rms" src="@/assets/image/btn_rms.png" /> -->
                </div>
                <div>
                    <v-icon @click="adjustViewportRange({ type: 'O', zoom: 0.2 })" color="#0fc9f0" icon="mdi-magnify-plus-outline" size="24px"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom in x2</v-tooltip>
                </div>
                <div>
                    <v-icon @click="adjustViewportRange({ type: 'O', zoom: 0.4 })" color="#0fc9f0" icon="mdi-magnify-plus-outline" size="24px"></v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom in x4</v-tooltip>
                </div>
            </div>
            <div class="view-port__header--events">
                <!-- <div>
                    <div class="cover-parent">
                        <button @click="onChangeEmit(0)" class="button" :class="props.pIsRaw ? 'not-select-font-color' : 'font-color'">STAT</button>
                    </div>
                    <v-tooltip
                        v-if="props.pIsRaw && props.pTimeRange.startTime - props.pTimeRange.endTime > props.panelInfo.raw_chart_threshold"
                        activator="parent"
                        location="bottom"
                        >The stat must be greater than <br />
                        the raw data time range (millisecond) value.</v-tooltip
                    >
                </div>

                <button @click="onChangeEmit(1)" class="button" :class="props.pIsRaw ? 'font-color' : 'not-select-font-color'">RAW</button>
                <div @click="onOpenPopup(true)" class="date-picker button">{{ toDateUtcChart(sDateRight) }}</div> -->
            </div>
        </div>
        <!-- <v-icon @click="emit('eonCloseNavigator')" class="icon-close" icon="mdi-close-thick"></v-icon> -->
        <PopupWrap
            @e-close-popup="onClosePopup"
            @eSettingPopup="onSettingPopup"
            :p-is-from-time="sIsFromTime"
            :p-show="sDialog"
            :p-time-range="{ endTime: sDateRight, startTime: sDateLeft }"
            :p-type="PopupType.TIME_DURATION"
            :width="'667px'"
        />
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
import { MutationTypes } from '../../../../store/mutations';

interface ViewPortProps {
    panelInfo: LinePanel;
    rangeTime: TimeLineType;
    pIsRaw: boolean;
    pTimeRange: TimeLineType;
    pIsZoom: boolean;
    pPanelIndex: number;
    pDataRange: number;
    pXAxisMaxRange: number;
}

const props = withDefaults(defineProps<ViewPortProps>(), {});
const emit = defineEmits(['eOnChange', 'eOnChangeAdjust', 'eOnChangeSRF', 'eOnFocus', 'eonCloseNavigator', 'eOnUndoTime', 'eMoveFocus']);
const store = useStore();
const sDialog = ref<boolean>(false);
const sDateLeft = ref<number>(0);
const sDateMove = ref<boolean>(false);
const sDateRight = ref<number>(0);
const sIsFromTime = ref<boolean>(false);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const onChangeEmit = (aValue: number) => {
    emit('eOnChangeSRF', aValue);
};
const adjustViewportRange = (aEvent: { type: 'O' | 'I' | 'F'; zoom: number }) => {
    emit('eOnChangeAdjust', aEvent);
};
const moveChart = (aType: string) => {
    emit('eMoveFocus', aType);
};
const adjustViewportFocus = () => {
    emit('eOnFocus');
};
const onOpenPopup = (isFrom: boolean) => {
    sIsFromTime.value = isFrom;
    sDialog.value = true;
};
const addChart = (aType: string) => {
    store.commit(MutationTypes.setAddFftChart, { index: props.pPanelIndex, option: aType, maxTime: props.pXAxisMaxRange, range: props.pDataRange });
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
    border: 1px solid #4050cd;
    box-shadow: inset 0 1px 1px rgb(0 0 0 / 8%), 0 0 8px rgb(102 175 233 / 30%);
}
.cover {
    position: absolute;
    width: 100%;
    height: 100%;
    background: black;
    opacity: 0.2;
}
.cover-parent {
    position: relative;
}
.not-select-font-color {
    border: 1px solid #383838;
}

.icon-div {
    display: flex;
    height: 100%;
    gap: 10px;
    padding-bottom: 1px;
    padding: 0 10px;
    align-items: center;
    .icon-size-fft {
        cursor: pointer;
        width: 22px;
        height: 22px;
    }
    .icon-size-rms {
        cursor: pointer;
        width: 28px;
        height: 28px;
    }
}
</style>
