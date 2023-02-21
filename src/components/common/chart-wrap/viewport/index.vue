<template>
    <div class="view-port">
        <div class="view-port__header">
            <div class="view-port__header--events">
                <div class="date-picker button" @click="onOpenPopup">{{ sDateLeft }}</div>
                <div class="button blue">Undo</div>
            </div>
            <div class="view-port__header--events icon">
                <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-minus-outline"></v-icon>
                <v-icon color="#2ec0df" size="x-large" icon="mdi-image-filter-center-focus-strong-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline"></v-icon>
                <v-icon color="#2ec0df" icon="mdi-magnify-plus-outline"></v-icon>
            </div>
            <div class="view-port__header--events">
                <div class="button" @click="onChangeEmit('1')">STAT</div>
                <div class="button" @click="onChangeEmit('2')">RAW</div>
                <div class="button" @click="onChangeEmit('3')">FAST</div>
                <div class="date-picker button" @click="onOpenPopup">{{ sDateRight }}</div>
            </div>
        </div>
        <v-icon icon="mdi-close-thick" class="icon-close"></v-icon>
        <PopupWrap :width="'667px'" :p-type="PopupType.TIME_DURATION" :p-show="sDialog" @e-close-popup="onClosePopup" />
    </div>
</template>

<script setup lang="ts" name="ViewPort">
import i_b_close from '@/assets/image/i_b_close.png';
import { LinePanel } from '@/interface/chart';
import PopupWrap from '@/components/popup-list/index.vue';
import { useStore } from '@/store';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { formatDate } from '@/utils/utils';
import Datepicker from '@vuepic/vue-datepicker';
import moment from 'moment';
import { ref, watch, defineEmits, defineProps, withDefaults, computed } from 'vue';
import { PopupType } from '@/enums/app';

interface ViewPortProps {
    panelInfo: LinePanel;
}
const props = withDefaults(defineProps<ViewPortProps>(), {});
const emit = defineEmits(['eOnChange']);
const store = useStore();
const sDialog = ref<boolean>(false);
const sDateLeft = ref<string>('');
const sDateRight = ref<string>('');
const cRangeData = computed(() => store.state.gRangeData);

const onChangeEmit = (aValue: any) => {
    emit('eOnChange', aValue);
};
const onOpenPopup = () => {
    sDialog.value = true;
};
const onClosePopup = () => {
    sDialog.value = false;
};

watch(
    () => cRangeData.value,
    () => {
        sDateLeft.value = moment(formatDate(cRangeData.value.MIN)).format(FORMAT_FULL_DATE);
        sDateRight.value = moment(formatDate(cRangeData.value.MAX)).format(FORMAT_FULL_DATE);
    },
    {
        immediate: true,
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
