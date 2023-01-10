<template>
    <select v-model="sSelect" class="combobox-select">
        <img class="icon" :src="ic_arrow_s_down" />
        <option class="combobox-select__item" value="null">{{ pStringDefault }}</option>
        <option v-for="aItem in pData" :key="aItem.id" class="combobox-select__item" :value="aItem.id">{{ aItem.name }}</option>
    </select>
</template>

<script setup lang="ts" name="ComboboxSelect">
import { ref, defineProps, defineEmits, watch, withDefaults, watchEffect } from 'vue';
import { isEmpty } from 'lodash';
import ic_arrow_s_down from '@/assets/image/ic_arrow_s_down.svg';
import { SELECT_DASHBOARD } from './constant';
interface ComboboxData {
    id: any;
    name: string;
}
interface ComboboxSelectProps {
    pData: ComboboxData[];
    pValue?: any;
    pStringDefault?: string;
}

const props = withDefaults(defineProps<ComboboxSelectProps>(), {
    pStringDefault: SELECT_DASHBOARD,
});

const emit = defineEmits(['eOnChange']);
const sSelect = ref<any>(null);

watch(
    () => sSelect.value,
    () => {
        emit('eOnChange', sSelect.value);
    }
);

watchEffect(() => {
    if (!isEmpty(props.pValue)) {
        sSelect.value = props.pValue;
    }
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
