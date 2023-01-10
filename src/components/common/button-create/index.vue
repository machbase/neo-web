<template>
    <div @click="props.onClick" class="button-wrapper" :style="{ height: props.isAddChart ? '300px' : '63px' }">
        <img class="img-wrapper" :style="{ height: props.isAddChart ? '100px' : '32px' }" src="../../../assets/image/i_plus_off.png" />
        <div :style="{ fontSize: props.isAddChart ? '24px' : '16px' }">
            <span class="normal-text">Click </span>
            <span class="plus-text">+ button</span>
            <span class="normal-text"> to {{ props.isAddChart ? ADD_CHART_TEXT : ADD_TAG_TEXT }}!</span>
        </div>
    </div>
</template>

<script setup lang="ts" name="ButtonCreate">
import { defineProps } from 'vue';
import { ADD_CHART_TEXT, ADD_TAG_TEXT } from './constant';
interface PropsButtonCreate {
    isAddChart: boolean;
    onClick: () => void;
}
const props = defineProps<PropsButtonCreate>();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
