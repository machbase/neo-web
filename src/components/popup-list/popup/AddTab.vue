<template>
    <v-sheet class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <v-sheet class="header" color="transparent">
                <div>New...</div>
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
                <v-sheet
                    v-if="isDragged"
                    @dragleave="onDragleave"
                    @dragover="onDragover"
                    @drop="onDrop"
                    class="taginput input set-type import-size"
                    color="#eeeeee"
                    dragenter="onDragenter"
                    height="200px"
                    stacked
                    width="200px"
                >
                    <div class="icon-header"></div>
                    <div class="icon-body">
                        <v-icon size="36px"> mdi-tray-arrow-down </v-icon>
                        <span> IMPORT </span>
                    </div>
                </v-sheet>
                <v-sheet
                    v-else
                    @dragenter="onDragenter"
                    @dragover="onDragover"
                    @drop="onDrop"
                    class="taginput input set-type import-size"
                    color="transparent"
                    height="200px"
                    stacked
                    width="200px"
                >
                    <div class="icon-header"></div>
                    <div class="icon-body">
                        <v-icon size="36px"> mdi-tray-arrow-down </v-icon>
                        <span> IMPORT </span>
                    </div>
                </v-sheet>
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

            <div class="popup__btn-group next-btn">
                <v-divider color="#a4a4a4" :thickness="2"></v-divider>
            </div>
            <div class="link-list">
                <div>
                    <button @click="onClickPopupItem(PopupType.FILE_BROWSER)">
                        <v-icon>mdi-folder-open</v-icon>
                        Open...
                    </button>
                </div>
                <div>
                    <label class="item">
                        <div :style="{ display: 'flex', alignItems: 'center', cursor: 'pointer' }">
                            <v-icon>mdi-folder-upload</v-icon>
                            Import...
                        </div>
                        <input @change="onUpload" accept=".wrk, .sql, .tql, ,.taz" class="file-import" type="file" />
                    </label>
                </div>
                <div v-for="(aRefer, aIdx) in cReferences" :key="aIdx">
                    <div class="referOption">
                        <v-icon> mdi-folder</v-icon>
                        {{ aRefer.label }}
                    </div>
                    <button v-for="(aItem, bIdx) in aRefer.items" :key="bIdx" @click="showDoc(aItem)" :style="{ paddingLeft: '24px' }">
                        <v-icon v-if="aItem.type === 'url'" size="16px"> {{ IconList.LINK }}</v-icon>
                        <v-icon v-if="aItem.type === 'sql'" size="16px"> {{ IconList.SQL }}</v-icon>
                        <v-icon v-if="aItem.type === 'tql'" size="16px"> {{ IconList.TQL }}</v-icon>
                        <v-icon v-if="aItem.type === 'wrk'" size="16px"> {{ IconList.WRK }}</v-icon>
                        <v-icon v-if="aItem.type === 'taz'" size="16px"> {{ IconList.TAZ }}</v-icon>
                        {{ aItem.title }}
                    </button>
                </div>
            </div>
        </v-sheet>
    </v-sheet>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="'open'" :p-new-open="'NewOpen'" :p-show="sDialog" :p-type="sPopupType" p-upload-type="" :p-width="cWidthPopup" />
</template>
<script setup lang="ts">
import Vue, { ref, computed, defineEmits } from 'vue';
import { MutationTypes } from '../../../store/mutations';
import PopupWrap from '@/components/popup-list/index.vue';
import { store } from '../../../store';
import { PopupType, IconList } from '@/enums/app';

import { WIDTH_DEFAULT } from '../../header/constant';
import { toast, ToastOptions } from 'vue3-toastify';
import { getTutorial } from '../../../api/repository/api';
import { BoardInfo } from '../../../interface/chart';

const emit = defineEmits(['eClosePopup']);

const sBoardType = ref<string>();
const sBoardName = ref<string>('Tag Analyzer');
const cReferences = computed(() => {
    const sReferences = localStorage.getItem('references');
    if (sReferences) {
        return JSON.parse(sReferences);
    } else {
        return '';
    }
});

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);
const cWidthPopup = computed((): string => {
    switch (sPopupType.value) {
        case PopupType.PREFERENCES:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.TIME_RANGE:
            return WIDTH_DEFAULT.TIME_RANGE;
        case PopupType.TIME_DURATION:
            return WIDTH_DEFAULT.TIME_DURATION;
        case PopupType.MANAGE_DASHBOARD:
            return WIDTH_DEFAULT.MANAGE_DASHBOARD;
        case PopupType.SAVE_DASHBOARD:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.ADD_TAB:
            return WIDTH_DEFAULT.PREFERENCES;
        case PopupType.NEW_TAGS:
            return '667px';
        case PopupType.FILE_BROWSER:
            return '667px';
        default:
            return WIDTH_DEFAULT.DEFAULT;
    }
});
const sOptions = [
    { name: 'SQL', type: 'SQL Editor', icon: IconList.SQL },
    { name: 'TQL', type: 'Tql', icon: IconList.TQL },
    { name: 'Tag Analyzer', type: 'dashboard', icon: IconList.TAZ },
    { name: 'Shell', type: 'Terminal', icon: IconList.SHELL },
];
const sExpOptions = [
    { name: 'SQL', type: 'SQL Editor', icon: IconList.SQL },
    { name: 'TQL', type: 'Tql', icon: IconList.TQL },
    { name: 'WorkSheet', type: 'wrk', icon: IconList.WRK },
    { name: 'Tag Analyzer', type: 'dashboard', icon: IconList.TAZ },
    { name: 'Shell', type: 'Terminal', icon: IconList.SHELL },
];
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const cLocalStorageOption = computed(() => !!localStorage.getItem('experimentMode'));
const sDialog = ref<boolean>(false);

const isDragged = ref<boolean>(false);

const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});

const onClickPopupItem = (aPopupName: PopupType) => {
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

const onDragenter = () => {
    isDragged.value = true;
};
const onDragleave = () => {
    isDragged.value = false;
};
const onDragover = (event: any) => {
    event.preventDefault();
};

const readFile = async (aItem: any) => {
    return (await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
            resolve(e.target.result);
        };
        reader.readAsText(aItem);
    })) as string;
};

const onUpload = async (aEvent: any) => {
    const sFile = aEvent.target.files[0];
    const extension = sFile.name.slice(-4);

    if (extension === '.wrk' || extension === '.sql' || extension === '.tql' || extension === '.taz') {
        const sResult: string = await readFile(aEvent.target.files[0]);

        uploadFile(sFile, sResult);
    } else {
        toast('Please check the extension.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    }
};

const onDrop = async (aEvent: any) => {
    isDragged.value = false;
    const sFile = aEvent.dataTransfer.files[0];
    aEvent.preventDefault();
    const extension = sFile.name.slice(-4);
    if (extension === '.wrk' || extension === '.sql' || extension === '.tql' || extension === '.taz') {
        const sResult: string = await readFile(sFile);

        uploadFile(sFile, sResult);
    } else {
        toast('Please check the extension.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
    }
};

const uploadFile = (aItem: any, bItem: string) => {
    const sIdx = gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value);

    const sTypeOption = aItem.name.split('.')[1];

    let sType;
    if (sTypeOption === 'sql') sType = 'SQL Editor';
    else if (sTypeOption === 'tql') sType = 'Tql';
    else if (sTypeOption === 'taz') sType = 'dashboard';
    else if (sTypeOption === 'wrk') sType = 'wrk';
    else sType = 'Terminal';

    if (sType === 'dashboard') {
        const sDashboard = JSON.parse(bItem);
        sDashboard.board_id = new Date().getTime();
        store.commit(MutationTypes.changeTab, sDashboard as BoardInfo);
        store.commit(MutationTypes.setSelectedTab, sDashboard.board_id);
        gBoard.value.board_name = aItem.name;
    } else {
        const sNode = {
            ...gTabList.value[sIdx],
            board_id: String(new Date().getTime()),
            type: sType,
            result: new Map(),
            board_name: aItem.name,
            savedCode: '',
            path: '',
            edit: false,
        };

        store.commit(MutationTypes.changeTab, sNode);
        store.commit(MutationTypes.setSelectedTab, sNode.board_id);

        if (sTypeOption === 'wrk') {
            gBoard.value.sheet = JSON.parse(bItem).data;
            gBoard.value.savedCode = JSON.parse(bItem).data;
        } else {
            gBoard.value.code = bItem;
            gBoard.value.savedCode = bItem;
        }
        gBoard.value.board_name = aItem.name;
    }
};

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
    sDialog.value = false;
};
const showDoc = async (aItem: any) => {
    if (aItem.type === 'url') {
        window.open(aItem.address, aItem.target);
    } else {
        const sData: any = await getTutorial(aItem.address);
        const sIdx = gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value);

        const sTypeOption = aItem.type;
        let sType;
        if (sTypeOption === 'sql') sType = 'SQL Editor';
        else if (sTypeOption === 'tql') sType = 'Tql';
        else if (sTypeOption === 'taz') sType = 'dashboard';
        else if (sTypeOption === 'wrk') sType = 'wrk';
        else sType = 'Terminal';

        if (sType === 'dashboard') {
            const sDashboard = sData;
            sDashboard.board_id = new Date().getTime();
            store.commit(MutationTypes.changeTab, sDashboard as BoardInfo);
            store.commit(MutationTypes.setSelectedTab, sDashboard.board_id);
            gBoard.value.board_name = aItem.title;
        } else {
            const sNode = {
                ...gTabList.value[sIdx],
                board_id: String(new Date().getTime()),
                type: sType,
                result: new Map(),
                board_name: aItem.title,
                savedCode: '',
                path: '',
                edit: false,
            };

            store.commit(MutationTypes.changeTab, sNode);
            store.commit(MutationTypes.setSelectedTab, sNode.board_id);

            if (sTypeOption === 'wrk') {
                gBoard.value.sheet = sData.data;
            } else {
                gBoard.value.code = sData;
            }

            const sPath = aItem.address.split('/');
            gBoard.value.board_name = sPath[sPath.length - 1];
        }
    }
};
const onSetting = () => {
    if (!sBoardName.value) {
        toast('please enter Name', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }
    const sIdx = gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value);

    const sNode = {
        ...gTabList.value[sIdx],
        board_id: String(new Date().getTime()),
        type: sBoardType.value,
        board_name: sBoardName,
        result: new Map(),
        path: '',
        sheet: [
            {
                id: String(new Date().getTime()) + (Math.random() * 1000).toFixed(),
                type: 'mrk',
                contents: '# Lorem ipsum \n Lorem ipsum dolor sit amet,\n consectetur adipiscing elit,\n sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                result: new Map() as any,
                status: false,
                height: 200,
                lang: [
                    ['markdown', 'Markdown'],
                    ['SQL', 'SQL'],
                    ['javascript', 'TQL'],
                ],
                minimal: false,
            },
        ],
        savedCode: '',
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
    margin: 0;
    padding: 4% 0;
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
.import-size {
    box-shadow: none;
    border: 1px dashed #dbe2ea;
    justify-content: center;
    align-items: center;
    border-radius: 6px;
    .icon-body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        i,
        span {
            opacity: 0.6;
        }
    }
}
.import-size-hover {
    box-shadow: none;
    border: 1px dashed #dbe2ea;
    background: #eeeeee;
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
    overflow: auto;
    flex-direction: column;
    justify-content: center;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
}
.add-tab::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.add-tab::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.add-tab::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
.referOption {
    display: flex;
    align-items: center;
    i {
        margin-right: 4px;
    }
}
.bottom-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8%;
}
.header {
    flex-direction: column;
    height: 13%;
    align-items: center;
    justify-content: center;
    display: flex;
    font-size: 32px;
    font-weight: 600;
    letter-spacing: 0px;
    .Information {
        font-weight: 600;
        font-size: 20px;
        opacity: 0.8;
        letter-spacing: 0px;
    }
}
.upload-field {
    z-index: 99999;
    position: fixed;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: black;
    opacity: 0.5;
}

.add-tab-form {
    width: 70%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
}
.card-form {
    display: flex;
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
.link-list {
    padding-bottom: 2.5%;
    button {
        display: flex;
        align-items: center;
    }
    i {
        margin-right: 4px;
    }
    gap: 8px;
    display: flex;
    flex-direction: column;
}
.board-name-sheet {
    display: flex;
    justify-content: center;
}
.next-btn {
    width: 100%;
    // margin: 0 !important;
    // flex-direction: column;
}
</style>
