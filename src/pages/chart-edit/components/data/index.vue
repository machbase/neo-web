<template>
    <div class="data-tab-wrapper">
        <div class="row">
            <div>Tags</div>
            <div class="plus" @click="onAdd()">+</div>
        </div>
        <div v-for="(aItem, aIndex) in tempTagSets" :key="aIndex" class="tag-row">
            <span
                ><span>Calc mode </span>
                <ComboboxSelect
                    class="select"
                    :p-show-default-option="false"
                    :p-data="CALC_MODE"
                    :p-value="aItem.calculation_mode"
                    @e-on-change="(item) => onChangeCalcMode(item, aIndex)"
            /></span>
            <span
                ><span>Tag Names </span>
                <input type="text" class="taginput input" :value="aItem.tag_names" @change="(event) => onChangeTagName(event, aIndex)" />
            </span>
            <span
                ><span>Alias </span>
                <input type="text" class="taginput input" :value="aItem.alias" />
            </span>
            <span @click="onRemove(aIndex)"><img :src="i_b_close" alt="Clear icon" /></span>
        </div>
        <ButtonCreate class="create-div" :is-add-chart="false" :on-click="onOpenPopup" />
        <PopupWrap
            :width="'667px'"
            :p-type="PopupType.NEW_TAGS"
            :p-show="sDialog"
            :p-no-of-select-tags="tempTagSets.length"
            @e-close-popup="onClosePopup"
            @e-submit-tags="onSubmitTag"
        />
    </div>
</template>

<script setup lang="ts" name="DataTab">
import ButtonCreate from '@/components/common/button-create/index.vue';
import i_b_close from '@/assets/image/i_b_close.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { CALC_MODE } from '@/components/popup-list/popup/constant';
import { CalculationMode } from '@/interface/constants';
import { computed, ref, watch, defineEmits, watchEffect, defineProps } from 'vue';
import { PopupType } from '@/enums/app';
import PopupWrap from '@/components/popup-list/index.vue';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { useRoute } from 'vue-router';
import { PanelInfo, TagSet } from '@/interface/chart';
import { cloneDeep } from 'lodash';

interface PropsTab {
    pChartData: PanelInfo;
}
const props = defineProps<PropsTab>();
const emit = defineEmits(['eOnChange']);
const store = useStore();
const route = useRoute();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const tempTagSets = ref<TagSet[]>([]);
const sDialog = ref<boolean>(false);
const onChangeTagName = (aEvent: Event, aIndex: number) => {
    const value = (aEvent.target as HTMLInputElement).value;
    tempTagSets.value[aIndex].tag_names = value;
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
    tempTagSets.value.push(tempTagSets.value[tempTagSets.value.length - 1]);
};
const onSubmitTag = (data: any) => {
    tempTagSets.value.push(...data);
};
watch(
    props,
    () => {
        tempTagSets.value = cloneDeep(props.pChartData.tag_set);
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
        console.log('🚀 ~ file: index.vue:90 ~ data:', data);
        emit('eOnChange', data);
    },
    {
        deep: true,
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
