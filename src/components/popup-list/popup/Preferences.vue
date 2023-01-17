<template>
    <div class="popup">
        <div class="popup__input">
            <p class="popup__input-label">UI Theme</p>
            <div class="popup__input-content">
                <ComboboxSelect :p-data="THEME_MODE" :p-string-default="SELECT_THEME" :p-value="cPreferences.theme" @e-on-change="(aValue) => onChange(aValue, true)" />
            </div>
        </div>
        <div class="popup__input">
            <p class="popup__input-label">Home Dashboard</p>
            <div class="popup__input-content">
                <ComboboxSelect :p-data="cBoardList" :p-string-default="NOT_YET" @e-on-change="onChange" />
            </div>
        </div>
        <div class="popup__input-group">
            <p class="popup__input-group-label">Query Timeout</p>
            <div class="popup__input-group-content">
                <input :value="cPreferences.timeout || 0" class="popup__input-group-text" @change="onChangeInput" />
                <p>seconds</p>
            </div>
        </div>
        <div class="popup__btn-group">
            <v-btn variant="outlined" class="button-effect-color" @click="onSetting"> Ok </v-btn>
            <v-btn variant="outlined" class="button-effect" @click="onClosePopup"> Cancel </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts" name="Preferences">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { THEME_MODE } from '@/utils/constants';
import { computed, reactive, defineEmits } from 'vue';
import { NOT_YET, SELECT_THEME } from './constant';

const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    theme: '' as string,
    board: '' as string,
    time: '0' as string,
});
const cPreferences = computed(() => store.state.gPreference);
const cBoardList = computed(() =>
    store.state.gBoardList.map((aItem) => {
        return {
            ...aItem,
            id: aItem.board_id,
            name: aItem.board_name,
        };
    })
);

const onChange = (aValue: string, aType: boolean) => {
    if (aType) {
        sData.theme = aValue;
    } else sData.board = aValue;
};
const onChangeInput = (aEvent: Event) => {
    sData.time = (aEvent.target as HTMLInputElement).value;
};
const onSetting = () => {
    store.dispatch(ActionTypes.postPreference, sData).then(() => onClosePopup());
};
const onClosePopup = () => {
    emit('eClosePopup');
};
store.dispatch(ActionTypes.fetchPreference);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
