<template>
    <v-sheet class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <div>
                <v-radio-group v-model="sBoardType" @update:modelValue="changeName" class="radio-tab" hide-detail>
                    <div>
                        <v-radio color="#3A65D0" hide-detail label="Dashboard" value="dashboard"> </v-radio>
                        <v-icon color="#3A65D0" size="18px">mdi-chart-line</v-icon>
                    </div>
                    <div>
                        <v-radio color="#3A65D0" hide-detail label="Note" value="note"></v-radio>
                        <v-icon color="#3A65D0" size="18px">mdi-note-outline</v-icon>
                    </div>
                </v-radio-group>
                <div class="set-board-name">
                    <v-sheet color="transparent" width="25%"> Tab Name </v-sheet>
                    <input v-model="sBoardName" class="form-control taginput input" type="text" />
                </div>
            </div>
            <div class="popup__btn-group">
                <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
                <!-- <v-btn variant="outlined" class="button-effect" @click="onClosePopup"> Cancel </v-btn> -->
            </div>
        </v-sheet>
    </v-sheet>
</template>
<script setup lang="ts">
import Vue, { ref, computed, defineEmits } from 'vue';
import { MutationTypes } from '../../../store/mutations';
import { store } from '../../../store';
import { TabList } from '../../../interface/tagView';

const emit = defineEmits(['eClosePopup']);

const sBoardType = ref<string>('dashboard');
const sBoardName = ref<string>('dashboard');

// const gTabList = computed((): TabList[] => {
//     return store.state.gNoteOrBoardList.map((aItem: any) => {
//         return { id: aItem.Id, name: aItem.name, type: aItem.type, hover: false };
//     });
// });

const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const changeName = (aItem: any) => {
    sBoardName.value = aItem;
};
const onClosePopup = () => {
    emit('eClosePopup');
};

const onSetting = () => {
    if (!sBoardName.value) {
        alert('please enter Name');
        return;
    }
    const sIdx = gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value);

    const sNode = {
        ...gTabList.value[sIdx],
        board_id: String(new Date().getTime()),
        type: sBoardType.value,
        board_name: sBoardName,
        edit: false,
    };
    //   type: 'new',
    //   board_id: '',
    //   range_end: '',
    //   refresh: '',
    //   board_name: '',
    //   range_bgn: '',
    //   panels: [],
    //   code: '',
    store.commit(MutationTypes.changeTab, sNode);
    store.commit(MutationTypes.setSelectedTab, sNode.board_id);
    onClosePopup();
};
</script>
<style lang="scss" scoped>
@import 'index.scss';
.radio-tab {
    justify-content: center;
    div {
        display: flex;
        align-items: center;
    }
}
.popup__btn-group {
    display: flex;
    justify-content: end;
}
.popup {
    font-size: 12px;

    &__btn-group {
        .button-effect {
            @include button-effect;
        }

        .button-effect-color {
            @include button-effect-color;
        }
    }
}

.taginput {
    height: 30px;
    padding: 4px 12px;
    font-size: 12px;
}
.set-board-name {
    display: flex;
    align-items: center;
}
.new-tab {
    padding: 12px;
    border-radius: 4px;
    min-width: 20%;
    min-height: 30%;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.add-tab {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}
.add-tab-form {
    width: 30%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    padding: 8px;
    border: 1px solid $text-blue;
}
</style>
