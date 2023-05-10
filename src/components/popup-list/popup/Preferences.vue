<template>
    <div class="popup">
        <div class="popup__input">
            <p class="popup__input-label">UI Theme</p>
            <div class="popup__input-content">
                <ComboboxSelect @e-on-change="(aValue) => aIsChangeTheme(aValue, true)" :p-data="THEME_MODE" :p-string-default="SELECT_THEME" :p-value="cPreferences.theme" />
            </div>
        </div>

        <div class="popup__btn-group">
            <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
            <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts" name="Preferences">
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { THEME_MODE } from '@/utils/constants';
import { computed, reactive, defineEmits } from 'vue';
import { DEFAULT_PREFERENCE, NOT_YET, SELECT_THEME } from './constant';
import { isEqual } from 'lodash';

const cPreferences = computed(() => store.state.gPreference);
const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    theme: cPreferences.value.theme || DEFAULT_PREFERENCE.THEME,
});
const cBoardList = computed(() =>
    store.state.gBoardList.map((aItem) => {
        return {
            ...aItem,
            id: aItem.board_id,
            name: aItem.board_name,
        };
    })
);

const aIsChangeTheme = (aValue: string, aType: boolean) => {
    if (aType) {
        sData.theme = aValue;
    }
};
const onChangeInput = (aEvent: Event) => {
    sData.timeout = parseInt((aEvent.target as HTMLInputElement).value);
};
const onSetting = () => {
    store.dispatch(ActionTypes.postPreference, sData).then(() => onClosePopup());
    if (localStorage.getItem('gPreference')) {
        if (isEqual(store.state.gPreference, JSON.parse(localStorage.getItem('gPreference') || ''))) {
            return;
        }
    }

    location.reload();
    localStorage.setItem('gPreference', JSON.stringify(sData));
};
const onClosePopup = () => {
    emit('eClosePopup');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
