<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <p>From (default value)</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input v-model="dateStart" type="text" class="input" />
            </div>
            <p>To (default value)</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeEnd" />
                <input v-model="dateEnd" type="text" class="input" />
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
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange, { TimeRangeInput } from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, reactive, ref, watch, watchEffect, defineProps } from 'vue';
import { formatDate } from '@/utils/utils';
import { PanelInfo } from '@/interface/chart';

interface PropsTab {
    pChartData: PanelInfo;
}
const props = defineProps<PropsTab>();
const emit = defineEmits(['eOnChange']);
const dateStart = ref(props.pChartData.range_bgn);
const dateEnd = ref(props.pChartData.range_end);
const refresh = ref(props.pChartData.refresh);
const changeTimeStart = (data: Date) => {
    console.log('changeTimeStart', data);
    dateStart.value = formatDate(data);
};
const changeRefresh = (data: string) => {
    refresh.value = data;
};
const changeTimeEnd = (data: Date) => {
    console.log('changeTimeEnd', data);
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
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
