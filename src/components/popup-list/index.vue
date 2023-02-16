<template>
    <v-dialog
        v-model="sDialog"
        transition="dialog-top-transition"
        class="dialog-wrap"
        :class="cIsDarkMode ? 'dark' : 'light'"
        :width="pWidth || '400px'"
        @update:model-value="onClosePopup"
    >
        <div class="dialog-wrap__content">
            <div class="dialog-wrap__content--header">
                <p>{{ props.pType }}</p>
                <img :src="i_b_close" @click="onClosePopup" />
            </div>
            <div class="dialog-wrap__content--body">
                <ManageDashboard v-if="pType === PopupType.MANAGE_DASHBOARD" @eClosePopup="onClosePopup" />
                <NewChart v-if="pType === PopupType.NEW_CHART" @eClosePopup="onClosePopup" />
                <NewTags v-if="pType === PopupType.NEW_TAGS" :no-of-select-tags="5" @eClosePopup="onClosePopup" @e-submit="test" />
                <Preferences v-if="pType === PopupType.PREFERENCES" @eClosePopup="onClosePopup" />
                <SaveDashboard v-if="pType === PopupType.SAVE_DASHBOARD" @eClosePopup="onClosePopup" />
                <TimeRange v-if="pType === PopupType.TIME_RANGE" @eClosePopup="onClosePopup" />
                <TimeDuration v-if="pType === PopupType.TIME_DURATION" @eClosePopup="onClosePopup" />
            </div>
        </div>
    </v-dialog>
</template>

<script setup lang="ts" name="PopupWrap">
import i_b_close from '@/assets/image/i_b_close.png';
import { PopupType } from '@/enums/app';
import { useStore } from '@/store';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';
import ManageDashboard from './popup/ManageDashboard.vue';
import NewChart from './popup/NewChart.vue';
import NewTags from './popup/NewTags.vue';
import Preferences from './popup/Preferences.vue';
import SaveDashboard from './popup/SaveDashboard.vue';
import TimeDuration from './popup/TimeDuration.vue';
import TimeRange from './popup/TimeRange.vue';
const test = (data: any) => {
    console.log('🚀 ~ file: index.vue:41 ~ test ~ data', data);
};
interface PopupWrapProps {
    pType: PopupType;
    pShow: boolean;
    pWidth?: string;
}
const props = defineProps<PopupWrapProps>();
const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sDialog = ref<boolean>(false);

const onClosePopup = () => {
    sDialog.value = false;
    emit('eClosePopup');
};

watch(
    () => props.pShow,
    () => {
        if (props.pShow === true) sDialog.value = true;
    }
);

// Test
const cIsDarkMode = computed(() => store.getters.getDarkMode);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
