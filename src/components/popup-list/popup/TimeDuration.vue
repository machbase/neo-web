<template>
    <div class="time-duration-wrapper">
        <div class="col-left">
            <p class="title">From</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeStart" :p-disabled="pIsFromTime" :p-init="dateStart" />
                <input v-model="dateStart" class="input disable-icon" :disabled="pIsFromTime" type="text" />
            </div>
            <p class="title">To</p>
            <div class="row">
                <DatePicker @e-change-time="changeTimeEnd" :p-disabled="!pIsFromTime" :p-init="dateEnd" />
                <input v-model="dateEnd" class="input disable-icon" :disabled="!pIsFromTime" type="text" />
            </div>
            <!-- <div>
                <p class="title">Duration</p>
                <div class="row"><input v-model="duration" class="input" type="text" /></div>
            </div> -->
        </div>
        <div class="col-right">
            <TimeDuration @eOnTimeDuration="OnTimeRange" />
            <div class="popup__btn-group">
                <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
                <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="TimeDuration">
import moment from 'moment';
import DatePicker from '@/components/common/date-picker/index.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import { defineEmits, ref, onMounted, defineProps, computed } from 'vue';
import { toDateUtcChart, toTimeUtcChart } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { fetchRangeData } from '@/api/repository/machiot';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { TimeLineType } from '@/interface/date';
import { toast, ToastOptions } from 'vue3-toastify';

interface TimeDurationProps {
    pIsFromTime?: boolean;
    pTimeRange?: TimeLineType;
}
const props = defineProps<TimeDurationProps>();
const store = useStore();
const dateStart = ref();
const dateEnd = ref();
const duration = ref();
const number = ref();
const format = ref();

const changeTimeStart = (data: Date) => {
    console.log(data);
    dateStart.value = moment(data).format(FORMAT_FULL_DATE);
};
const changeTimeEnd = (data: Date) => {
    dateEnd.value = moment(data).format(FORMAT_FULL_DATE);
};
const OnTimeRange = (data: any) => {
    duration.value = data.value;
    number.value = data.number;
    format.value = data.format;
    props.pIsFromTime === false
        ? (dateStart.value = moment(dateEnd.value).subtract(data.number, data.format).format(FORMAT_FULL_DATE))
        : (dateEnd.value = moment(dateStart.value).add(data.number, data.format).format(FORMAT_FULL_DATE));
};
const cIsDarkMode = computed(() => store.getters.getDarkMode) as any;

const onSetting = () => {
    const sRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    const sIsTrueTimeRange = toTimeUtcChart(dateStart.value) < toTimeUtcChart(dateEnd.value);

    if (sRegex.test(dateStart.value) && sRegex.test(dateEnd.value) && sIsTrueTimeRange) {
        emit('eSettingPopup', {
            dateStart: dateStart.value,
            dateEnd: dateEnd.value,
        });
    } else {
        toast('Please match the date format.', {
            autoClose: 1000,
            theme: !cIsDarkMode ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    }
};

const onClosePopup = () => {
    emit('eClosePopup');
};
const emit = defineEmits(['eClosePopup', 'eSettingPopup']);

onMounted(() => {
    if (props.pTimeRange) {
        dateStart.value = toDateUtcChart(props.pTimeRange.startTime);
        dateEnd.value = toDateUtcChart(props.pTimeRange.endTime);
    } else {
        const data: any = store.dispatch(ActionTypes.fetchRangeData, { table: store.state.gTableList[0], tagName: store.state.gTagList[0] });
        dateStart.value = toDateUtcChart(data.Data[0].min);
        dateEnd.value = toDateUtcChart(data.Data[0].max);
    }
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
