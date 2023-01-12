<template>
    <div class="tag-view">
        <ButtonCreate :is-add-chart="true" :on-click="test" />
        <PopupWrap :p-type="PopupType.NEW_CHART" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>
<script setup lang="ts" name="TagView">
import ButtonCreate from '@/components/common/button-create/index.vue';
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
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
