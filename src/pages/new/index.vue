<template>
    <div class="new-dashboard">
        <ChartDashboard ref="sPanels" />
        <ButtonCreate :is-add-chart="true" :on-click="onOpenPopup" />
        <PopupWrap @e-close-popup="onClosePopup" :p-show="sDialog" :p-type="PopupType.NEW_CHART" :width="'667px'" />
    </div>
</template>
<script setup lang="ts" name="New">
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { ref } from 'vue';

const sDialog = ref<boolean>(false);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
