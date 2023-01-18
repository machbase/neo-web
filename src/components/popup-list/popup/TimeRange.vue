<template>
    <div class="time-range-wrapper">
        <div class="col-left">
            <div>From<Datepicker v-model="dateStart"></Datepicker></div>
            <div>To<Datepicker v-model="dateEnd"></Datepicker></div>
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
const OnTimeRange = (data: any) => {
    console.log('🚀 ~ file: index.vue:26 ~ onClickScale ~ data', data);
};
const emit = defineEmits(['eClosePopup']);
const dateStart = ref();
const dateEnd = ref();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
