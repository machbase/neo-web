<template>
    <div class="date-time">
        <p class="date-time__title title">Quick duration</p>
        <div class="date-time__body">
            <div v-for="(aItem, aIndex) in TIME_DURATION" :key="aIndex" class="col-duration">
                <div v-for="aTime in aItem" :key="aTime.key" class="text" @click="onSendTime(aTime)">{{ aTime.name }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="TimeDuration">
import { TIME_DURATION } from '@/utils/constants';
import { defineEmits } from 'vue';

type Data = {
    key: number;
    name: string;
    value: string;
    number: number;
    format: string;
};
const emit = defineEmits(['eOnTimeDuration']);
const onSendTime = (aTime: Data) => {
    emit('eOnTimeDuration', aTime);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
