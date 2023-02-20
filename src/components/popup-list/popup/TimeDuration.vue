<template>
    <div class="time-duration-wrapper">
        <div class="col-left">
            <p>From</p>
            <div class="row">
                <DatePicker :p-init="formatDate(dateStart)" @e-change-time="changeTimeStart" />
                <input :value="formatDate(dateStart)" type="text" class="input" />
            </div>
            <p>To</p>
            <div class="row">
                <DatePicker :p-init="formatDate(dateEnd)" :p-disabled="false" @e-change-time="changeTimeEnd" />
                <input :value="formatDate(dateEnd)" type="text" class="input" :disabled="false" />
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
import { FORMAT_FULL_DATE } from '@/utils/constants';

const store = useStore();
const dateStart = ref();
const dateEnd = ref();
const duration = ref();
const number = ref();
const format = ref();

const changeTimeStart = (data: Date) => {
    // console.log('data', data);
    dateStart.value = data;
    // if (duration.value) {
    //     const date = moment(data);
    //     dateEnd.value = date.add(number.value, format.value);
    // }
};
const changeTimeEnd = (data: Date) => {
    dateEnd.value = moment(data).format(FORMAT_FULL_DATE);
};
const OnTimeRange = (data: any) => {
    duration.value = data.value;
    number.value = data.number;
    format.value = data.format;
    dateEnd.value = moment(dateStart.value).add(data.number, data.format).format(FORMAT_FULL_DATE);
};
const onSetting = () => {
    onClosePopup();
    // store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value }).then(() => onClosePopup());
};

const onClosePopup = () => {
    // emit('eClosePopup');
    console.log('dateStart', dateStart.value);
    console.log('dateEnd', dateEnd.value);
};
const emit = defineEmits(['eClosePopup']);

onMounted(async () => {
    const data: any = await fetchRangeData();
    dateStart.value = formatDate(data.Data[0].MIN);
    dateEnd.value = formatDate(data.Data[0].MAX);
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
