<template>
    <v-sheet color="transparent">
        <v-sheet class="file-name-form-header" color="transparent" height="24px" width="100%">
            <v-sheet color="transparent" width="60%">name</v-sheet>
            <v-sheet color="transparent" width="20%">last modified</v-sheet>
            <v-sheet color="transparent" width="20%">size</v-sheet>
        </v-sheet>
        <v-divider></v-divider>
        <v-sheet class="list-form" max-height="300px" width="100%">
            <v-sheet
                v-for="(aChildren, aIdx) in sList"
                :key="aIdx + aChildren.lastModifiedUnixMillis"
                @click="clickOption(aChildren)"
                class="file-list"
                color="transparent"
                height="24px"
                :style="
                    sClickFile && sClickFile.name + sClickFile.lastModifiedUnixMillis === aChildren.name + aChildren.lastModifiedUnixMillis
                        ? cIsDarkMode
                            ? { backgroundColor: '#ffffff !important' }
                            : { backgroundColor: '#121212 !important', color: '#f8f8f8 !important' }
                        : {}
                "
                width="100%"
            >
                <v-sheet class="file-name-form" color="transparent" width="60%">
                    <v-icon size="16px"
                        >{{
                            aChildren.type === 'dir'
                                ? 'mdi-folder'
                                : aChildren.type === '.tql' || aChildren.type === '.sql'
                                ? 'mdi-file-document-outline'
                                : 'mdi-folder-arrow-up-outline'
                        }}
                    </v-icon>
                    <div>{{ aChildren.name }}</div>
                </v-sheet>
                <v-sheet class="file-modified-form" color="transparent" width="20%">
                    <div>{{ elapsedTime(aChildren.lastModifiedUnixMillis) }}</div>
                </v-sheet>
                <v-sheet class="file-modified-form" color="transparent" width="20%">
                    <div>{{ aChildren.size && aChildren.size + ' byte' }}</div>
                </v-sheet>
            </v-sheet>
        </v-sheet>
        <v-divider></v-divider>

        <v-sheet v-if="pInfo === 'save'" color="transparent" width="100%">
            <div class="search-wrapper">
                <div>File Name</div>
                <input v-model="sFileName" @keydown.enter="onSearch" class="form-control taginput input" style="width: 80%" type="text" />
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
import { computed, onMounted, defineEmits, defineExpose, defineProps, reactive, ref, watch, withDefaults } from 'vue';
import { getFileList, postFileList } from '../../../api/repository/api';
import { store } from '../../../store';
import { MutationTypes } from '../../../store/mutations';
import { cloneDeep } from 'lodash';
interface propsOption {
    pInfo: string;
    pSql: boolean;
}
const props = defineProps<propsOption>();

const emit = defineEmits(['eClosePopup']);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const sList = ref<any[]>([]);
const gSelectedTab = computed(() => store.state.gSelectedTab);

const cIsDarkMode = computed(() => store.getters.getDarkMode);

let sTimeoutId: any = null;

const sFileName = ref<any>('');
const sSelectedClickData = ref<any>();
const sClickFile = ref<any>();
const sSelectedClickDir = ref<any>([]);

const cFileNameStat = computed(() => {
    const extension = sFileName.value.slice(-4);
    if (extension === '.sql' || extension === '.tql') {
        return false;
    } else {
        return true;
    }
});
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

const clickOption = (aItem: any) => {
    if (!sTimeoutId) {
        sClickFile.value = aItem;
        if (props.pSql ? sClickFile.value.type === '.sql' : sClickFile.value.type === '.tql') {
            sFileName.value = sClickFile.value.name;
        }
        sTimeoutId = setTimeout(() => {
            // simple click
            sTimeoutId = null;
        }, 300); //tolerance in ms
    } else {
        if (sClickFile.value === aItem) {
            clearTimeout(sTimeoutId);
            if (props.pInfo === 'open' || sClickFile.value.type === 'dir') {
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

const getFile = async () => {
    const sData: any = await getFileList(props.pSql ? '?filter=*.sql' : '?filter=*.tql', sSelectedClickDir.value.join('/'), sSelectedClickData.value);
    if (sData && sData.reason) {
        sList.value = [];
        if (sSelectedClickDir.value.length !== 0) sList.value.push({ isDir: false, lastModifiedUnixMillis: '', name: '..', size: '', type: 'back' });
        sData.data.children.map((aItem: any) => {
            sList.value.push(aItem);
        });
    } else {
        gBoard.value.code = sData;
        gBoard.value.board_name = sSelectedClickData.value;
        onClosePopup();
    }
};

const importFile = async () => {
    const sDupName = sList.value.find((aItem) => aItem.name === sFileName.value);
    if (sDupName) {
        if (sFileName.value !== gBoard.value.board_name) {
            const sConfirm = confirm('Do you want to overwrite it?');
            if (sConfirm) {
                postFileList(gBoard.value.code, sSelectedClickDir.value.join('/'), sFileName.value);
                uploadFile();
                onClosePopup();
                return;
            } else {
                return;
            }
        }
    }
    postFileList(gBoard.value.code, sSelectedClickDir.value.join('/'), sFileName.value);
    getFile();
    onClosePopup();
};

const uploadFile = async () => {
    sSelectedClickData.value = '';
    if (sClickFile.value.type === 'dir') {
        sSelectedClickDir.value.push(sClickFile.value.name);
    }
    if (sClickFile.value.type === 'back') {
        sSelectedClickDir.value.pop();
        sClickFile.value = '';
    }
    if (sClickFile.value.type === '.sql' || sClickFile.value.type === '.tql') {
        sSelectedClickData.value = sClickFile.value.name;
    }
    getFile();
};

onMounted(async () => {
    getFile();
    sFileName.value = gBoard.value.board_name;
});
</script>

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
.search-wrapper {
    display: flex;
    align-items: center;
}
</style>
