<template>
    <div>
        <div class="new-tab">
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
        </div>
    </div>
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

    let sNode;
    if (sBoardType.value === 'note') {
        sNode = {
            type: 'note',
            name: sBoardName,
            code: '',
        };
    } else {
        sNode = {
            type: 'board',
            name: sBoardName,
            range_end: '',
            refresh: '',
            range_bgn: '',
            panels: [],
        };
    }

    store.commit(MutationTypes.pushTab, {
        url: `${window.location.href}/${sBoardType.value}/${String(new Date())}`,
        type: sBoardType.value,
        id: String(new Date()),
        name: sBoardName,
        hover: false,
    });
    store.commit(MutationTypes.setSelectedTab, String(new Date()));
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
</style>
