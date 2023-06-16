<template>
    <div class="save-dashboard">
        <div class="save-dashboard__input-group">
            <p class="save-dashboard__input-group-label">Board Title</p>
            <div class="save-dashboard__input-group-content">
                <input @change="onChangeTitle" class="save-dashboard__input-group-text" :value="sData.boardTitle" />
            </div>
        </div>
        <div class="save-dashboard__btn-group">
            <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
            <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts" name="SaveDashboard">
import { PopupType } from '@/enums/app';
import { RouteNames } from '@/enums/routes';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { MutationTypes } from '@/store/mutations';
import { computed, defineEmits, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { toast, ToastOptions } from 'vue3-toastify';

const emit = defineEmits(['eClosePopup']);
const route = useRoute();
const store = useStore();
const sData = reactive({
    boardId: '' as string,
    oldId: '' as string,
    boardTitle: 'New Dashboard' as string,
    checked: false as boolean,
});

const cPreferences = computed(() => store.state.gPreference);
const cBoard = computed(() => store.state.gBoard);
const gDownloadData = computed(() => store.state.gDownloadData);
const gTabList = computed(() => store.state.gTabList);

const onChangeId = (aEvent: Event) => {
    (document.querySelector('.check') as HTMLInputElement).value = (document.querySelector('.check') as HTMLInputElement).value.replace(/ /g, '');
    sData.boardId = (aEvent.target as HTMLInputElement).value;
};
const onChangeTitle = (aEvent: Event) => {
    sData.boardTitle = (aEvent.target as HTMLInputElement).value;
};
const gSelectedTab = computed(() => store.state.gSelectedTab);
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const onSetting = () => {
    if (sData.boardTitle.trim().length <= 0) {
        toast('Input Dashboard Title.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }

    const jsonString = JSON.stringify(gBoard.value);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sData.boardTitle}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClosePopup();
};

const onClosePopup = () => {
    store.commit(MutationTypes.setDownLoad, false);

    emit('eClosePopup');
};

onMounted(() => {
    if (cBoard.value.board_id !== '') {
        sData.boardId = cBoard.value.board_id;
    }
    if (cBoard.value.board_name !== '') {
        sData.boardTitle = cBoard.value.board_name;
    }
    if (cBoard.value.old_id !== '') {
        sData.oldId = cBoard.value.old_id || '';
    }
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
