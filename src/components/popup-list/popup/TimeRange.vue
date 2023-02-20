<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <p class="title">From</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input :value="dateStart" type="text" class="input" />
            </div>
            <p class="title">To</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeEnd" />
                <input :value="dateEnd" type="text" class="input" />
            </div>
            <div>
                <p class="title">Refreshing every</p>
                <div class="row"><ComboboxTime @e-on-change="changeRefresh" /><v-btn class="button-apply" variant="outlined" @click="onSetting"> Apply </v-btn></div>
            </div>
        </div>
        <TimeRange @eOnTimeRange="OnTimeRange" />
    </div>
</template>

<script setup lang="ts" name="TimeRange">
import DatePicker from '@/components/common/date-picker/index.vue';
// import '@vuepic/vue-datepicker/dist/main.css';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange, { TimeRangeInput } from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, reactive, ref } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
const store = useStore();
const cTimeRange = computed(() => store.state.gTimeRange);
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
const dateStart = ref(cTimeRange.value.start);
const dateEnd = ref(cTimeRange.value.end);
const refresh = ref(cTimeRange.value.refresh);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
