<template>
    <div class="axe-tab">
        <div class="col1">
            <div class="title">X-axis</div>
            <!-- <label for="_cfg_interval">Interval</label>
            <div class="cfg-input">
                <input v-model="interval" id="_cfg_interval" @change="onChangeInput" class="input" style="width: 240px" type="text" />
            </div> -->
            <label for="_cfg_line_x">Show tick line</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="isShowTickLineX" id="_cfg_line_x" type="checkbox" /></div>
                <input class="input" data-for="_cfg_line_x" readonly style="width: 175px" type="text" value="Displays the X-axis tick line." />
            </div>
            <label for="_cfg_pixel">Pixels between tick marks</label>
            <div class="cfg-input">
                <input v-model="pixel" id="_cfg_pixel" class="input" step="0.01" style="width: 240px" type="number" />
            </div>
        </div>
        <div class="col1" style="width: 270px">
            <div class="title">Y-axis</div>
            <label for="_cfg_zero_base">Start at zero</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="isZeroBase" id="_cfg_zero_base" type="checkbox" /></div>
                <input class="input" data-for="_cfg_zero_base" readonly type="text" value="The scale of the y-axis start at zero." />
            </div>
            <label for="_cfg_line_y">Show tick line</label>
            <div class="cfg-input input-wrapper">
                <div class="checkbox-wrapper"><input v-model="isShowTickLineY" id="_cfg_line_y" :disabled="isAdditionalYAxis" type="checkbox" /></div>
                <input class="input" data-for="_cfg_line_y" readonly type="text" value="Displays the Y-axis tick line." />
            </div>
            <div class="cfg-input">
                <label>Custom scale</label>
                <CustomScale @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 0)" :init-value="customScaleInit" style="width: 270px" />
            </div>
            <div class="cfg-input">
                <label>Custom scale for raw data chart</label>
                <CustomScale @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 1)" :init-value="customScaleRawInit" style="width: 270px" />
            </div>
        </div>
        <div class="col1" style="width: 270px">
            <div class="checkbox-wrapper1">
                <span><input v-model="isAdditionalYAxis" type="checkbox" /></span>
                <span class="title1">Set additional Y-axis</span>
            </div>
            <div v-if="isAdditionalYAxis">
                <label for="_cfg_zero_base">Start at zero</label>
                <div class="cfg-input input-wrapper">
                    <div class="checkbox-wrapper"><input v-model="isZeroBase2" id="_cfg_zero_base" type="checkbox" /></div>
                    <input class="input" data-for="_cfg_zero_base" readonly type="text" value="The scale of the y-axis start at zero." />
                </div>
                <label for="_cfg_line_y2">Show tick line</label>
                <div class="cfg-input input-wrapper">
                    <div class="checkbox-wrapper"><input v-model="isShowTickLineY2" id="_cfg_line_y2" :disabled="isAdditionalYAxis" type="checkbox" /></div>
                    <input class="input" data-for="_cfg_line_y2" readonly type="text" value="Displays the Y-axis tick line." />
                </div>
                <div class="cfg-input">
                    <label>Custom scale</label>
                    <CustomScale @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 2)" :init-value="customScaleInit2" style="width: 270px" />
                </div>
                <div class="cfg-input">
                    <label>Custom scale for raw data chart</label>
                    <CustomScale @e-on-change="(data: CustomScaleInput) => onChangeCustomScale(data, 3)" :init-value="customScaleRawInit2" style="width: 270px" />
                </div>
                <div class="cfg-input">
                    <label>Position of Y-axis</label>
                    <div class="input radio-wrapper" style="width: 270px">
                        <input v-model="picked" id="one" type="radio" value="l" />
                        <label for="one">Left side</label>
                        <input v-model="picked" id="two" type="radio" value="r" />
                        <label for="two">Right side</label>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="isAdditionalYAxis" class="col1">
            <div class="first-text">Select tags for Y-axis 2.</div>
            <select v-model="sSelect" class="combobox-select input" style="width: 250px">
                <img class="icon" :src="ic_arrow_s_down" />
                <option class="combobox-select__item" value="default">Select a tag for the additional Y-axis.</option>
                <option v-for="aItem in tagOptions" :key="aItem.id" class="combobox-select__item" :value="aItem.id">{{ aItem.name }}</option>
            </select>
            <div class="tag-list">
                <div v-for="(item, index) in tagSetsSelected" :key="index" class="tag-item-wrapper">
                    <div class="tag-item">
                        {{ item.calculation_mode }} <span>{{ item.tag_names }}</span>
                    </div>
                    <img @click="onRemove(item, index)" alt="Clear icon" :src="i_b_close" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="AxesTab">
import ic_arrow_s_down from '@/assets/image/ic_arrow_s_down.png';
import i_b_close from '@/assets/image/i_b_close.png';
import { splitTimeDuration } from '@/utils/utils';
import { defineEmits, reactive, ref, watch, watchEffect, defineProps } from 'vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import { PanelInfo, TagSet } from '@/interface/chart';
import { cloneDeep } from 'lodash';

interface PropsTab {
    pChartData: PanelInfo;
}
const sSelect = ref<any>('default');
const props = defineProps<PropsTab>();
const emit = defineEmits(['eOnChange']);

const customScaleInit: CustomScaleInput = {
    input1: props.pChartData.custom_min,
    input2: props.pChartData.custom_max,
};

const customScaleRawInit: CustomScaleInput = {
    input1: props.pChartData.custom_drilldown_min,
    input2: props.pChartData.custom_drilldown_max,
};

const customScaleInit2: CustomScaleInput = {
    input1: props.pChartData.custom_min2,
    input2: props.pChartData.custom_max2,
};

const customScaleRawInit2: CustomScaleInput = {
    input1: props.pChartData.custom_drilldown_min2,
    input2: props.pChartData.custom_drilldown_max2,
};

const tagSets = ref<any>([]);
const tagOptions = ref<any>([]);
const tagSetsSelected = ref<any>([]);

watch(
    () => tagSets.value,
    () => {
        tagOptions.value = tagSets.value.reduce((res: any, item: any, index: number) => {
            if (item.use_y2 != 'Y') {
                const option = {
                    id: item.id,
                    name: item.calculation_mode + ' : ' + item.tag_names,
                };
                res.push(option);
                return res;
            }
            return res;
        }, []);
        tagSetsSelected.value = tagSets.value.filter((item: TagSet) => item.use_y2 == 'Y');
    },
    {
        immediate: true,
        deep: true,
    }
);

watch(
    () => sSelect.value,
    () => {
        if (sSelect.value != 'default' && tagSets.value[parseInt(sSelect.value)]) tagSets.value[parseInt(sSelect.value)].use_y2 = 'Y';
        sSelect.value = 'default';
    }
);

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
const intervalValue = ref<number>(props.pChartData.interval_value);
const sCustomScale = reactive<CustomScaleInput>({
    input1: 0,
    input2: 0,
});
const sCustomScaleRaw = reactive<CustomScaleInput>({
    input1: 0,
    input2: 0,
});
const sCustomScale2 = reactive<CustomScaleInput>({
    input1: 0,
    input2: 0,
});
const sCustomScaleRaw2 = reactive<CustomScaleInput>({
    input1: 0,
    input2: 0,
});
const onChangeInput = (aEvent: Event) => {
    const sTemp = splitTimeDuration((aEvent.target as HTMLInputElement).value);
    intervalValue.value = sTemp.value;
    intervalUnit.value = sTemp.type;
};

const onRemove = (item: any, index: number) => {
    tagSets.value[item.id].use_y2 = 'N';
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
    const tag_set = cloneDeep(tagSets.value);
    const data: Partial<PanelInfo> = {
        interval_type: intervalUnit.value,
        interval_value: intervalValue.value,
        show_x_tickline: isShowTickLineX.value ? 'Y' : 'N',
        show_y_tickline: isShowTickLineY.value ? 'Y' : 'N',
        show_y_tickline2: isShowTickLineY2.value ? 'Y' : 'N',
        pixels_per_tick: pixel.value,
        zero_base: isZeroBase.value ? 'Y' : 'N',
        zero_base2: isZeroBase2.value ? 'Y' : 'N',
        custom_min: parseFloat(sCustomScale.input1 as string),
        custom_max: parseFloat(sCustomScale.input2 as string),
        custom_drilldown_min: parseFloat(sCustomScaleRaw.input1 as string),
        custom_drilldown_max: parseFloat(sCustomScaleRaw.input2 as string),
        custom_min2: parseFloat(sCustomScale2.input1 as string),
        custom_max2: parseFloat(sCustomScale2.input2 as string),
        custom_drilldown_min2: parseFloat(sCustomScaleRaw2.input1 as string),
        custom_drilldown_max2: parseFloat(sCustomScaleRaw2.input2 as string),
        use_right_y2: picked.value == 'r' ? 'Y' : 'N',
        tag_set,
    };
    emit('eOnChange', data);
});

watch(
    () => isAdditionalYAxis.value,
    () => {
        isShowTickLineY.value = true;
        isShowTickLineY2.value = true;
    }
);
watch(
    () => pixel.value,
    () => {
        if (pixel.value < 0) {
            pixel.value = 1;
        } else if (pixel.value > 100) {
            pixel.value = 100;
        }
    }
);

watch(
    () => props.pChartData,
    () => {
        tagSets.value = props.pChartData?.tag_set.map((item, idx) => ({ ...item, id: idx }));
        if (props.pChartData.interval_type != '') {
            interval.value = props.pChartData.interval_value.toString() + props.pChartData.interval_type.slice(0, 1);
            intervalUnit.value = props.pChartData.interval_type;
            intervalValue.value = props.pChartData.interval_value;
        } else interval.value = '';
        if (props.pChartData.show_x_tickline) {
            isShowTickLineX.value = props.pChartData.show_x_tickline.toUpperCase() == 'Y';
        } else isShowTickLineX.value = true;
        if (props.pChartData.show_y_tickline) {
            isShowTickLineY.value = props.pChartData.show_y_tickline.toUpperCase() == 'Y';
        } else isShowTickLineY.value = true;
        if (props.pChartData.show_y_tickline2) {
            isShowTickLineY2.value = props.pChartData.show_y_tickline2.toUpperCase() == 'Y';
        } else isShowTickLineY2.value = true;
        pixel.value = props.pChartData.pixels_per_tick;
        if (pixel.value <= 0) pixel.value = 1;
        isZeroBase.value = props.pChartData.zero_base.toUpperCase() == 'Y';
        isZeroBase2.value = props.pChartData.zero_base2.toUpperCase() == 'Y';
        if (tagSets.value.some(({ use_y2 }: any) => use_y2 == 'Y')) isAdditionalYAxis.value = true;
        picked.value = props.pChartData.use_right_y2.toUpperCase() == 'Y' ? 'r' : 'l';
    },
    {
        immediate: true,
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
