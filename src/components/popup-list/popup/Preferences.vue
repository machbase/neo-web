<template>
    <div class="popup">
        <div class="popup__input">
            <p class="popup__input-label">IP</p>
            <div class="popup__input-group-content">
                <input v-model="sData.ip" class="popup__input-group-text" @change="onChangeInput" />
            </div>
        </div>
        <div class="popup__input">
            <p class="popup__input-label">PORT</p>
            <div class="popup__input-group-content">
                <input v-model="sData.port" class="popup__input-group-text" @change="onChangeInput" />
            </div>
        </div>
        <div class="popup__input">
            <p class="popup__input-label">UI Theme</p>
            <div class="popup__input-content">
                <ComboboxSelect :p-data="THEME_MODE" :p-string-default="SELECT_THEME" :p-value="cPreferences.theme" @e-on-change="(aValue) => aIsChangeTheme(aValue, true)" />
            </div>
        </div>
        <div class="popup__input-group">
            <p class="popup__input-group-label">Query Timeout</p>
            <div class="popup__input-group-content">
                <input :value="Math.floor(cPreferences.timeout / 1000) || 0" class="popup__input-group-text" @change="onChangeInput" />
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
import { DEFAULT_PREFERENCE, NOT_YET, SELECT_THEME } from './constant';

const cPreferences = computed(() => store.state.gPreference);
const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    theme: cPreferences.value.theme || DEFAULT_PREFERENCE.THEME,
    ip: cPreferences.value.ip || DEFAULT_PREFERENCE.IP,
    port: cPreferences.value.port || DEFAULT_PREFERENCE.PORT,
    timeout: cPreferences.value.timeout || DEFAULT_PREFERENCE.TIMEOUT,
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
    localStorage.setItem('gPreference', JSON.stringify(sData));
};
const onClosePopup = () => {
    emit('eClosePopup');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
