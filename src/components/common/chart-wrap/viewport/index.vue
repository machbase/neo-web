<template>
    <div class="view-port">
        <div class="view-port__header">
            <div class="view-port__header--events">
                <Datepicker v-model="sDateLeft" class="date-picker button" :preview-format="FORMAT_FULL_DATE" position="left" auto-apply enable-seconds>
                    <template #trigger>
                        <!-- <img class="input-slot-image" :src="icon" /> -->
                        <div>{{ moment(sDateLeft).format(FORMAT_FULL_DATE) }}</div>
                    </template>
                </Datepicker>
                <div class="button">undo</div>
            </div>
            <div class="view-port__header--events">
                <div class="icon">1</div>
                <div class="icon">1</div>
                <div class="icon">1</div>
                <div class="icon">1</div>
                <div class="icon">1</div>
            </div>
            <div class="view-port__header--events">
                <div class="button">STAT</div>
                <div class="button">RAW</div>
                <div class="button">FAST</div>
                <Datepicker v-model="sDateRight" class="date-picker button" :preview-format="FORMAT_FULL_DATE" position="left" auto-apply enable-seconds>
                    <template #trigger>
                        <!-- <img class="input-slot-image" :src="icon" /> -->
                        <div>{{ moment(sDateRight).format(FORMAT_FULL_DATE) }}</div>
                    </template>
                </Datepicker>
            </div>
        </div>
        <div>2</div>
    </div>
</template>

<script setup lang="ts" name="ViewPort">
import { FORMAT_FULL_DATE } from '@/utils/constants';
import Datepicker from '@vuepic/vue-datepicker';
import moment from 'moment';
import { ref, watch } from 'vue';
const sDateLeft = ref<string>(moment().format(FORMAT_FULL_DATE));
const sDateRight = ref<string>(moment().format(FORMAT_FULL_DATE));

// watch(
//     () => sDate.value,
//     () => {
//         emit('eChangeTime', sDate.value);
//     }
// );
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
