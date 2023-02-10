<template>
    <div class="data-tab-wrapper">
        <div class="row">
            <div>Tags</div>
            <div class="plus">+</div>
        </div>
        <div class="tag-row">
            <span
                ><span>Calc mode </span>
                <ComboboxSelect class="select" :p-show-default-option="false" :p-data="CALC_MODE" :p-value="'avg'" @e-on-change="(item) => onChangeCalcMode(item)"
            /></span>
            <span
                ><span>Tag Names </span>
                <input type="text" class="form-control taginput input" />
            </span>
            <span
                ><span>Alias </span>
                <input type="text" class="form-control taginput input" />
            </span>
            <span @click="onReset"><img :src="i_b_close" alt="Clear icon" /></span>
        </div>
        <div class="tag-row">
            <span
                ><span>Calc mode </span>
                <ComboboxSelect class="select" :p-show-default-option="false" :p-data="CALC_MODE" :p-value="'avg'" @e-on-change="(item) => onChangeCalcMode(item)"
            /></span>
            <span
                ><span>Tag Names </span>
                <input type="text" class="form-control taginput input" />
            </span>
            <span
                ><span>Alias </span>
                <input type="text" class="form-control taginput input" />
            </span>
            <span @click="onReset"><img :src="i_b_close" alt="Clear icon" /></span>
        </div>
        <ButtonCreate class="create-div" :is-add-chart="false" :on-click="onOpenPopup" />
        <PopupWrap :width="'667px'" :p-type="PopupType.NEW_TAGS" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>

<script setup lang="ts" name="DataTab">
import ButtonCreate from '@/components/common/button-create/index.vue';
import i_b_close from '@/assets/image/i_b_close.png';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { CALC_MODE } from '@/components/popup-list/popup/constant';
import { CalculationMode } from '@/interface/constants';
import { computed, ref, watch } from 'vue';
import { PopupType } from '@/enums/app';
import PopupWrap from '@/components/popup-list/index.vue';
const sDialog = ref<boolean>(false);
const onOpenPopup = () => {
    sDialog.value = true;
};
const onClosePopup = () => {
    sDialog.value = false;
};
const onChangeCalcMode = (data: CalculationMode) => {
    // sSelectedTags[index].calculation_mode = data;
};
const onReset = () => {};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
