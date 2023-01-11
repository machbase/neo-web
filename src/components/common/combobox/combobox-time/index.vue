<template>
    <div class="combobox-time">
        <v-menu :transition="false" :class="cIsDarkMode ? 'dark' : 'light'">
            <template #activator="{ props }">
                <img class="icon" :src="btn_dropdown_on" v-bind="props" />
            </template>
            <v-list>
                <v-list-item v-for="aItem in COMBO_BOX_TIME" :key="aItem.value" class="item" @click="onChange(aItem)">
                    <v-list-item-title>{{ aItem.name }}</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>
        <input v-model="sData.input" type="text" class="input" @change="onChangeInput" />
    </div>
</template>

<script setup lang="ts" name="ComboboxTime">
import btn_dropdown_on from '@/assets/image/btn_dropdown_on.svg';
import { useStore } from '@/store';
import { COMBO_BOX_TIME } from '@/utils/constants';
import { computed, defineEmits, reactive, ref } from 'vue';
import { splitTimeDuration } from '@/utils/utils';

type DataTime = {
    name: string;
    value: string;
};
const emit = defineEmits(['eOnChange']);
const store = useStore();

const cIsDarkMode = computed(() => store.state.gDarkMode);
const sData = reactive({
    select: {} as DataTime,
    input: '' as string,
});
const sOldInput = ref<string>('');

const onChange = (aValue: DataTime) => {
    sOldInput.value = aValue.value;
    sData.input = aValue.value;
    sData.select = aValue;
    emit('eOnChange', sData.input);
};
const onChangeInput = (aEvent: Event) => {
    const sTemp = splitTimeDuration((aEvent.target as HTMLInputElement).value);
    if (sTemp.error != '') {
        alert('Invalid input.');
        sData.input = sOldInput.value;
        return;
    } else {
        sData.input = (aEvent.target as HTMLInputElement).value;
        sOldInput.value = sData.input;
        emit('eOnChange', sData.input);
    }
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
