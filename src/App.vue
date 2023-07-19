<template>
    <div :class="cIsDarkMode ? 'dark' : 'light'">
        <div class="app">
            <Header />

            <router-view class="body" />
            <router-view name="Footer" />
        </div>

        <PopupWrap @eClosePopup="onClosePopup" :p-info="sFileOption" :p-show="sDialog" :p-type="sPopupType" :p-upload-type="cBoardType" :p-width="cWidthPopup" />
    </div>
</template>

<script setup lang="ts" name="App">
import { useStore } from '@/store';
import Header from '@/components/header/index.vue';
import PopupWrap from '@/components/popup-list/index.vue';
import { computed, onMounted, nextTick, ref } from 'vue';
import { ActionTypes } from './store/actions';
import { useRoute } from 'vue-router';
import { MutationTypes } from './store/mutations';
import { getWindowOs } from './utils/utils';
import { postFileList } from './api/repository/api';
import { PopupType, IconList } from './enums/app';
import { WIDTH_DEFAULT } from './components/header/constant';
import { ToastOptions, toast } from 'vue3-toastify';
import mermaid from 'mermaid';

let sFileOption = ref<string>('');

const sDialog = ref<boolean>(false);
const sResizeStatus = ref<boolean>(true);

const route = useRoute();
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sPopupType = ref<PopupType>(PopupType.FILE_BROWSER);

const gSelectedTab = computed(() => store.state.gSelectedTab);
const gTabList = computed(() => store.state.gTabList);
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
const cBoardType = computed(() => {
    switch (gBoard.value && gBoard.value.type) {
        case 'tql':
            return 'tql';
        case 'sql':
            return 'sql';
        case 'wrk':
            return 'wrk';
        case 'taz':
            return 'taz';
    }
    return 'new';
});

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

const setConsoleStatus = () => {
    sResizeStatus.value = !sResizeStatus.value;
};

const onClosePopup = () => {
    sDialog.value = false;
};

const onClickPopupItem = (aPopupName: PopupType, aFileOption?: string) => {
    if (aFileOption === 'save') {
        sFileOption.value = 'save';
    } else {
        sFileOption.value = 'open';
    }
    sPopupType.value = aPopupName;
    sDialog.value = true;
};

onMounted(() => {
    mermaid.initialize({ startOnLoad: false, theme: cIsDarkMode.value ? 'dark' : 'default' });

    nextTick(() => {
        let divScripts = document.getElementById('app');
        let newScriptEchart = document.createElement('script');
        newScriptEchart.src = `/web/echarts/echarts.min.js`;

        if (divScripts) {
            divScripts.appendChild(newScriptEchart);
        }
    });

    history.pushState(null, '', location.href);
    window.onpopstate = function () {
        history.go(1);
    };
    window.addEventListener('keydown', async (aItem: KeyboardEvent) => {
        if (aItem.code === 'KeyJ' && (aItem.ctrlKey || aItem.metaKey)) {
            aItem.preventDefault();
            setConsoleStatus();
        }
        if (cBoardType.value === 'sql' || cBoardType.value === 'tql' || cBoardType.value === 'taz' || cBoardType.value === 'wrk') {
            if (aItem.code === 'KeyS' && (aItem.ctrlKey || aItem.metaKey)) {
                aItem.preventDefault();
                if (getWindowOs() && aItem.ctrlKey) {
                    aItem.preventDefault();
                    if (gBoard.value.path !== '' && cBoardType.value !== 'taz') {
                        const sResult: any = await postFileList(
                            cBoardType.value === 'wrk' ? { data: gBoard.value.sheet } : gBoard.value.code,
                            gBoard.value.path,
                            gBoard.value.board_name
                        );

                        if (sResult.success) {
                            if (cBoardType.value === 'sql' || cBoardType.value === 'tql') {
                                gBoard.value.savedCode = gBoard.value.code;
                            } else if (cBoardType.value === 'wrk') {
                                gBoard.value.savedCode = JSON.stringify(gBoard.value.sheet);
                            }
                        }
                    } else {
                        onClickPopupItem(PopupType.FILE_BROWSER, 'save');
                    }
                } else if (!getWindowOs() && aItem.metaKey) {
                    aItem.preventDefault();
                    if (gBoard.value.path !== '' && cBoardType.value !== 'taz') {
                        const sResult: any = await postFileList(
                            cBoardType.value === 'wrk' ? { data: gBoard.value.sheet } : gBoard.value.code,
                            gBoard.value.path,
                            gBoard.value.board_name
                        );
                        if (sResult.success) {
                            if (cBoardType.value === 'sql' || cBoardType.value === 'tql') {
                                gBoard.value.savedCode = gBoard.value.code;
                            } else if (cBoardType.value === 'wrk') {
                                gBoard.value.savedCode = JSON.stringify(gBoard.value.sheet);
                            }
                        }
                    } else {
                        onClickPopupItem(PopupType.FILE_BROWSER, 'save');
                    }
                }
            }
        }
    });
});
</script>
<style lang="scss">
@import './index.scss';
.resizable-content {
    position: fixed !important;
    background-color: aqua;
    bottom: 0 !important;
    top: unset !important;
}
.console {
    position: fixed;
    bottom: 0;
    width: 100%;
}
</style>
