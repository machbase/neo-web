<template>
    <div v-if="onContext" @contextmenu.prevent @mousedown="closeContextMenu" class="cover"></div>
    <Transition>
        <div v-show="onContext" ref="contextMenu" @contextmenu.prevent class="contextOption">
            <div class="context-option-form">
                <button @click="deleteFile" class="show"><v-icon size="14px">mdi-delete</v-icon> Delete</button>
                <button @click="downloadFile" class="show"><v-icon size="14px">mdi-download</v-icon> Download</button>
            </div>
        </div>
    </Transition>
    <v-sheet color="transparent">
        <v-sheet class="toolbar" color="transparent">
            <v-sheet class="back-btn-sheet" color="transparent">
                <v-btn
                    @click="backBtn({ isDir: false, lastModifiedUnixMillis: '', name: '..', size: '', type: 'back' })"
                    density="comfortable"
                    :disabled="sSelectedClickDir.length === 0"
                    icon="mdi-arrow-left"
                    size="16px"
                    variant="plain"
                ></v-btn>
                <v-btn @click="forwardBtn" density="comfortable" :disabled="sDeleteDir.length === 0" icon="mdi-arrow-right" size="16px" variant="plain"></v-btn>
            </v-sheet>
            <div ref="rPathField" class="path-form" :style="cIsDarkMode ? { background: '#565656' } : { background: '#dfe3e4' }">
                {{ cJoinPath }}
            </div>
            <v-sheet color="transparent">
                <v-btn @click="makeFolder" density="comfortable" size="16px" variant="plain">
                    <v-icon color="#F5AA64"> mdi-folder-plus </v-icon>
                </v-btn>
            </v-sheet>
        </v-sheet>
        <v-sheet class="file-name-form-header" color="transparent" height="24px" width="100%">
            <v-sheet color="transparent" width="60%"> <span style="margin-left: 20px"> name </span> </v-sheet>
            <v-sheet color="transparent" width="20%">last modified</v-sheet>
            <v-sheet color="transparent" width="20%">size</v-sheet>
        </v-sheet>
        <v-divider></v-divider>
        <v-sheet class="list-form" color="transparent" max-height="250px" min-height="250px" width="100%">
            <v-sheet
                v-for="(aChildren, aIdx) in sList"
                :key="aIdx + aChildren.lastModifiedUnixMillis"
                @click="clickOption(aChildren)"
                @contextmenu.prevent
                @mousedown.right.stop="openContextMenu($event, aChildren)"
                class="file-list"
                color="transparent"
                height="24px"
                :style="[
                    sClickFile && sClickFile.name + sClickFile.lastModifiedUnixMillis === aChildren.name + aChildren.lastModifiedUnixMillis
                        ? cIsDarkMode
                            ? { backgroundColor: 'rgba(46, 192, 223, 0.2) !important', borderTop: '1px solid #2ec0df', borderBottom: '1px solid #2ec0df' }
                            : { backgroundColor: 'rgba(46, 192, 223, 0.2) !important', borderTop: '1px solid #2ec0df', borderBottom: '1px solid #2ec0df' }
                        : {},
                ]"
                width="100%"
            >
                <v-sheet class="file-name-form" color="transparent" width="60%">
                    <v-icon :color="aChildren.type === 'dir' ? '#F5AA64' : cIsDarkMode ? '#adb3bc' : '#367FEB'" size="16px">
                        {{
                            aChildren.type === 'dir'
                                ? IconList.DIR
                                : aChildren.type === '.sql'
                                ? IconList.SQL
                                : aChildren.type === '.tql'
                                ? IconList.TQL
                                : aChildren.type === '.taz'
                                ? IconList.TAZ
                                : aChildren.type === '.wrk'
                                ? IconList.WRK
                                : ''
                        }}
                    </v-icon>
                    <div>{{ aChildren.name }}</div>
                </v-sheet>
                <v-sheet class="file-modified-form" color="transparent" width="20%">
                    <div>{{ elapsedTime(aChildren.lastModifiedUnixMillis) }}</div>
                </v-sheet>
                <v-sheet class="file-modified-form" color="transparent" width="20%">
                    <div>{{ aChildren.size && elapsedSize(aChildren.size) }}</div>
                </v-sheet>
            </v-sheet>
        </v-sheet>
        <v-divider></v-divider>

        <v-sheet v-if="pInfo === 'save'" color="transparent" width="100%">
            <div class="search-wrapper">
                <div class="file-name-header">File Name:</div>
                <input v-model="sFileName" @keydown.enter="importFile" class="form-control taginput input" style="width: 80%" type="text" />
            </div>
        </v-sheet>

        <div class="popup__btn-group">
            <v-btn v-if="pInfo === 'save'" @click="importFile" class="button-effect-color" :disabled="cFileNameStat" variant="outlined"> OK </v-btn>
            <v-btn v-else @click="uploadFile" class="button-effect-color" :disabled="!sClickFile" variant="outlined"> Open </v-btn>
            <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
        </div>
    </v-sheet>
</template>

<script setup lang="ts" name="SaveDashboard">
import { computed, onMounted, defineEmits, defineProps, ref } from 'vue';
import { getFileList, postFileList, deleteFileList } from '../../../api/repository/api';
import { store } from '../../../store';
import { toast, ToastOptions } from 'vue3-toastify';
import { MutationTypes } from '../../../store/mutations';
import { cloneDeep } from 'lodash';
import { BoardInfo } from '../../../interface/chart';
import { IconList } from '../../../enums/app';
interface propsOption {
    pInfo: string;
    pNewOpen?: string;
    pUploadType: string;
}
const props = defineProps<propsOption>();

const contextMenu = ref();
const onContext = ref(false);
const sRightSelected = ref();

const emit = defineEmits(['eClosePopup']);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const sList = ref<any[]>([]);
const gSelectedTab = computed(() => store.state.gSelectedTab);

const cIsDarkMode = computed(() => store.getters.getDarkMode);

const cJoinPath = computed(() => '/' + sSelectedClickDir.value.join('/'));

let sTimeoutId: any = null;

const rPathField = ref<any>();
const sFileName = ref<any>('');
const sSelectedClickData = ref<any>();
const sClickFile = ref<any>();
const sSelectedClickDir = ref<any>([]);
const sDeleteDir = ref<any>([]);

const cFileNameStat = computed(() => {
    const extension = sFileName.value.slice(-4);
    let sTypeOption = gBoard.value.type;
    let sType;

    if (sTypeOption === 'sql') sType = '.sql';
    else if (sTypeOption === 'tql') sType = '.tql';
    else if (sTypeOption === 'taz') sType = '.taz';
    else if (sTypeOption === 'wrk') sType = '.wrk';
    else sTypeOption === 'term';

    if (sType === extension) {
        return false;
    } else {
        return true;
    }
});

const deleteFile = async () => {
    const sConfirm = confirm(`Do you want to delete this file (${sClickFile.value.name})?`);
    if (sConfirm) {
        const sResult: any = await deleteFileList(sSelectedClickDir.value.join('/'), sClickFile.value.name);
        if (sResult.reason === 'success') {
            getFile();
        } else {
            toast(sResult.data.reason, {
                autoClose: 1000,
                theme: cIsDarkMode.value ? 'dark' : 'light',
                position: toast.POSITION.TOP_RIGHT,
                type: 'error',
            } as ToastOptions);
        }
    }
    closeContextMenu();
};

const closeContextMenu = () => {
    onContext.value = false;
};
const openContextMenu = (e: any, aChildren: any) => {
    sClickFile.value = aChildren;
    onContext.value = !onContext.value;
    contextMenu.value.style.top = e.y + 'px';
    contextMenu.value.style.left = e.x + 'px';
};
const elapsedSize = (aSize: number): string => {
    if (typeof aSize === 'string') return '';
    if (aSize < 1000) return aSize + ' B';
    return Math.floor(aSize / 1000) + ' KB';
};

const elapsedTime = (date: number): string => {
    if (typeof date === 'string') return '';
    const start = date;
    const end = new Date();

    const seconds = Math.floor((end.getTime() - start) / 1000);
    if (seconds < 60) return 'just a moment ago';

    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.floor(minutes)}min ago`;

    const hours = minutes / 60;
    if (hours < 24) return `${Math.floor(hours)}hour ago`;

    const days = hours / 24;
    if (days < 30) return `${Math.floor(days)}day ago`;

    const months = days / 30;
    return `${Math.floor(months)}month ago`;
};

const backBtn = (aItem: any) => {
    sClickFile.value = aItem;
    if (
        props.pUploadType === 'sql'
            ? sClickFile.value.type === '.sql'
            : props.pUploadType === 'tql'
            ? sClickFile.value.type === '.tql'
            : props.pUploadType === 'taz'
            ? sClickFile.value.type === '.taz'
            : sClickFile.value.type === '.wrk'
    ) {
        sFileName.value = sClickFile.value.name;
    }
    uploadFile();
};
const forwardBtn = () => {
    sSelectedClickDir.value.push(sDeleteDir.value[sDeleteDir.value.length - 1]);
    sDeleteDir.value.pop();
    getFile();
};

const clickOption = (aItem: any) => {
    if (!sTimeoutId) {
        sClickFile.value = aItem;
        if (
            props.pUploadType === 'sql'
                ? sClickFile.value.type === '.sql'
                : props.pUploadType === 'tql'
                ? sClickFile.value.type === '.tql'
                : props.pUploadType === 'taz'
                ? sClickFile.value.type === '.taz'
                : sClickFile.value.type === '.wrk'
        ) {
            sFileName.value = sClickFile.value.name;
        }
        sTimeoutId = setTimeout(() => {
            // simple click
            sTimeoutId = null;
        }, 300); //tolerance in ms
    } else {
        if (sClickFile.value === aItem) {
            clearTimeout(sTimeoutId);
            if (props.pInfo === 'open' || sClickFile.value.type === 'dir' || sClickFile.value.type === 'back') {
                uploadFile();
            } else {
                importFile();
            }
            sTimeoutId = null;
        } else {
            sClickFile.value = aItem;
        }

        // double click
    }
};

const onClosePopup = () => {
    emit('eClosePopup');
};

const downloadFile = async () => {
    const sData: any = await getFileList('', sSelectedClickDir.value.join('/'), sClickFile.value.name);

    const sBlob = new Blob([sData], { type: `text/plain` });
    const sLink = document.createElement('a');
    sLink.href = URL.createObjectURL(sBlob);
    sLink.setAttribute('download', sClickFile.value.name);
    sLink.click();
    URL.revokeObjectURL(sLink.href);
    closeContextMenu();
};

const getFile = async () => {
    const sData: any = await getFileList(
        props.pNewOpen
            ? ''
            : props.pUploadType === 'sql'
            ? '?filter=*.sql'
            : props.pUploadType === 'tql'
            ? '?filter=*.tql'
            : props.pUploadType === 'taz'
            ? '?filter=*.taz'
            : '?filter=*.wrk',
        sSelectedClickDir.value.join('/'),
        sSelectedClickData.value
    );
    if (sData.response && sData.response.status === 401) {
        onClosePopup();
        return;
    }
    if (sData && sData.success) {
        sList.value = [];
        if (sSelectedClickDir.value.length !== 0) sList.value.push({ isDir: false, lastModifiedUnixMillis: '', name: '..', size: '', type: 'back' });
        sData.data.children &&
            sData.data.children.length > 0 &&
            sData.data.children.map((aItem: any) => {
                sList.value.push(aItem);
            });
        sClickFile.value = '';
    } else {
        const sPathIdx = gTabList.value.findIndex((aItem) => aItem.path === `/` + sSelectedClickDir.value.join('/') && aItem.board_name === sSelectedClickData.value);
        if (sPathIdx !== -1) {
            if (props.pNewOpen) {
                gTabList.value.splice(
                    gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value),
                    1
                );
            }
            store.commit(MutationTypes.setSelectedTab, gTabList.value[sPathIdx].board_id);
            onClosePopup();
            return;
        }
        if (props.pNewOpen) {
            const sIdx = gTabList.value.findIndex((aItem) => aItem.board_id === gSelectedTab.value);

            const sTypeOption = sSelectedClickData.value.split('.')[1];
            let sType;
            if (sTypeOption === 'sql') sType = 'sql';
            else if (sTypeOption === 'tql') sType = 'tql';
            else if (sTypeOption === 'taz') sType = 'taz';
            else if (sTypeOption === 'wrk') sType = 'wrk';
            else sType = 'term';

            if (sType === 'taz') {
                const sDashboard = JSON.parse(sData);
                sDashboard.board_id = new Date().getTime();
                store.commit(MutationTypes.changeTab, sDashboard as BoardInfo);
                store.commit(MutationTypes.setSelectedTab, sDashboard.board_id);
                sDashboard.board_id = new Date().getTime();

                gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
                gBoard.value.board_name = sSelectedClickData.value;
            } else {
                const sNode = {
                    ...gTabList.value[sIdx],
                    board_id: String(new Date().getTime()),
                    type: sType,
                    result: new Map(),
                    board_name: sSelectedClickData.value,
                    savedCode: '',
                    path: '',
                    edit: false,
                };

                store.commit(MutationTypes.changeTab, sNode);
                store.commit(MutationTypes.setSelectedTab, sNode.board_id);

                if (sTypeOption === 'wrk') {
                    gBoard.value.sheet = JSON.parse(sData).data;
                    gBoard.value.savedCode = JSON.stringify(JSON.parse(sData).data);
                } else {
                    gBoard.value.code = sData;
                    gBoard.value.savedCode = sData;
                }

                gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
                gBoard.value.board_name = sSelectedClickData.value;
            }
        } else {
            const sTypeOption = sSelectedClickData.value.split('.')[1];
            let sType;
            if (sTypeOption === 'sql') sType = 'sql';
            else if (sTypeOption === 'tql') sType = 'tql';
            else if (sTypeOption === 'taz') sType = 'taz';
            else if (sTypeOption === 'wrk') sType = 'wrk';
            else sType = 'term';

            if (sType === 'taz') {
                const sDashboard = JSON.parse(sData);

                sDashboard.board_id = new Date().getTime();
                store.commit(MutationTypes.changeTab, sDashboard as BoardInfo);
                store.commit(MutationTypes.setSelectedTab, sDashboard.board_id);
                gBoard.value.board_name = sSelectedClickData.value;
            } else {
                const sIdx = gTabList.value.findIndex((aItem) => aItem.path === `/` + sSelectedClickDir.value.join('/') && sSelectedClickData.value === gBoard.value.board_name);
                if (sType === 'wrk') {
                    gBoard.value.sheet = JSON.parse(sData).data;
                    gBoard.value.savedCode = JSON.stringify(JSON.parse(sData).data);
                } else {
                    gBoard.value.code = sData;
                    gBoard.value.savedCode = sData;
                }
                gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
                gBoard.value.board_name = sSelectedClickData.value;
            }
        }
        onClosePopup();
    }
};

const makeFolder = () => {
    const sFilterList = sList.value.filter((aItem) => aItem.isDir);

    if (sFilterList.length === 0) {
        postFileList('', sSelectedClickDir.value.join('/'), `new`);
    } else {
        const sSortData = sFilterList
            .map((aItem) => {
                return aItem.name;
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
            postFileList('', sSelectedClickDir.value.join('/'), `new-${sIdx}`);
        } else {
            postFileList('', sSelectedClickDir.value.join('/'), `new-${sSortData.length}`);
        }
    }
    getFile();
};

function containsInvalidCharsOrKeywords(input: string) {
    const invalidChars = /[\\\/:*?"<>|]/;
    const keywords = [
        'ASSOC',
        'AT',
        'ATTRIB',
        'BREAK',
        'CACLS',
        'CALL',
        'CD',
        'CHCP',
        'CHDIR',
        'CHKDSK',
        'CHKNTFS',
        'CLS',
        'CMD',
        'COLOR',
        'COMP',
        'COMPACT',
        'CONVERT',
        'COPY',
        'DATE',
        'DEL',
        'DIR',
        'DISKCOMP',
        'DISKCOPY',
        'DOSKEY',
        'ECHO',
        'ENDLOCAL',
        'ERASE',
        'EXIT',
        'FC',
        'FIND',
        'FINDSTR',
        'FOR',
        'FORMAT',
        'FTYPE',
        'GOTO',
        'GRAFTABL',
        'HELP',
        'IF',
        'LABEL',
        'MD',
        'MKDIR',
        'MODE',
        'MORE',
        'MOVE',
        'PATH',
        'PAUSE',
        'POPD',
        'PRINT',
        'PROMPT',
        'PUSHD',
        'RD',
        'RECOVER',
        'REM',
        'REN',
        'RENAME',
        'REPLACE',
        'RMDIR',
        'SET',
        'SETLOCAL',
        'SHIFT',
        'SORT',
        'START',
        'SUBST',
        'TIME',
        'TITLE',
        'TREE',
        'TYPE',
        'VER',
        'VERIFY',
        'VOL',
        'XCOPY',
    ];

    if (invalidChars.test(input)) {
        return false;
    }

    const sInput = input.substring(0, input.length - 4);

    for (const keyword of keywords) {
        if (sInput === keyword) {
            return false;
        }
    }

    return true;
}

const importFile = async () => {
    if (!containsInvalidCharsOrKeywords(sFileName.value)) {
        toast(`The file name is not available.`, {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }

    if (sFileName.value.length > 80) {
        toast(`The file name must be 80 characters or less.`, {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }

    const sDupName = sList.value.find((aItem) => aItem.name === sFileName.value);
    if (sDupName) {
        if (sFileName.value !== gBoard.value.board_name) {
            const sConfirm = confirm('Do you want to overwrite it?');
            if (sConfirm) {
                const sResult: any = await postFileList(
                    props.pUploadType === 'taz' ? JSON.stringify(gBoard.value) : props.pUploadType === 'wrk' ? { data: gBoard.value.sheet } : gBoard.value.code,
                    sSelectedClickDir.value.join('/'),
                    sFileName.value
                );
                if (sResult.success === true) {
                    uploadFile();
                    gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
                    gBoard.value.board_name = sFileName.value;
                    if (props.pUploadType === 'wrk') {
                        gBoard.value.savedCode = JSON.stringify(gBoard.value.sheet);
                    } else {
                        gBoard.value.savedCode = gBoard.value.code;
                    }
                }

                uploadFile();
                gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
                gBoard.value.board_name = sFileName.value;
                if (props.pUploadType === 'wrk') {
                    gBoard.value.savedCode = JSON.stringify(gBoard.value.sheet);
                } else {
                    gBoard.value.savedCode = gBoard.value.code;
                }

                onClosePopup();
                return;
            } else {
                return;
            }
        }
    }

    const sResult: any = await postFileList(
        props.pUploadType === 'taz' ? JSON.stringify(gBoard.value) : props.pUploadType === 'wrk' ? { data: gBoard.value.sheet } : gBoard.value.code,
        sSelectedClickDir.value.join('/'),
        sFileName.value
    );
    if (sResult.success === true) {
        gBoard.value.path = '/' + sSelectedClickDir.value.join('/');
        gBoard.value.board_name = sFileName.value;
        if (props.pUploadType === 'wrk') {
            gBoard.value.savedCode = JSON.stringify(gBoard.value.sheet);
        } else {
            gBoard.value.savedCode = gBoard.value.code;
        }

        getFile();
    }
    onClosePopup();
};

const uploadFile = async () => {
    sSelectedClickData.value = '';
    if (sClickFile.value.type === 'dir') {
        rPathField.value.scrollLeft = rPathField.value.scrollWidth;
        sSelectedClickDir.value.push(sClickFile.value.name);
        sDeleteDir.value = [];
    }
    if (sClickFile.value.type === 'back') {
        sDeleteDir.value.push(sSelectedClickDir.value[sSelectedClickDir.value.length - 1]);
        sSelectedClickDir.value.pop();
        sClickFile.value = '';
    }
    if (sClickFile.value.type === '.sql' || sClickFile.value.type === '.tql' || sClickFile.value.type === '.taz' || sClickFile.value.type === '.wrk') {
        sSelectedClickData.value = sClickFile.value.name;
    }
    getFile();
};

onMounted(async () => {
    if (gBoard.value.path) {
        const sData = gBoard.value.path.split('/');
        sData.shift();
        if (sData[0]) {
            sData.map((aItem: string) => {
                sSelectedClickDir.value.push(aItem);
            });
        }
    }
    getFile();
    let sTypeOption = gBoard.value.type;
    let sType;
    if (sTypeOption === 'sql') sType = '.sql';
    else if (sTypeOption === 'tql') sType = '.tql';
    else if (sTypeOption === 'taz') sType = '.taz';
    else if (sTypeOption === 'wrk') sType = '.wrk';
    else sTypeOption === 'term';

    const extension = gBoard.value.board_name.slice(-4);
    if (extension === '.sql' || extension === '.tql' || extension === '.taz' || extension === '.wrk') {
        sFileName.value = gBoard.value.board_name;
    } else {
        sFileName.value = gBoard.value.board_name + sType;
    }
});
</script>
<style>
.v-enter-active,
.v-leave-active {
    transition: opacity 0.2s ease;
}
.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>
<style lang="scss" scoped>
@import 'index.scss';

.file-list {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    display: flex;
}
.file-list:hover {
    opacity: 0.8;
    border-top: 1px solid #2ec0df !important;
    border-bottom: 1px solid #2ec0df !important;
}
.file-name-form-header {
    display: flex;
}
.cover {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
}

.contextOption {
    position: fixed;
    z-index: 1001;
    background: white;
    border-radius: 8px;
    padding: 5px 0;
    width: 220px;
    -webkit-box-shadow: 0px 5px 10px 1px rgba(0, 0, 0, 0.3);
    font-size: 14px;
    .show {
        i {
            margin-right: 4px;
        }
        width: 100%;
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: start;
        height: 25px;
    }
    .show:hover {
        background: #eeeeee;
    }
    .copy:hover {
        background: #eeeeee;
    }
    .copy {
        i {
            margin-right: 4px;
        }
        height: 25px;
        width: 100%;
        padding: 0 15px;
        display: flex;
        align-items: center;
        justify-content: start;
    }
}
.file-name-form {
    display: flex;
    align-items: center;
    i {
        margin-right: 4px;
    }
}
.file-modified-form {
    display: flex;
    align-items: center;
}
.popup__btn-group {
    justify-content: end !important;
}
.list-form {
    overflow: auto;
}
.list-form::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}

.list-form::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.list-form::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
.search-wrapper {
    display: flex;
    align-items: center;
    margin-top: 8px;
    .file-name-header {
        margin-right: 4px;
    }
}
.file-name-form-header {
    div {
        display: flex;
        align-items: center;
    }
}
.toolbar {
    height: 27px;
    display: flex;
    justify-content: space-between;
    padding: 0 16px 0 0;
}
.back-btn-sheet {
    button {
        margin-right: 12px;
    }
}
.path-form {
    background: #dfe3e4;
    border-radius: 8px;
    min-width: 50%;
    display: flex;
    align-items: center;
    padding: 0 12px;
    overflow: auto;
    height: 90%;
    width: 50%;
}

.path-form::-webkit-scrollbar {
    width: 0px;
    height: 0px;
}

.path-form::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: #141415;
}

.path-form::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}
</style>
