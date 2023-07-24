<template>
    <Datepicker
        v-model="sDate"
        auto-apply
        class="date-picker"
        :class="{ disabled: pDisabled }"
        :dark="cIsDarkMode"
        :disabled="pDisabled"
        enable-seconds
        :format="'yyyy-MM-dd HH:mm'"
        position="left"
    >
        <template #trigger>
            <img class="input-slot-image" :src="icon" />
        </template>
    </Datepicker>
</template>

<script setup lang="ts" name="DatePicker">
import icon from '@/assets/image/ic_calendar.png';
import { useStore } from '@/store';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { defineEmits, withDefaults, defineProps, ref, watch, computed } from 'vue';
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
