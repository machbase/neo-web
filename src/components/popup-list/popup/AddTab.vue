<template>
    <v-sheet class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <v-sheet class="header" color="transparent">
                <div>New Tab...</div>
            </v-sheet>

            <v-sheet v-if="cLocalStorageOption" class="card-form" color="transparent">
                <v-btn
                    v-for="(option, aIdx) in sExpOptions"
                    :key="aIdx"
                    @click="changeType(option.type, option.name)"
                    class="taginput input set-type"
                    size="200px"
                    stacked
                    :style="sBoardType === option.type ? { borderColor: '#46CA92 !important' } : {}"
                >
                    <div class="icon-header">
                        <v-icon :color="sBoardType === option.type ? '#46CA92' : '#9CA2AB'"> mdi-check-circle-outline </v-icon>
                    </div>
                    <div class="icon-body">
                        <v-icon :color="cIsDarkMode ? (sBoardType === option.type ? '#E4F2FD' : '') : sBoardType === option.type ? '' : '#212121'" size="36px">
                            {{ option.icon }}
                        </v-icon>
                        <span :style="cIsDarkMode ? (sBoardType === option.type ? { color: '#E4F2FD' } : {}) : sBoardType === option.type ? {} : { color: '#212121' }">
                            {{ option.name }}
                        </span>
                    </div>
                </v-btn>
            </v-sheet>
            <v-sheet v-else class="card-form" color="transparent">
                <v-btn
                    v-for="(option, aIdx) in sOptions"
                    :key="aIdx"
                    @click="changeType(option.type, option.name)"
                    class="taginput input set-type"
                    size="200px"
                    stacked
                    :style="sBoardType === option.type ? { borderColor: '#46CA92 !important' } : {}"
                >
                    <div class="icon-header">
                        <v-icon :color="sBoardType === option.type ? '#46CA92' : '#9CA2AB'"> mdi-check-circle-outline </v-icon>
                    </div>
                    <div class="icon-body">
                        <v-icon :color="cIsDarkMode ? (sBoardType === option.type ? '#E4F2FD' : '') : sBoardType === option.type ? '' : '#212121'" size="36px">
                            {{ option.icon }}
                        </v-icon>
                        <span :style="cIsDarkMode ? (sBoardType === option.type ? { color: '#E4F2FD' } : {}) : sBoardType === option.type ? {} : { color: '#212121' }">
                            {{ option.name }}
                        </span>
                    </div>
                </v-btn>
            </v-sheet>
            <v-sheet class="board-name-sheet" color="transparent">
                <div class="set-board-name">
                    <!-- @TODO -->
                    <!-- <input v-model="sBoardName" class="form-control taginput input" placeholder="Please fill out the Tab name." type="text" />
                    <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> OK </v-btn> -->
                </div>
                <!-- <div class="btn-form"></div> -->
            </v-sheet>
            <div class="popup__btn-group next-btn">
                <v-divider color="info" :thickness="2"></v-divider>
                <div class="btn-form"></div>
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

const sBoardType = ref<string>();
const sBoardName = ref<string>('Tag Analyzer');
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const sOptions = [
    { name: 'Tag Analyzer', type: 'dashboard', icon: 'mdi-chart-line' },
    { name: 'SQL', type: 'SQL Editor', icon: 'mdi-file-document-outline' },
    { name: 'Shell', type: 'Terminal', icon: 'mdi-console' },
];
const sExpOptions = [
    { name: 'Tag Analyzer', type: 'dashboard', icon: 'mdi-chart-line' },
    { name: 'SQL', type: 'SQL Editor', icon: 'mdi-file-document-outline' },
    { name: 'Shell', type: 'Terminal', icon: 'mdi-console' },
    // { name: 'Chart', type: 'chart', icon: 'mdi-chart-scatter-plot' },
    { name: 'TQL', type: 'Tql', icon: 'mdi-chart-scatter-plot' },
];
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const cLocalStorageOption = computed(() => !!localStorage.getItem('experimentMode'));

const changeName = (aType: any, aName: string) => {
    const sFilterList = gTabList.value.filter((bItem) => bItem.type === aType);
    if (sFilterList.length === 0) sBoardName.value = aName;
    else {
        const sSortData = sFilterList
            .map((aItem) => {
                return aItem.board_name;
            })
            .sort();
        const sData = sSortData.map((aItem, aIdx) => {
            if (aIdx !== 0) {
                if (aItem.split('-')[1] === String(aIdx)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        });
        const sIdx = sData.findIndex((aItem) => !aItem);
        if (sIdx !== -1) {
            sBoardName.value = aName + '-' + sIdx;
        } else {
            sBoardName.value = aName + '-' + sSortData.length;
        }
    }
};

const changeType = (aItem: any, aName: string) => {
    sBoardType.value = aItem;
    changeName(sBoardType.value, aName);
    onSetting();
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
    width: 40%;
    justify-content: center;
    button {
        margin-left: 8px;
        height: 46px !important;
    }
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    display: flex;
    font-size: 40px;
    font-weight: 600;
    letter-spacing: 0px;
    .Information {
        font-weight: 600;
        font-size: 20px;
        opacity: 0.8;
        letter-spacing: 0px;
    }
}
.form-control {
}
.add-tab-form {
    width: 80%;
    height: 60%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    padding: 8px;
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
