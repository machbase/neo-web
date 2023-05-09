<template>
    <v-sheet class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <v-sheet class="header" color="transparent"> What kind of tab would you like to create? </v-sheet>
            <v-sheet class="board-name-sheet" color="transparent">
                <div class="set-board-name">
                    <!-- <v-sheet color="transparent" width="25%"> Tab Name </v-sheet> -->
                    <!-- <div v-if="!sBoardName">Please fill out the Tab name.</div> -->
                    <input v-model="sBoardName" class="form-control taginput input" placeholder="Please fill out the Tab name." type="text" />
                </div>
            </v-sheet>

            <v-sheet class="card-form" color="transparent">
                <v-btn
                    v-for="(option, aIdx) in sOptions"
                    :key="aIdx"
                    @click="changeType(option.type)"
                    class="taginput input set-type"
                    size="200px"
                    stacked
                    :style="sBoardType === option.type ? { borderColor: '#46CA92 !important' } : {}"
                >
                    <div class="icon-header">
                        <v-icon :color="sBoardType === option.type ? '#46CA92' : '#9CA2AB'"> mdi-check-circle-outline </v-icon>
                    </div>
                    <div class="icon-body">
                        <v-icon :color="cIsDarkMode ? (sBoardType === option.type ? '#E4F2FD' : '') : sBoardType === option.type ? '' : '#9CA2AB'" size="36px">
                            {{ option.icon }}
                        </v-icon>
                        <span :style="cIsDarkMode ? (sBoardType === option.type ? { color: '#E4F2FD' } : {}) : sBoardType === option.type ? {} : { color: '#9CA2AB' }">
                            {{ option.type }}
                        </span>
                    </div>
                </v-btn>
            </v-sheet>

            <!-- <v-radio-group v-model="sBoardType" @update:modelValue="changeName" class="radio-tab" hide-detail>
                    <div>
                        <v-radio color="#3A65D0" hide-detail label="Dashboard" value="dashboard"> </v-radio>
                        <v-icon color="#3A65D0" size="18px">mdi-chart-line</v-icon>
                    </div>
                    <div>
                        <v-radio color="#3A65D0" hide-detail label="Note" value="note"></v-radio>
                        <v-icon color="#3A65D0" size="18px">mdi-note-outline</v-icon>
                    </div>
                </v-radio-group> -->
            <div class="popup__btn-group next-btn">
                <v-divider color="info" :thickness="2"></v-divider>
                <div class="btn-form">
                    <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> next </v-btn>
                </div>
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
const cIsDarkMode = computed(() => store.getters.getDarkMode);

// const gTabList = computed((): TabList[] => {
//     return store.state.gNoteOrBoardList.map((aItem: any) => {
//         return { id: aItem.Id, name: aItem.name, type: aItem.type, hover: false };
//     });
// });

const sOptions = [
    { type: 'dashboard', icon: 'mdi-chart-line' },
    { type: 'note', icon: 'mdi-note-outline' },
];
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const changeName = (aItem: any) => {
    sBoardName.value = aItem;
};

const changeType = (aItem: string) => {
    sBoardType.value = aItem;
    changeName(aItem);
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
.btn-form {
    display: flex;
    width: 100%;
    justify-content: end;
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
    height: 48px;
    padding: 4px 12px;
    font-size: 12px;
}
.set-board-name {
    display: flex;
    align-items: center;
    width: 80%;
    justify-content: center;
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
.header {
    justify-content: center;
    display: flex;
    font-size: 44px;
    font-weight: 600;
    letter-spacing: -2px;
}
.form-control {
    // text-transform: uppercase;
    // font-size: 12px !important;
}
.add-tab-form {
    width: 80%;
    height: 60%;
    // height: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    padding: 8px;
    // border: 1px solid $text-blue;
}
.card-form {
    display: flex;
    padding: 5px;
    justify-content: center;
    flex-wrap: wrap;
    gap: 28px;
}

::v-deep .set-type {
    display: flex;
    flex: none;
    .v-btn__content {
        justify-content: space-between;
        width: 100%;
        position: relative;
        height: 100%;
        .icon-header {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            padding-top: 5px;
            width: 100%;
            justify-content: end;
            align-items: center;
        }
        .icon-body {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            justify-content: center;
            i {
                height: 36px !important;
                width: 100% !important;
            }
            span {
                padding-top: 8px;
                font-size: 12px;
            }
        }
    }
}
.board-name-sheet {
    display: flex;
    justify-content: center;
}
.next-btn {
    flex-direction: column;
}
</style>
