<template>
    <div class="tag-view">
        <ChartDashboard />
        <ButtonCreate :is-add-chart="true" :on-click="test" />
        <PopupWrap :p-type="PopupType.NEW_CHART" :p-show="sDialog" @e-close-popup="onClosePopup" />
        <!-- <Pagination :total="6" />
        <div style="width: 250px">
            <CustomScale @e-on-change="onClickScale" />
        </div> -->
    </div>
</template>
<script setup lang="ts" name="TagView">
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import Pagination from '@/components/common/pagination/index.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { ref } from 'vue';

const sDialog = ref<boolean>(false);

function test() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};

const onClickScale = (data: CustomScaleInput) => {
    console.log('🚀 ~ file: index.vue:26 ~ onClickScale ~ data', data);
};
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
