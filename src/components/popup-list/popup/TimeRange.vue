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
                <!-- <p class="title">Refreshing every</p> -->
                <div class="row row-form">
                    <!-- <ComboboxTime @e-on-change="changeRefresh" /> -->
                    <v-btn @click="onSetting" class="button-apply" variant="outlined"> Apply </v-btn>
                </div>
            </div>
        </div>
        <TimeRange @eOnTimeRange="OnTimeRange" class="col-right" />
    </div>
</template>

<script setup lang="ts" name="TimeRange">
import DatePicker from '@/components/common/date-picker/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import TimeRange, { TimeRangeInput } from '@/components/common/date-list/date-time-range.vue';
import { computed, defineEmits, ref, defineProps, onMounted } from 'vue';
import { formatDate } from '@/utils/utils';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { TimeLineType } from '@/interface/date';
import { toast, ToastOptions } from 'vue3-toastify';
interface TimeRangeProps {
    pTimeRange?: TimeLineType;
}
const props = defineProps<TimeRangeProps>();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
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

function isValidDateTimeFormat(input: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    const nowRegex = /^now\s*([-+]\s*\d+[dhmsyM])?$/;

    return dateRegex.test(input) || nowRegex.test(input) || input === 'now';
}

const onSetting = () => {
    if (isValidDateTimeFormat(dateStart.value) && isValidDateTimeFormat(dateEnd.value)) {
        store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value, refresh: refresh.value }).then(() => onClosePopup());
    } else {
        toast('Please match the format.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    }
};

const onClosePopup = () => {
    emit('eClosePopup');
};
onMounted(() => {
    dateStart.value = cTimeRange.value.start;
    dateEnd.value = cTimeRange.value.end;
    refresh.value = cTimeRange.value.refresh;
});
const emit = defineEmits(['eClosePopup']);
</script>

<style lang="scss" scoped>
@import 'index.scss';
.row-form {
    padding-top: 30px;
    display: flex;
    justify-content: end;
    button {
        margin: 0 !important;
    }
}
</style>
