<template>
    <div class="save-dashboard">
        <div class="save-dashboard__input-group">
            <p class="save-dashboard__input-group-label">Board ID</p>
            <div class="save-dashboard__input-group-content">
                <input class="save-dashboard__input-group-text check" :value="sData.boardId" @input="onChangeId" />
                <div class="save-dashboard__input-group-checkbox"><input v-model="sData.checked" type="checkbox" /> <span>Save as Copy</span></div>
            </div>
        </div>
        <div class="save-dashboard__input-group">
            <p class="save-dashboard__input-group-label">Board Title</p>
            <div class="save-dashboard__input-group-content">
                <input class="save-dashboard__input-group-text" :value="sData.boardTitle" @change="onChangeTitle" />
            </div>
        </div>
        <div class="save-dashboard__btn-group">
            <v-btn variant="outlined" class="button-effect-color" @click="onSetting"> Ok </v-btn>
            <v-btn variant="outlined" class="button-effect" @click="onClosePopup"> Cancel </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts" name="SaveDashboard">
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, defineEmits, reactive, onMounted } from 'vue';

const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    boardId: '' as string,
    oldId: '' as string,
    boardTitle: 'New Dashboard' as string,
    checked: false as boolean,
});
const cPreferences = computed(() => store.state.gPreference);
const cBoard = computed(() => store.state.gBoard);

const onChangeId = (aEvent: Event) => {
    (document.querySelector('.check') as HTMLInputElement).value = (document.querySelector('.check') as HTMLInputElement).value.replace(/ /g, '');
    sData.boardId = (aEvent.target as HTMLInputElement).value;
};
const onChangeTitle = (aEvent: Event) => {
    sData.boardTitle = (aEvent.target as HTMLInputElement).value;
};

const onSetting = () => {
    if (sData.boardId.trim().length <= 0) {
        alert('Input Dashboard ID.');
        return;
    }
    if (sData.boardTitle.trim().length <= 0) {
        alert('Input Dashboard Title.');
        return;
    }
    const newBoard = {
        board_id: sData.boardId,
        board_name: sData.boardTitle,
        old_id: sData.oldId,
    };
    store.dispatch(ActionTypes.fetchNewDashboard, newBoard).then((res) => {
        alert(res.msg);
        onClosePopup();
    });
};

const onClosePopup = () => {
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
