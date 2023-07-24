<template>
    <div>
        <v-sheet class="field-sheet" color="transparent">
            <span> Name </span>
            <div ref="inputForm" class="combobox-select"><input v-model="sLabel" ref="sInput" type="text" /></div>
        </v-sheet>
        <v-sheet color="transparent" class="field-sheet">
            <span> Command </span>
            <div ref="inputForm" class="combobox-select"><input v-model="sCommand" ref="sInput" type="text" /></div>
        </v-sheet>
        <v-sheet color="transparent" class="field-sheet">
            <span> Theme </span>
            <ComboboxAuto
                @e-on-change="(aValue) => changeTheme(aValue)"
                class="select-width"
                :p-data="sThemeList"
                :p-show-default-option="false"
                :p-text-input="true"
                :p-option-width="'300px'"
                p-use-name
                :p-icon="false"
                :p-value="sTheme"
                :pShowDefaultOption="false"
            />
        </v-sheet>

        <v-sheet color="transparent" class="field-sheet">
            <span> Icon </span>
            <ComboboxAuto
                @e-on-change="(aValue) => changeIcon(aValue)"
                class="select-width"
                :p-data="sList"
                :pDisableIconName="true"
                :p-show-default-option="false"
                :p-text-input="true"
                :p-option-width="'300px'"
                p-use-name
                :p-icon="true"
                :p-value="sIcon"
                :pShowDefaultOption="false"
            />
        </v-sheet>
        <v-sheet color="transparent">
            <div class="popup__btn-group">
                <v-btn @click="save" class="button-effect-color" variant="outlined"> Save </v-btn>
                <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
            </div>
        </v-sheet>
    </div>
</template>
<script setup lang="ts">
import ComboboxAuto from '@/components/common/combobox/combobox-auto/index.vue';

import Vue, { onMounted, ref, computed } from 'vue';
import { postShell } from '../../../api/repository/api';
import { toast, ToastOptions } from 'vue3-toastify';
import { store } from '../../../store';

interface propsOption {
    pInfo: string;
}
const props = defineProps<propsOption>();
const emit = defineEmits(['eClosePopup', 'eSettingPopup']);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const sLabel = ref();
const sTheme = ref();
const sIcon = ref();
const sCommand = ref();

const sList = computed(() =>
    [
        `console-network-outline`,
        `console-network`,
        `database-outline`,
        `database`,
        `console-line`,
        `powershell`,
        `monitor`,
        `monitor-small`,
        `monitor-star`,
        `monitor-shimmer`,
        `laptop`,
        `server-network`,
    ].map((aItem: any) => {
        return { id: aItem };
    })
);
const sThemeList = computed(() =>
    ['default', 'white', 'dark', 'gray', 'galaxy'].map((aItem: any) => {
        return { id: aItem };
    })
);

const changeIcon = (aItem: string) => {
    sIcon.value = aItem;
};
const changeTheme = (aItem: string) => {
    sTheme.value = aItem;
};

const onClosePopup = () => {
    emit('eClosePopup');
};

const save = async () => {
    const sData = {
        ...JSON.parse(props.pInfo),
        label: sLabel.value,
        command: sCommand.value,
        icon: sIcon.value,
        theme: sTheme.value,
    };

    const sResult: any = await postShell(sData);
    if (sResult.reason) {
        toast('Success', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'success',
        } as ToastOptions);
        emit('eSettingPopup');
    } else {
        toast('Failed', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    }
};

onMounted(() => {
    sCommand.value = JSON.parse(props.pInfo).command;
    sLabel.value = JSON.parse(props.pInfo).label;
    sTheme.value = JSON.parse(props.pInfo).theme ? JSON.parse(props.pInfo).theme : 'default';
    sIcon.value = JSON.parse(props.pInfo).icon;
});
</script>
<style lang="scss" scoped>
@import '@/components/common/combobox/combobox-auto/index.scss';
@import '@/components/popup-list/popup/index.scss';
:deep(.combobox-select) {
    width: 300px;
    color: $text-w !important;
    input {
        padding: 0 8px !important;
        width: 100%;
    }
}
.select-width {
    max-width: 300px !important;
    width: 300px !important;
}
:deep(.combobox-select .combobox-select__item) {
    color: $text-w !important;
}
.field-sheet {
    span {
        width: 70px;
    }
    justify-content: center;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}
.combobox-select {
    color: #202020 !important;
    .combobox-select__item {
        color: #202020 !important;
    }
}
</style>
