<template>
    <div class="time-duration-wrapper">
        <div class="col-left">
            <p>From</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input :value="dateStart" type="text" class="input" />
            </div>
            <p>To</p>
            <div class="row">
                <DatePicker :p-disabled="true" @e-change-time="changeTimeEnd" />
                <input :value="dateEnd" type="text" class="input" disabled />
            </div>
            <div>
                <p>Duration</p>
                <div class="row"><input :value="duration" type="text" class="input" /></div>
            </div>
        </div>
        <div>
            <TimeDuration @eOnTimeDuration="OnTimeRange" />
            <div class="popup__btn-group">
                <v-btn variant="outlined" class="button-effect-color" @click="onSetting"> Ok </v-btn>
                <v-btn variant="outlined" class="button-effect" @click="onClosePopup"> Cancel </v-btn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="TimeDuration">
import DatePicker from '@/components/common/date-picker/index.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import { computed, defineEmits, reactive, ref } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
const store = useStore();
const cTimeRange = computed(() => store.state.gTimeRange);
const changeTimeStart = (data: Date) => {
    dateStart.value = formatDate(data);
};
const changeTimeEnd = (data: Date) => {
    dateEnd.value = formatDate(data);
};
const OnTimeRange = (data: any) => {
    console.log('🚀 ~ file: TimeDuration.vue:44 ~ OnTimeRange ~ data', data);
    duration.value = data.value;
    // dateEnd.value = data.value[1];
};
const onSetting = () => {
    store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value }).then(() => onClosePopup());
};

const onClosePopup = () => {
    emit('eClosePopup');
};
const emit = defineEmits(['eClosePopup']);
const dateStart = ref(cTimeRange.value.start);
const dateEnd = ref(cTimeRange.value.end);
const duration = ref();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
