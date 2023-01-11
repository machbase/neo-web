<template>
    <v-dialog v-model="sDialog" transition="dialog-top-transition" class="dialog-wrap" :class="cIsDarkMode ? 'dark' : 'light'" :width="pWidth || '400px'">
        <div class="dialog-wrap__content">
            <div class="dialog-wrap__content--header">
                <p>{{ cTitle }}</p>
                <img :src="i_b_close" @click="sDialog = false" />
            </div>
            <div class="dialog-wrap__content--body">
                <ManageDashboard v-if="pType === PopupType.MANAGE_DASHBOARD" />
                <NewChart v-if="pType === PopupType.NEW_CHART" />
                <NewTags v-if="pType === PopupType.NEW_TAGS" />
                <Preferences v-if="pType === PopupType.PREFERENCES" />
                <SaveDashboard v-if="pType === PopupType.SAVE_DASHBOARD" />
                <TimeRange v-if="pType === PopupType.TIME_RANGE" />
                <button class="btn" @click="onToggleDardMode">change themes</button>
            </div>
        </div>
    </v-dialog>
</template>

<script setup lang="ts" name="PopupWrap">
import i_b_close from '@/assets/image/i_b_close.png';
import { PopupType } from '@/enums/app';
import { useStore } from '@/store';
import { MutationTypes } from '@/store/mutations';
import { POPUP_TITLE } from '@/utils/constants';
import { computed, defineProps, ref, watch, defineEmits } from 'vue';
import ManageDashboard from './popup/ManageDashboard.vue';
import NewChart from './popup/NewChart.vue';
import NewTags from './popup/NewTags.vue';
import Preferences from './popup/Preferences.vue';
import SaveDashboard from './popup/SaveDashboard.vue';
import TimeRange from './popup/TimeRange.vue';

interface PopupWrapProps {
    pType: PopupType;
    pShow: boolean;
    pWidth?: string;
}
const props = defineProps<PopupWrapProps>();
const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sDialog = ref<boolean>(false);
const cTitle = computed(() => POPUP_TITLE.find((aTitle) => props.pType === aTitle));

watch(
    () => props.pShow,
    () => {
        if (props.pShow === true) sDialog.value = true;
    }
);
watch(
    () => sDialog.value,
    () => {
        if (!sDialog.value) emit('eClosePopup');
    }
);

// Test
const cIsDarkMode = computed(() => store.state.gDarkMode);
const onToggleDardMode = () => {
    store.commit(MutationTypes.activeDarkMode, !cIsDarkMode.value);
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
