<template>
    <Datepicker v-model="sDate" class="date-picker" :format="'yyyy-MM-dd HH:mm'" position="left" :dark="cIsDarkMode">
        <template #input-icon>
            <img class="input-slot-image" :src="icon" />
        </template>
    </Datepicker>
</template>

<script setup lang="ts" name="DatePicker">
import icon from '@/assets/image/ic_calendar.svg';
import { useStore } from '@/store';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { defineEmits, ref, watch, computed } from 'vue';

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
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
