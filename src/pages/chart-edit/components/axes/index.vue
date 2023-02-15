<template>
    <div class="axe-tab">
        <div class="col1">
            <div class="title">X-axis</div>
            <label for="_cfg_interval">Interval</label>
            <div class="cfg-input">
                <input id="_cfg_interval" v-model="interval" type="text" class="input" @change="onChangeInput" />
            </div>
            <label for="_cfg_line_x">Show tick line</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_line_x" v-model="isShowTickLineX" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_line_x" value="Displays the X-axis tick line." readonly style="width: 175px" />
            </div>
            <label for="_cfg_pixel">Pixels between tick marks</label>
            <div class="cfg-input">
                <input id="_cfg_pixel" v-model="pixel" type="text" class="input" />
            </div>
        </div>
        <div class="col1" style="width: 270px">
            <div class="title">Y-axis</div>
            <label for="_cfg_zero_base">Start at zero</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_zero_base" v-model="isZeroBase" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_zero_base" value="The scale of the y-axis start at zero." readonly />
            </div>
            <label for="_cfg_line_y">Show tick line</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_line_y" v-model="isShowTickLineY" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_line_y" value="Displays the Y-axis tick line." readonly />
            </div>
            <div class="cfg-input">
                <label>Custom scale</label>
                <CustomScale style="width: 245px" @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 0)" />
            </div>
            <div class="cfg-input">
                <label>Custom scale for raw data chart</label>
                <CustomScale style="width: 245px" @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 1)" />
            </div>
        </div>
        <div class="col1" style="width: 270px">
            <div class="checkbox-wrapper">
                <span><input v-model="isAdditionalYAxis" type="checkbox" /></span>
                <span class="title1">Set additional Y-axis</span>
            </div>
            <div v-if="isAdditionalYAxis">
                <label for="_cfg_zero_base">Start at zero</label>
                <div class="cfg-input">
                    <span class="input"><input id="_cfg_zero_base" v-model="isZeroBase2" type="checkbox" /></span>
                    <input type="text" class="input" data-for="_cfg_zero_base" value="The scale of the y-axis start at zero." readonly />
                </div>
                <label for="_cfg_line_y">Show tick line</label>
                <div class="cfg-input">
                    <span class="input"><input id="_cfg_line_y" v-model="isShowTickLineY2" type="checkbox" /></span>
                    <input type="text" class="input" data-for="_cfg_line_y" value="Displays the Y-axis tick line." readonly />
                </div>
                <div class="cfg-input">
                    <label>Custom scale</label>
                    <CustomScale style="width: 245px" @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 2)" />
                </div>
                <div class="cfg-input">
                    <label>Custom scale for raw data chart</label>
                    <CustomScale style="width: 245px" @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 3)" />
                </div>
                <div class="cfg-input">
                    <label>Position of Y-axis</label>
                    <div class="input radio-wrapper" style="width: 245px">
                        <input type="radio" id="one" value="l" v-model="picked" />
                        <label for="one">Left side</label>
                        <input type="radio" id="two" value="r" v-model="picked" />
                        <label for="two">Right side</label>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="isAdditionalYAxis" class="col1">
            <div class="first-text">Select tags for Y-axis 2.</div>
            <ComboboxSelect style="width: 250px" class="input" p-string-default="Select a tag for the additional Y-axis." :p-data="tagOptions" @e-on-change="onChangeTag" />
            <div class="tag-list">
                <div v-for="(item, index) in tagSetsSelected" :key="index" class="tag-item-wrapper">
                    <div class="tag-item">
                        {{ item.calculation_mode }} <span>{{ item.tag_names }}</span>
                    </div>
                    <img :src="i_b_close" alt="Clear icon" @click="onRemove(item, index)" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="AxesTab">
import i_b_close from '@/assets/image/i_b_close.png';
import { splitTimeDuration } from '@/utils/utils';
import { computed, defineEmits, reactive, ref, watch, watchEffect } from 'vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import { useRoute } from 'vue-router';
import { useStore } from '@/store';
import { PanelInfo, TagSet } from '@/interface/chart';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';

const emit = defineEmits(['eOnChange']);
const store = useStore();
const route = useRoute();
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const chartSelected = CPanels.value[route.params.id as any];
const tagSets = chartSelected[0].tag_set;
const tagOptions = ref<any>([]);
const tagsSelected = ref<any>([]);
const tagSetsSelected = computed((): any => {
    const newArr: any[] = [];
    tagsSelected.value.forEach((item: any) => {
        newArr.push(tagSets[item]);
    });
    return newArr;
});

const picked = ref('r');
const isZeroBase = ref<boolean>(false);
const isZeroBase2 = ref<boolean>(false);
const isAdditionalYAxis = ref<boolean>(false);
const isShowTickLineX = ref<boolean>(true);
const isShowTickLineY = ref<boolean>(true);
const isShowTickLineY2 = ref<boolean>(true);
const intervalUnit = ref<string>('');
const interval = ref<string>();
const pixel = ref<number>(0);
const intervalValue = ref<number>();
const sCustomScale = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const sCustomScaleRaw = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const sCustomScale2 = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const sCustomScaleRaw2 = reactive<CustomScaleInput>({
    input1: '',
    input2: '',
});
const onChangeInput = (aEvent: Event) => {
    const sTemp = splitTimeDuration((aEvent.target as HTMLInputElement).value);
    console.log("🚀 ~ file: index.vue:145 ~ onChangeInput ~ sTemp", sTemp)
    intervalValue.value = sTemp.value;
    intervalUnit.value = sTemp.type;
};
const onChangeTag = (data: string) => {
    const index = tagOptions.value.findIndex((item: any) => item.id === data);
    tagOptions.value.splice(index, 1);
    tagsSelected.value.push(index);
};
const onRemove = (item: any, index: number) => {
    tagsSelected.value.splice(index, 1);
    // name: value.calculation_mode + ' : ' + value.tag_names,
    const name = item.calculation_mode + ' : ' + item.tag_names;
    const option = {
        id: index,
        name,
    };
    tagOptions.value.push(option);
};
const onChangeCustomScale = (data: CustomScaleInput, type: number) => {
    if (type === 0) {
        sCustomScale.input1 = data.input1;
        sCustomScale.input2 = data.input2;
    } else if (type === 1) {
        sCustomScaleRaw.input1 = data.input1;
        sCustomScaleRaw.input2 = data.input2;
    } else if (type === 2) {
        sCustomScale2.input1 = data.input1;
        sCustomScale2.input2 = data.input2;
    } else {
        sCustomScaleRaw2.input1 = data.input1;
        sCustomScaleRaw2.input2 = data.input2;
    }
};
watchEffect(() => {
    const data = {
        interval_type: intervalUnit.value,
        interval_value: intervalValue.value,
    };
    emit('eOnChange', data);
});
watch(
    CPanels,
    () => {
        if (chartSelected[0].interval_type != '') {
            interval.value = chartSelected[0].interval_value.toString() + chartSelected[0].interval_type.slice(0, 1);
            intervalUnit.value = chartSelected[0].interval_type;
            intervalValue.value = chartSelected[0].interval_value;
        } else interval.value = '';
        if (chartSelected[0].show_x_tickline) {
            isShowTickLineX.value = chartSelected[0].show_x_tickline.toUpperCase() == 'Y';
        } else isShowTickLineX.value = true;
        if (chartSelected[0].show_y_tickline) {
            isShowTickLineY.value = chartSelected[0].show_y_tickline.toUpperCase() == 'Y';
        } else isShowTickLineY.value = true;
        if (chartSelected[0].show_y_tickline2) {
            isShowTickLineY2.value = chartSelected[0].show_y_tickline2.toUpperCase() == 'Y';
        } else isShowTickLineY2.value = true;
        pixel.value = chartSelected[0].pixels_per_tick;
        if (pixel.value <= 0) pixel.value = 1;
        isZeroBase.value = chartSelected[0].zero_base.toUpperCase() == 'Y';
        isZeroBase2.value = chartSelected[0].zero_base2.toUpperCase() == 'Y';
        if (tagSets[0].use_y2 == 'Y') isAdditionalYAxis.value = true;

        tagSets.forEach((value, index) => {
            if (value.use_y2 != 'Y') {
                const option = {
                    id: index,
                    name: value.calculation_mode + ' : ' + value.tag_names,
                };
                console.log('🚀 ~ file: index.vue:105 ~ tagSets.forEach ~ option', option);
                tagOptions.value.push(option);
            }
        });
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
