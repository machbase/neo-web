<template>
    <div class="date-time">
        <p class="date-time__title">Quick range</p>
        <div class="date-time__body">
            <div v-for="(aItem, aIndex) in TIME_RANGE" :key="aIndex" class="col">
                <div v-for="aTime in aItem" :key="aTime.key" class="text" @click="onSendTime(aTime)">{{ aTime.name }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="TimeRange">
import { TIME_RANGE } from '@/utils/constants';
import { defineEmits } from 'vue';

export type TimeRangeInput = {
    key: number;
    name: string;
    value: string[];
};
const emit = defineEmits(['eOnTimeRange']);
const onSendTime = (aTime: TimeRangeInput) => {
    emit('eOnTimeRange', aTime);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
