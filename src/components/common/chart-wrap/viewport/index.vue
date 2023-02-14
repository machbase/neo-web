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
                <div class="button blue">Undo</div>
            </div>
            <div class="view-port__header--events icon">
                <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline"></v-icon>
                <v-icon color="#fff" size="x-large" icon="mdi-image-filter-center-focus-strong-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline"></v-icon>
            </div>
            <div class="view-port__header--events">
                <div class="button">STAT</div>
                <div class="button">RAW</div>
                <div class="button">FAST</div>
                <Datepicker v-model="sDateRight" class="date-picker button" :preview-format="FORMAT_FULL_DATE" position="center" auto-apply enable-seconds>
                    <template #trigger>
                        <!-- <img class="input-slot-image" :src="icon" /> -->
                        <div>{{ moment(sDateRight).format(FORMAT_FULL_DATE) }}</div>
                    </template>
                </Datepicker>
            </div>
        </div>
        <v-icon icon="mdi-close-thick" class="icon-close"></v-icon>
    </div>
</template>

<script setup lang="ts" name="ViewPort">
import i_b_close from '@/assets/image/i_b_close.png';
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
