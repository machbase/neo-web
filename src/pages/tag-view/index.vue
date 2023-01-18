<template>
    <div class="tag-view">
        <Datepicker />
        <ChartDashboard />
        <ButtonCreate :is-add-chart="true" :on-click="onOpenPopup" />
        <PopupWrap :width="'500px'" :p-type="PopupType.NEW_CHART" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>
<script setup lang="ts" name="TagView">
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import Pagination from '@/components/common/pagination/index.vue';
import Datepicker from '@/components/common/date-picker/index.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { PopupType } from '@/enums/app';
import { ref } from 'vue';
import { getBoard } from '@/api/repository/api';
import { useRoute } from 'vue-router';

const route = useRoute();
const sDialog = ref<boolean>(false);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};

const setBoard = async (sId: string) => {
    const sRes = await getBoard(sId);
};
setBoard(route.query.id as string);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
