<template>
    <div class="time-duration-wrapper">
        <div class="col-left">
            <p class="title">From</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" />
                <input :value="formatDate(dateStart)" type="text" class="input" />
            </div>
            <p class="title">To</p>
            <div class="row">
                <DatePicker :p-disabled="true" @e-change-time="changeTimeEnd" />
                <input :value="formatDate(dateEnd)" type="text" class="input" disabled />
            </div>
            <div>
                <p class="title">Duration</p>
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
import moment from 'moment';
import DatePicker from '@/components/common/date-picker/index.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import { computed, defineEmits, reactive, ref, onMounted } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { fetchRangeData } from '@/api/repository/machiot';
const store = useStore();
onMounted(async () => {
    const data: any = await fetchRangeData();
    dateStart.value = formatDate(data.Data[0].MIN);
    dateEnd.value = formatDate(data.Data[0].MAX);
    console.log('🚀 ~ file: TimeDuration.vue:43 ~ onMounted ~ Data', data);
});
const changeTimeStart = (data: Date) => {
    dateStart.value = data;
    if (duration.value) {
        const date = moment(data);
        dateEnd.value = date.add(number.value, format.value);
    }
};
const changeTimeEnd = (data: Date) => {
    dateEnd.value = data;
};
const OnTimeRange = (data: any) => {
    console.log('🚀 ~ file: TimeDuration.vue:44 ~ OnTimeRange ~ data', data);
    duration.value = data.value;
    number.value = data.number;
    format.value = data.format;
    const date = moment(dateStart.value);
    dateEnd.value = date.add(data.number, data.format);
    // dateEnd.value = data.value[1];
};
const onSetting = () => {
    onClosePopup();
    // store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value }).then(() => onClosePopup());
};

const onClosePopup = () => {
    emit('eClosePopup');
};
const emit = defineEmits(['eClosePopup']);
const dateStart = ref();
const dateEnd = ref();
const duration = ref();
const number = ref();
const format = ref();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
