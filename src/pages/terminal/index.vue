<template>
    <v-sheet class="add-tab" color="transparent">
        <v-sheet class="add-tab-form" color="transparent">
            <div ref="term_view" id="term_view"></div>
        </v-sheet>
    </v-sheet>
</template>
<script setup lang="ts">
import Vue, { ref, computed, defineEmits, onMounted, nextTick, onUnmounted, onUpdated, watch } from 'vue';
import { Terminal } from 'xterm';
/**
 * xterm-addon-fit
 * An addon for xterm.js that enables fitting the terminal's dimensions to a containing element.
 * ref: https://www.npmjs.com/package/xterm-addon-fit
 */
import { FitAddon } from 'xterm-addon-fit';
/**
 * xterm-addon-web-links
 * An addon for xterm.js that enables web links.
 * ref: https://www.npmjs.com/package/xterm-addon-web-links
 * h-link 옵션을 위해 사용
 */
import { WebLinksAddon } from 'xterm-addon-web-links';
/**
 * xterm-addon-attach
 * An addon for xterm.js that enables attaching to a web socket.
 * ref: https://www.npmjs.com/package/xterm-addon-attach
 * W-soc 양방향 옵션을 위해 사용
 */
import { AttachAddon } from 'xterm-addon-attach';
import { postTerminalSize } from '../../api/repository/machiot';

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

// 1 ~ 1000 random
const makeTermId = () => {
    return Math.floor(Math.random() * 1000) + 1;
};
// resize observer
const sResizeObserver = new ResizeObserver(() => {
    sFitter.fit();
});

let sCtrDebounce = undefined as undefined | NodeJS.Timeout;

const onSendReSizeInfo = (aSize: { cols: number; rows: number }) => {
    if (sIsReSize.value) {
        clearTimeout(sCtrDebounce);
    }

    sIsReSize.value = true;
    sCtrDebounce = setTimeout(async () => {
        await postTerminalSize(sTermId, aSize);

        sIsReSize.value = false;

        clearTimeout(sCtrDebounce);
    }, 400); // 0.4s
};
// mounted
onMounted(() => {
    // init termasdf
    sTerm = new Terminal({
        fontFamily: '"Lucida Console", "Courier New", monospace',
        allowProposedApi: true,
        fontSize: 13,
        rows: 69,
        cols: 242,
    });

    sTermId = makeTermId();

    sWebSoc = new WebSocket(`ws://${window.location.host}/web/api/term/${sTermId}/data?token=${localStorage.getItem('accessToken')}`);

    // set addons
    sFitter = new FitAddon();
    sTerm.loadAddon(new WebLinksAddon());
    sTerm.loadAddon(new AttachAddon(sWebSoc, { bidirectional: true }));
    sTerm.loadAddon(sFitter);
    sTerm.open(term_view.value);
    sTerm.focus();

    // onSendReSizeInfo(sTerm);
    sTerm.onResize((aSize: { cols: number; rows: number }) => {
        onSendReSizeInfo(sTerm);
    });

    const sTmpTime = setTimeout(() => {
        sFitter.fit();
        clearTimeout(sTmpTime);
    }, 300);

    // start observing
    sResizeObserver.observe(term_view.value);
});

onUnmounted(() => {
    // ref ele
    term_view = null;
    // web socket
    sWebSoc = null;
    // fitter
    sFitter = null;
    // term
    sTerm = null;
    // temr id
    sTermId = null;
    // token
    sToken = null;
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
    // width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    padding: 8px;
}
#term_view {
    width: 100%;
    height: 100%;
}
.xterm {
    height: 100%;
}

.xterm {
    position: relative;
    user-select: none;
    -ms-user-select: none;
    -webkit-user-select: none;
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
    opacity: 0.5;
}

.xterm-underline {
    text-decoration: underline;
}

.xterm-strikethrough {
    text-decoration: line-through;
}
</style>
