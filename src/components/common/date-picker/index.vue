<template>
    <Datepicker
        v-model="sDate"
        class="date-picker"
        :class="{ disabled: pDisabled }"
        :format="'yyyy-MM-dd HH:mm'"
        position="left"
        :disabled="pDisabled"
        :dark="cIsDarkMode"
        auto-apply
        enable-seconds
    >
        <template #trigger>
            <img class="input-slot-image" :src="icon" />
        </template>
    </Datepicker>
</template>

<script setup lang="ts" name="DatePicker">
import icon from '@/assets/image/ic_calendar.svg';
import { useStore } from '@/store';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import moment from 'moment';
import { defineEmits, withDefaults, defineProps, ref, watch, computed, onMounted } from 'vue';
export interface DatePickerProps {
    pDisabled?: boolean;
    pInit?: string;
}
const props = withDefaults(defineProps<DatePickerProps>(), {
    pDisabled: false,
});

const emit = defineEmits(['eChangeTime']);
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sDate = ref<string>('');
watch(
    () => sDate.value,
    () => {
        emit('eChangeTime', sDate.value);
    }
);
watch(
    () => props.pInit,
    () => {
        if (!props.pInit) return;
        sDate.value = props.pInit;
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
