<template>
    <div class="axe-tab">
        <div class="col1">
            <div class="title">X-axis</div>
            <label for="_cfg_interval">Interval</label>
            <div class="cfg-input">
                <input id="_cfg_interval" type="text" class="input" @change="onChangeInput" />
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
                <span class="input"><input id="_cfg_zero_base" v-model="isShowTickLineX" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_zero_base" value="The scale of the y-axis start at zero." readonly />
            </div>
            <label for="_cfg_line_y">Show tick line</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_line_y" v-model="isShowTickLineY" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_line_y" value="Displays the Y-axis tick line." readonly />
            </div>
            <div class="cfg-input">
                <label>Custom scale</label>
                <CustomScale style="width: 245px" />
            </div>
            <div class="cfg-input">
                <label>Custom scale for raw data chart</label>
                <CustomScale style="width: 245px" />
            </div>
        </div>
        <div class="col1" style="width: 270px">
            <div class="checkbox-wrapper">
                <span><input v-model="isAdditionalYAxis" type="checkbox" /></span>
                <span class="title1">Set additional Y-axis</span>
            </div>
            <label for="_cfg_zero_base">Start at zero</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_zero_base" v-model="isShowTickLineX" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_zero_base" value="The scale of the y-axis start at zero." readonly />
            </div>
            <label for="_cfg_line_y">Show tick line</label>
            <div class="cfg-input">
                <span class="input"><input id="_cfg_line_y" v-model="isShowTickLineY" type="checkbox" /></span>
                <input type="text" class="input" data-for="_cfg_line_y" value="Displays the Y-axis tick line." readonly />
            </div>
            <div class="cfg-input">
                <label>Custom scale</label>
                <CustomScale style="width: 245px" />
            </div>
            <div class="cfg-input">
                <label>Custom scale for raw data chart</label>
                <CustomScale style="width: 245px" />
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
        <div class="col1"><div class="first-text">Select tags for Y-axis 2.</div></div>
    </div>
</template>

<script setup lang="ts" name="AxesTab">
import { splitTimeDuration } from '@/utils/utils';
import { computed, defineEmits, reactive, ref, watch } from 'vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
const picked = ref('r');
const isAdditionalYAxis = ref<boolean>(false);
const isShowTickLineX = ref<boolean>(false);
const isShowTickLineY = ref<boolean>(false);
const intervalUnit = ref<string>('');
const pixel = ref<string>('');
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
