<template>
    <div class="custom-scale">
        <input v-model="sData.input1" type="text" class="inputCustom" @change="onChangeInput" />
        <span>~</span>
        <input v-model="sData.input2" type="text" class="inputCustom" @change="onChangeInput" />
    </div>
</template>

<script setup lang="ts" name="CustomScale">
import { defineEmits, reactive } from 'vue';
export interface CustomScaleInput {
    input1: string,
    input2: string
}
const emit = defineEmits(['eOnChange']);
const sData = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const onChangeInput = () => {
    const inputs: CustomScaleInput = {
        input1: sData.input1,
        input2: sData.input2
    }
    emit('eOnChange', inputs);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
