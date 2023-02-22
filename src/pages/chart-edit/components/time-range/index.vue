<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <p>From (default value)</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input :value="dateStart" type="text" class="input" />
            </div>
            <p>To (default value)</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeEnd" />
                <input :value="dateEnd" type="text" class="input" />
            </div>
            <div>
                <p>Refreshing every</p>
                <ComboboxTime @e-on-change="changeRefresh" />
            </div>
        </div>
        <TimeRange @eOnTimeRange="OnTimeRange" />
    </div>
</template>

<script setup lang="ts" name="TimeRangeTab">
import DatePicker from '@/components/common/date-picker/index.vue';
// import '@vuepic/vue-datepicker/dist/main.css';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange, { TimeRangeInput } from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, reactive, ref, watch, watchEffect } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { useRoute } from 'vue-router';
import { PanelInfo } from '@/interface/chart';

const emit = defineEmits(['eOnChange']);
const store = useStore();
const route = useRoute();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const chartSelected = CPanels.value[route.params.id as any];
const dateStart = ref(chartSelected[0].range_bgn);
const dateEnd = ref(chartSelected[0].range_end);
const refresh = ref(chartSelected[0].refresh);
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

watchEffect(() => {
    const data: Partial<PanelInfo> = {
        range_bgn: dateStart.value,
        range_end: dateEnd.value,
        refresh: refresh.value,
    };
    emit('eOnChange', data);
});

// const emit = defineEmits(['eChangeStart', 'eChangeEnd', 'eChangeRefresh']);
// watch(
//     () => dateStart.value,
//     () => emit('eChangeStart', dateStart.value)
// );
// watch(
//     () => dateEnd.value,
//     () => emit('eChangeEnd', dateEnd.value)
// );
// watch(
//     () => refresh.value,
//     () => emit('eChangeRefresh', refresh.value)
// );
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
