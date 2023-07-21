<template>
    <v-sheet v-if="!sLoading" class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <div ref="term_view" id="term_view"></div>
        </v-sheet>
    </v-sheet>
</template>
<script setup lang="ts">
import Vue, { withDefaults, ref, computed, defineProps, onMounted, onUnmounted, watch } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { AttachAddon } from 'xterm-addon-attach';
import { postTerminalSize } from '../../api/repository/machiot';
import { store } from '../../store';
import { getLogin } from '../../api/repository/login';
import { WebglAddon } from 'xterm-addon-webgl';
import Theme from '@/assets/ts/xtermTheme';

const cIsDarkMode = computed(() => store.getters.getDarkMode);

interface ChartSelectProps {
    pId: string;
}
const props = withDefaults(defineProps<ChartSelectProps>(), {
    pId: '',
});
// ref ele
let term_view: Element | any = ref(null);
// web socket
let sWebSoc: any = null;
// fitter
let sFitter: any = null;
// term
let sTerm: any = null;
// temr id
let sTermId: any = null;
// token
let sToken = localStorage.getItem('token');
// close modal ctr
const sIsReSize = ref<boolean>(false);

let selectedTab = '';
const gSelectedTab = computed(() => store.state.gSelectedTab);
const gLastSelectedTab = computed(() => store.state.gLastSelectedTab);
const gTabList = computed(() => store.state.gTabList);

const sBoardId = ref();
const sLoading = ref(true);

const makeTermId = () => {
    return new Date().getTime();
};
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});
// resize observer
const sResizeObserver = new ResizeObserver(() => {
    if (selectedTab === gSelectedTab.value) {
        try {
            sFitter && sFitter.fit();
        } catch (err) {
            console.log(err);
        }
    }
});

let sCtrDebounce = undefined as undefined | NodeJS.Timeout;

const onSendReSizeInfo = async (aSize: { cols: number; rows: number }) => {
    await postTerminalSize(sTermId, aSize);
};

const init = async () => {
    sBoardId.value = props.pId;
    if (gSelectedTab.value !== props.pId) return;

    if (!sLoading.value) return;

    sLoading.value = false;
    await getLogin();

    selectedTab = gSelectedTab.value;
    const sStorageData = localStorage.getItem('gPreference');

    let sTheme: any = !cIsDarkMode.value ? Theme['white'] : Theme['dark'];
    if (gBoard.value.terminal.theme && gBoard.value.terminal.theme !== 'default') {
        const sData: 'gray' | 'ollie' | 'warmNeon' | 'galaxy' | 'white' | 'dark' = gBoard.value.terminal.theme;
        sTheme = Theme[sData];
    }

    sTerm = new Terminal({
        theme: sTheme,
        fontFamily: '"D2Coding", "Monaco", "Lucida Console", "Courier New","D2Coding", sans-serif, monospace',
        allowProposedApi: true,
        fontSize: sStorageData && JSON.parse(sStorageData).font ? Number(JSON.parse(sStorageData).font) : 18,
    });
    sTermId = makeTermId();

    if (window.location.protocol.indexOf('https') === -1) {
        sWebSoc = new WebSocket(
            `ws://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${
                gBoard.value.terminal.id ? '&shell=' + gBoard.value.terminal.id : ''
            }`
        );
    } else {
        sWebSoc = new WebSocket(
            `wss://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}${
                gBoard.value.terminal.id ? '&shell=' + gBoard.value.terminal.id : ''
            }`
        );
    }

    sFitter = new FitAddon();
    sTerm.loadAddon(new WebglAddon());
    sTerm.loadAddon(new WebLinksAddon());
    sTerm.loadAddon(new AttachAddon(sWebSoc, { bidirectional: true }));
    sTerm.loadAddon(sFitter);

    sTerm.attachCustomKeyEventHandler(function (e) {
        if (e.ctrlKey && e.shiftKey && e.keyCode == 67) {
            e.preventDefault();

            document.execCommand('copy');
            return false;
        }
    });
    sTerm.open(term_view.value);
    sTerm.focus();

    sTerm.onResize((aSize: { cols: number; rows: number }) => {
        onSendReSizeInfo(aSize);
    });

    setTimeout(() => {
        try {
            sFitter && sFitter.fit();
            sResizeObserver.observe(term_view.value);
        } catch (err) {
            console.log(err);
        }
    }, 400);
};

watch(
    () => gSelectedTab.value,
    () => {
        if (gSelectedTab.value === sBoardId.value) init();
    }
);
onMounted(async () => {
    init();
});

onUnmounted(() => {
    sWebSoc.close();
});
</script>
<style lang="scss" scoped>
@import 'index.scss';

.add-tab {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}

.add-tab-form {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    padding: 8px 0;
}
</style>
<style>
#term_view {
    width: 100%;
    height: 100%;
}
.xterm {
    height: 100%;
}

.xterm {
    padding-left: 8px;
    position: relative;
    user-select: none;
    -ms-user-select: none;
    -webkit-user-select: none;
    /* overflow-y: scroll; */
}

.xterm.focus,
.xterm:focus {
    outline: none;
}

.xterm .xterm-helpers {
    position: absolute;
    top: 0;
    /**
   * The z-index of the helpers must be higher than the canvases in order for
   * IMEs to appear on top.
   */
    z-index: 5;
}

.xterm .xterm-helper-textarea {
    padding: 0;
    border: 0;
    margin: 0;
    /* Move textarea out of the screen to the far left, so that the cursor is not visible */
    position: absolute;
    opacity: 0;
    left: -9999em;
    top: 0;
    width: 0;
    height: 0;
    z-index: -5;
    /** Prevent wrapping so the IME appears against the textarea at the correct position */
    white-space: nowrap;
    overflow: hidden;
    resize: none;
}

.xterm .composition-view {
    /* TODO: Composition position got messed up somewhere */
    background: #000;
    color: #fff;
    display: none;
    position: absolute;
    white-space: nowrap;
    z-index: 1;
}

.xterm .composition-view.active {
    display: block;
}

.xterm .xterm-viewport {
    /* On OS X this is required in order for the scroll bar to appear fully opaque */
    background-color: #000;
    overflow-y: scroll;
    cursor: default;
    position: absolute;
    right: 0;
    left: 0;
    top: 0;
    bottom: 0;
}
/* .xterm::selection {
    background: #000 !important;
} */
.xterm .xterm-viewport::-webkit-scrollbar {
    width: 10px;
    height: 5px;
}

.xterm .xterm-viewport::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    background: transparent;
}

.xterm .xterm-viewport::-webkit-scrollbar-thumb {
    width: 5px;
    height: 5px;
    background-color: rgb(101, 111, 121);
}

.xterm .xterm-screen {
    position: relative;
}

.xterm .xterm-screen canvas {
    position: absolute;
    left: 0;
    top: 0;
}

.xterm .xterm-scroll-area {
    visibility: hidden;
}

.xterm-char-measure-element {
    display: inline-block;
    visibility: hidden;
    position: absolute;
    top: 0;
    left: -9999em;
    line-height: normal;
}

.xterm {
    cursor: text;
}

.xterm.enable-mouse-events {
    /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
    cursor: default;
}

.xterm.xterm-cursor-pointer,
.xterm .xterm-cursor-pointer {
    cursor: pointer;
}

.xterm.column-select.focus {
    /* Column selection mode */
    cursor: crosshair;
}

.xterm .xterm-accessibility,
.xterm .xterm-message {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 10;
    color: transparent;
}

.xterm .live-region {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

.xterm-dim {
    /* opacity: 0.5; */
}

.xterm-underline {
    text-decoration: underline;
}

.xterm-strikethrough {
    text-decoration: line-through;
}
</style>
