<template>
    <div class="popup">
        <div class="popup__input-group">
            <p class="popup__input-group-label">Board Title</p>
            <div class="popup__input-group-content">
                <input @change="onChangeTitle" class="popup__input-group-text" />
            </div>
        </div>
        <div class="popup__btn-group">
            <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
            <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts" name="SaveDashboard">
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { computed, defineEmits, reactive } from 'vue';

const emit = defineEmits(['eClosePopup']);
const store = useStore();
const sData = reactive({
    boardId: '' as string,
    boardTitle: '' as string,
    checked: false as boolean,
});
const cPreferences = computed(() => store.state.gPreference);

const onChangeId = (aEvent: Event) => {
    sData.boardId = (aEvent.target as HTMLInputElement).value;
};
const onChangeTitle = (aEvent: Event) => {
    sData.boardTitle = (aEvent.target as HTMLInputElement).value;
};
const onClosePopup = () => {
    emit('eClosePopup');
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
