<template>
    <div class="axe-tab">
        <div class="col1">
            <div class="title">X-axis</div>
            <label for="_cfg_interval">Interval</label>
            <div class="cfg-input">
                <input id="_cfg_interval" type="text" class="input" @change="onChangeInput" />
            </div>
        </div>
        <div class="col1"><div class="title">Y-axis</div></div>
        <div class="col1">
            <div class="checkbox-wrapper">
                <span><input v-model="isAdditionalYAxis" type="checkbox" /></span>
                <span class="title1">Set additional Y-axis</span>
            </div>
        </div>
        <div class="col1"><div class="title">Select tags for Y-axis 2.</div></div>
    </div>
</template>

<script setup lang="ts" name="AxesTab">
import { splitTimeDuration } from '@/utils/utils';
import { computed, defineEmits, reactive, ref, watch } from 'vue';
const isAdditionalYAxis = ref<boolean>(false);
const intervalUnit = ref<string>('');
const intervalValue = ref<number>();
const onChangeInput = (aEvent: Event) => {
    const sTemp = splitTimeDuration((aEvent.target as HTMLInputElement).value);
    intervalValue.value = sTemp.value;
    intervalUnit.value = sTemp.type;
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
