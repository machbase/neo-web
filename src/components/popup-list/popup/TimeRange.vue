<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <p class="title">From</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input v-model="dateStart" class="input" type="text" />
            </div>
            <p class="title">To</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeEnd" />
                <input v-model="dateEnd" class="input" type="text" />
            </div>
            <div>
                <p class="title">Refreshing every</p>
                <div class="row"><ComboboxTime @e-on-change="changeRefresh" /><v-btn @click="onSetting" class="button-apply" variant="outlined"> Apply </v-btn></div>
            </div>
        </div>
        <TimeRange @eOnTimeRange="OnTimeRange" class="col-right" />
    </div>
</template>

<script setup lang="ts" name="TimeRange">
import DatePicker from '@/components/common/date-picker/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange, { TimeRangeInput } from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, ref, defineProps } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { TimeLineType } from '@/interface/date';
interface TimeRangeProps {
    pTimeRange?: TimeLineType;
}
const props = defineProps<TimeRangeProps>();
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const cTimeRange = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);

    return { start: gTabList.value[sIdx].range_bgn, end: gTabList.value[sIdx].range_end, refresh: gTabList.value[sIdx].refresh };
});
const dateStart = ref('');
const dateEnd = ref('');
const refresh = ref();
const store = useStore();
const changeTimeStart = (data: Date) => {
    dateStart.value = formatDate(data);
};
const changeRefresh = (data: string) => {
    refresh.value = data;
};
const changeTimeEnd = (data: Date) => {
    dateEnd.value = formatDate(data);
};
const OnTimeRange = (data: TimeRangeInput) => {
    dateStart.value = data.value[0];
    dateEnd.value = data.value[1];
};
const onSetting = () => {
    store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value, refresh: refresh.value }).then(() => onClosePopup());
};

const onClosePopup = () => {
    emit('eClosePopup');
};
const emit = defineEmits(['eClosePopup']);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
