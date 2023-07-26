<template>
    <div class="data-tab-wrapper">
        <div class="row">
            <div>Tags</div>
            <div @click="onAdd()" class="plus">+</div>
        </div>
        <div v-for="(aItem, aIndex) in tempTagSets" :key="aIndex" class="tag-row">
            <span
                ><span>Calc mode </span>
                <ComboboxSelect
                    @e-on-change="(item) => onChangeCalcMode(item, aIndex)"
                    class="select"
                    :p-data="CALC_MODE"
                    :p-show-default-option="false"
                    :p-value="aItem.calculation_mode"
            /></span>
            <span class="tag-name-form"
                ><span>Tag Names </span>
                <span class="taginput input tag-name-input">
                    <input @change="(event) => onChangeTagName(event, aIndex)" type="text" :value="aItem.tag_names" />
                    <span>( {{ aItem.table }} )</span>
                </span>
            </span>
            <span
                ><span>Alias </span>
                <input @change="(event) => onChangeAliasName(event, aIndex)" class="taginput input" type="text" :value="aItem.alias" />
            </span>
            <span @click="onRemove(aIndex)"><img alt="Clear icon" :src="i_b_close" /></span>
        </div>
        <ButtonCreate class="create-div" :is-add-chart="false" :on-click="onOpenPopup" />
        <PopupWrap
            @e-close-popup="onClosePopup"
            @e-submit-tags="onSubmitTag"
            :p-no-of-select-tags="tempTagSets?.length"
            :p-show="sDialog"
            :p-type="PopupType.NEW_TAGS"
            :width="'667px'"
        />
    </div>
</template>

<script setup lang="ts" name="DataTab">
import ButtonCreate from '@/components/common/button-create/index.vue';
import i_b_close from '@/assets/image/i_b_close.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { CALC_MODE } from '@/components/popup-list/popup/constant';
import { CalculationMode } from '@/interface/constants';
import { ref, watch, defineEmits, defineProps } from 'vue';
import { PopupType } from '@/enums/app';
import PopupWrap from '@/components/popup-list/index.vue';
import { PanelInfo, TagSet } from '@/interface/chart';
import { cloneDeep } from 'lodash';

interface PropsTab {
    pChartData: PanelInfo;
}
const props = defineProps<PropsTab>();
const emit = defineEmits(['eOnChange']);
const tempTagSets = ref<TagSet[]>([]);
const sDialog = ref<boolean>(false);
const onChangeTagName = (aEvent: Event, aIndex: number) => {
    const value = (aEvent.target as HTMLInputElement).value;
    tempTagSets.value[aIndex].tag_names = value;
};
const onChangeAliasName = (aEvent: Event, aIndex: number) => {
    const value = (aEvent.target as HTMLInputElement).value;
    tempTagSets.value[aIndex].alias = value;
};

const onOpenPopup = () => {
    sDialog.value = true;
};
const onClosePopup = () => {
    sDialog.value = false;
};
const onChangeCalcMode = (data: CalculationMode, aIndex: number) => {
    tempTagSets.value[aIndex].calculation_mode = data;
};
const onRemove = (aIndex: number) => {
    tempTagSets.value.splice(aIndex, 1);
};
const onAdd = () => {
    if (tempTagSets.value.length === 0) return;
    tempTagSets.value.push(tempTagSets.value[tempTagSets.value?.length - 1]);
};
const onSubmitTag = (data: any) => {
    tempTagSets.value.push(...data);
};
watch(
    () => props.pChartData,
    () => {
        tempTagSets.value = cloneDeep(props.pChartData?.tag_set);
    },
    {
        immediate: true,
    }
);
watch(
    () => tempTagSets.value,
    () => {
        const data: Partial<PanelInfo> = {
            tag_set: tempTagSets.value,
        };
        emit('eOnChange', data);
    },
    {
        deep: true,
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
.tag-name-form {
    display: flex;
    align-items: center;
    .tag-name-input {
        display: flex;
        align-items: center;
        justify-content: space-between;
        span {
            font-size: 10px;
        }
    }
}
</style>
