<template>
    <div class="popup">
        <!-- <div class="popup__input">
            <p class="popup__input-label">UI Theme</p>
            <div class="popup__input-content">
                <ComboboxSelect @e-on-change="(aValue) => aIsChangeTheme(aValue, true)" :p-data="THEME_MODE" :p-string-default="SELECT_THEME" :p-value="cPreferences.theme" />
            </div>
        </div> -->
        <div class="popup__input">
            <p class="popup__input-label">Font Size</p>
            <div class="popup__input-content">
                <ComboboxSelect @e-on-change="(aValue) => ChangeFont(aValue, true)" :p-data="FONT_SIZE" :p-show-default-option="false" :p-value="cPreferences.font" />
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
import { THEME_MODE, FONT_SIZE } from '@/utils/constants';
import { computed, reactive, defineEmits } from 'vue';
import { DEFAULT_PREFERENCE, SELECT_THEME } from './constant';
import { isEqual } from 'lodash';

const cPreferences = computed(() => store.state.gPreference);
const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    theme: cPreferences.value.theme || DEFAULT_PREFERENCE.THEME,
    font: cPreferences.value.font || DEFAULT_PREFERENCE.font,
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
const ChangeFont = (aValue: string, aType: boolean) => {
    if (aType) {
        sData.font = aValue;
    }
};
const onChangeInput = (aEvent: Event) => {
    sData.timeout = parseInt((aEvent.target as HTMLInputElement).value);
};
const onSetting = () => {
    if (localStorage.getItem('gPreference')) {
        if (isEqual(JSON.stringify(sData), localStorage.getItem('gPreference') || '')) {
            onClosePopup();
            return;
        }
    }
    localStorage.setItem('gPreference', JSON.stringify(sData));
    onClosePopup();
    sessionStorage.setItem('board', JSON.stringify(store.state.gTabList));
    sessionStorage.setItem('selectedTab', store.state.gSelectedTab);
    location.reload();
};
const onClosePopup = () => {
    emit('eClosePopup');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
