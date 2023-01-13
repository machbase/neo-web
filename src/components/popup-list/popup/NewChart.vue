<template>
    <div>
        Button Create Tag
        <div><ButtonCreate :is-add-chart="false" :on-click="test" /></div>
        Chart Select
        <div><ChartSelect /></div>
        <div></div>
        <div>Combobox Select <ComboboxSelect :p-data="[{ id: '1', name: 'test' }]" :p-value="'1'" /></div>
        <div>Combobox Time <ComboboxTime /></div>
        <div style="width: 250px">
            Custom Scale
            <CustomScale @e-on-change="onClickScale" />
        </div>
        Pagination
        <Pagination :total="6" />
        TimeRange
        <TimeRange @eOnTimeRange="OnTimeRange" />
        TimeRange
        <TimeDuration @eOnTimeDuration="OnTimeRange" />
    </div>
</template>

<script setup lang="ts" name="NewChart">
import Pagination from '@/components/common/pagination/index.vue';
import TimeRange from '@/components/common/date-list/date-time-range.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartSelect from '@/components/common/chart-select/index.vue';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
function test() {
    console.log('s');
}
const onClickScale = (data: CustomScaleInput) => {
    console.log('🚀 ~ file: index.vue:26 ~ onClickScale ~ data', data);
};
const OnTimeRange = (data: any) => {
    console.log('🚀 ~ file: index.vue:26 ~ onClickScale ~ data', data);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
