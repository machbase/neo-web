<template>
    <div class="custom-scale">
        <input v-model="sData.input1" type="text" class="input" style="max-width: 110px" @change="onChangeInput" />
        <span>~</span>
        <input v-model="sData.input2" type="text" class="input" style="max-width: 110px" @change="onChangeInput" />
    </div>
</template>

<script setup lang="ts" name="CustomScale">
import { defineEmits, reactive, defineProps, watch } from 'vue';
export interface CustomScaleInput {
    input1: number | string;
    input2: number | string;
}
interface PropsCustomScale {
    initValue: CustomScaleInput;
}
const props = defineProps<PropsCustomScale>();
const emit = defineEmits(['eOnChange']);
const sData = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const onChangeInput = () => {
    const inputs: CustomScaleInput = {
        input1: sData.input1,
        input2: sData.input2,
    };
    emit('eOnChange', inputs);
};
watch(
    () => props.initValue,
    () => {
        sData.input1 = props.initValue.input1;
        sData.input2 = props.initValue.input2;
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
