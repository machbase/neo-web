<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <div>
                From
                <Datepicker v-model="dateStart" auto-apply :dark="false">
                    <template #trigger>
                        <span>Img</span>
                        <input :value="dateStart"/>
                        <!-- <span><img src="" /></span> -->
                    </template>
                </Datepicker>
            </div>
            <div>To<Datepicker v-model="dateEnd" text-input auto-apply></Datepicker></div>
            <div>
                <p>Refreshing every</p>
                <div class="row"><ComboboxTime /><v-btn variant="outlined"> Apply </v-btn></div>
            </div>
        </div>
        <TimeRange @eOnTimeRange="OnTimeRange" />
    </div>
</template>

<script setup lang="ts" name="TimeRange">
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, reactive, ref } from 'vue';
const timeRange = reactive<any>({
    start: '',
    end: '',
});
const OnTimeRange = (data: any) => {
    console.log('🚀 ~ file: index.vue:26 ~ onClickScale ~ data', data);
    timeRange.start = data.value[0];
    dateStart.value = data.value[0];
    timeRange.end = data.value[1];
    console.log('🚀 ~ file: TimeRange.vue:29 ~ OnTimeRange ~ timeRange', timeRange);
};
const value = timeRange.start;
const format = (date: any) => {
    // const day = date.getDate();
    // const month = date.getMonth() + 1;
    // const year = date.getFullYear();
    return `Selected date is ${timeRange.start}`;
};
const emit = defineEmits(['eClosePopup']);
const dateStart = ref();
const dateEnd = ref();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
