<template>
    <div @keydown="setOption">
        <div v-if="sIsOpenOption" class="cover"></div>
        <div ref="inputForm" class="combobox-select">
            <input v-model="sSelect" ref="sInput" @blur="openList(false)" @focus="!pDisabled && openList(true)" @input="handleSearch" :disabled="pDisabled" type="text" />
            <img
                class="icon"
                :src="ic_arrow_s_down"
                :style="
                    cIsDarkMode
                        ? {
                              filter: `opacity(0.3) drop-shadow(0 0 0 #ffffff)`,
                          }
                        : {
                              filter: `brightness(0%) opacity(0.5) drop-shadow(0 0 0 #000000)`,
                          }
                "
            />
        </div>
        <div v-if="sIsOpenOption" ref="optionList" class="option-list">
            <button v-if="props.pShowDefaultOption" @click="selected(aItem.id)" class="combobox-select__item" value="">{{ pStringDefault }}</button>
            <button
                v-for="(aItem, aIdx) in sFitterData"
                :key="aIdx"
                ref="buttonList"
                @click="selected(aItem.id)"
                @mouseover="sVirtualSelect = aIdx"
                class="combobox-select__item"
                :style="aIdx === sVirtualSelect ? { backgroundColor: '#2094fc !important', color: 'white' } : {}"
            >
                {{ aItem.id }}
            </button>
        </div>
    </div>
</template>

<script setup="setup" lang="ts" name="ComboboxSelect">
import { ref, defineProps, defineEmits, watch, withDefaults, watchEffect, onMounted, computed, nextTick } from 'vue';
import { isEmpty } from 'lodash';
import ic_arrow_s_down from '@/assets/image/ic_arrow_s_down.png';
import { SELECT_DASHBOARD } from './constant';
import { store } from '../../../../store';
interface ComboboxData {
    id: any;
    name: string;
}
interface ComboboxSelectProps {
    pData: ComboboxData[];
    pValue?: any;
    pStringDefault?: string;
    pShowDefaultOption?: boolean;
    pDisabled?: boolean;
}

const props = withDefaults(defineProps<ComboboxSelectProps>(), {
    pStringDefault: SELECT_DASHBOARD,
    pShowDefaultOption: true,
});

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const buttonList = ref<any>(null);
const sInput = ref<any>(null);
const sVirtualSelect = ref<number>(0);
const sFitterData = ref<any>([]);
const sDefaultData = ref<any>();
const sIsOpenOption = ref<boolean>(false);
const inputForm = ref<any>(null);
const optionList = ref<any>(null);
const emit = defineEmits(['eOnChange']);
const sSelect = ref<any>('');

const setOption = (aEvent: any) => {
    if (aEvent.keyCode === 40) {
        sVirtualSelect.value++;
        if (optionList.value.scrollTop < buttonList.value[sVirtualSelect.value].offsetTop - 280) {
            optionList.value.scrollTop = buttonList.value[sVirtualSelect.value].offsetTop - 280;
        }
    } else if (aEvent.keyCode === 38) {
        if (sVirtualSelect.value > 0) {
            sVirtualSelect.value--;
        }
        if (optionList.value.scrollTop > buttonList.value[sVirtualSelect.value].offsetTop) {
            optionList.value.scrollTop = buttonList.value[sVirtualSelect.value].offsetTop;
        }
    } else if (aEvent.keyCode === 13) {
        sSelect.value = sFitterData.value[sVirtualSelect.value].id;
        openList(false);
    }
};

const openList = (aItem: boolean) => {
    sIsOpenOption.value = aItem;
    if (sIsOpenOption.value) {
        sDefaultData.value = props.pValue;
        sFitterData.value = props.pData;
        sVirtualSelect.value = props.pData.findIndex((aItem) => aItem.id.toLowerCase() === sSelect.value.toLowerCase());
        sInput.value.focus();
        setTimeout(() => {
            optionList.value.scrollTop = buttonList.value[sVirtualSelect.value].offsetTop - 140;
        }, 50);
    } else {
        if (-1 === props.pData.findIndex((aItem) => aItem.id.toLowerCase() === sSelect.value.toLowerCase())) sSelect.value = sDefaultData.value;
        sInput.value.blur();
    }
};

const handleSearch = () => {
    if (!sSelect.value) {
        sFitterData.value = props.pData;
    } else {
        sFitterData.value = props.pData.filter((v: any) => {
            const sConvertValue = v.id.toLowerCase();
            return sConvertValue.indexOf(sSelect.value.toLowerCase()) !== -1;
        });
        sVirtualSelect.value = 0;
    }
};

const selected = (aItem: any) => {
    sSelect.value = aItem;
    openList(false);
};

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

<style lang="scss" scoped="scoped">
@import 'index.scss';
</style>
