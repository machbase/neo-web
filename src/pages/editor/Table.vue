<template>
    <v-sheet ref="scrollRef" @scroll="handleScroll" class="scroll-wrapper" color="transparent" height="calc(100% - 40px)">
        <div v-if="onContext" @contextmenu.prevent @mousedown="onContext = false" class="cover"></div>
        <Transition>
            <div v-show="onContext" ref="contextMenu" @contextmenu.prevent class="contextOption">
                <div class="context-option-form">
                    <button @click="onClickPopupItem('SHOW CONTENT')" class="show"><v-icon size="14px">mdi-monitor</v-icon> show full content</button>
                    <button @click="copyContent" class="copy"><v-icon size="14px">mdi-content-copy</v-icon> copy</button>
                </div>
            </div>
        </Transition>
        <table
            style="
                 {
                    position: `absolute`;
                }
            "
            :style="
                cIsDarkMode
                    ? {
                          color: `#e7e8ea`,
                      }
                    : {}
            "
        >
            <thead class="header-fix" :style="cIsDarkMode ? { backgroundColor: 'black', color: 'white' } : { backgroundColor: 'rgb(245, 245, 245)', color: 'black' }">
                <tr>
                    <th>
                        <span>ROWNUM</span>
                    </th>
                    <th v-for="(item, aIdx) in headers" :key="aIdx">
                        <span
                            >{{ item }}
                            {{ pType[aIdx] === 'datetime' ? `(${pTimezone})` : '' }}
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(content, index) in items" :key="index" :class="[cIsDarkMode ? (Number(index) % 2 === 0 ? '' : 'dark-odd') : Number(index) % 2 === 0 ? '' : 'odd']">
                    <td>
                        <span>{{ index + 1 }}</span>
                    </td>
                    <td v-for="(value, aIdx) in content" :key="aIdx" @contextmenu.prevent @mousedown.right.stop="openContextMenu($event, value)">
                        <span>{{ value }}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </v-sheet>
    <PopupWrap @eClosePopup="onClosePopup" :p-info="sData" :p-show="sDialog" :p-type="sPopupType" :p-width="cWidthPopup" />
</template>

<script setup lang="ts" name="table">
import { defineProps, ref, defineEmits, computed } from 'vue';
import { store } from '../../store';
import { copyText } from 'vue3-clipboard';
import { PopupType } from '../../enums/app';
import { LOGOUT, MANAGE_DASHBOARD, NEW_DASHBOARD, PREFERENCE, REQUEST_ROLLUP, SET, TIME_RANGE_NOT_SET, WIDTH_DEFAULT } from '@/components/header/constant';
import PopupWrap from '@/components/popup-list/index.vue';

const onContext = ref(false);
const contextMenu = ref();

const cIsDarkMode = computed(() => store.getters.getDarkMode);
const sPopupType = ref<PopupType>(PopupType.NEW_CHART);

const props = defineProps({
    items: {
        type: Object,
        default: [] as any[],
    },
    headers: {
        type: Object,
        default: [] as any[],
    },
    pType: {
        type: Array,
    },
    pTimezone: {
        type: String,
    },
});
const handleZeroScroll = () => {
    window.scrollTo(0, 0);
};

const sData = ref('');

const emits = defineEmits(['UpdateItems']);
const scrollRef = ref();
const sDialog = ref<boolean>(false);

const onClickPopupItem = (aPopupName: PopupType) => {
    sPopupType.value = aPopupName;
    sDialog.value = true;
    onContext.value = false;
};
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
        default:
            return WIDTH_DEFAULT.DEFAULT;
    }
});
const onClosePopup = () => {
    sDialog.value = false;
};
const handleScroll = (e: any) => {
    const { scrollHeight, scrollTop, clientHeight } = e.target;
    const isAtTheBottom = scrollTop + clientHeight - 5 < scrollHeight && scrollHeight < scrollTop + clientHeight + 5;
    if (isAtTheBottom) {
        emits('UpdateItems');
    }
};
const copyContent = () => {
    copyText(sData.value, undefined, (error: string, event: string) => {
        if (error) {
            alert('Can not copy');
            console.log(error);
        } else {
            // alert('Copied');
            console.log(event);
            onContext.value = false;
        }
    });
};

const openContextMenu = (e: any, aValue: string) => {
    onContext.value = !onContext.value;
    contextMenu.value.style.top = e.y + 'px';
    contextMenu.value.style.left = e.x + 'px';
    sData.value = String(aValue);
};
</script>

<style lang="scss" scoped>
@import '@/assets/scss/theme.scss';
.contextOption {
    position: fixed;
    z-index: 1001;
    background: white;
    border-radius: 8px;
    padding: 10px 0;
    width: 220px;
    -webkit-box-shadow: 0px 5px 10px 1px rgba(0, 0, 0, 0.3);
    font-size: 14px;
    .show {
        i {
            margin-right: 4px;
        }
        width: 100%;
        padding: 0 15px;
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
</style>
<style scoped>
.cover {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
}
.scroll-wrapper {
    position: relative;
    overflow: auto;
    height: 100%;
    background-color: white;
}
.scroll-wrapper::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}
.scroll-wrapper::-webkit-scrollbar-thumb {
    background-color: rgb(101, 111, 121);
}
table {
    border-collapse: separate !important;
    border-spacing: 0;
    width: calc(100%);
    table-layout: auto;
}
.v-enter-active,
.v-leave-active {
    transition: opacity 0.2s ease;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
table,
th,
td {
    vertical-align: center !important;
    border-collapse: collapse;
}
th {
    max-width: 300px;
    font-weight: bold;
    font-size: 13px;
    padding: 0 16px;
    border-bottom: 1px solid white;
    min-width: 100px;
    height: 35px;
    text-align: start;
    vertical-align: center !important;
    text-overflow: ellipsis;
    white-space: nowrap;
}
td {
    /* cursor: pointer; */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 20vw;
    font-size: 12px;
    font-weight: 300;
    vertical-align: center !important;
    padding: 0 16px;
    height: 35px;
}
span {
    height: 100%;
    justify-content: start;
}
.header-fix {
    position: sticky;
    top: 0;
    z-index: 10;
}
.odd {
    background-color: rgb(245, 245, 245);
}
.dark-odd {
    background-color: rgb(43, 43, 43);
}
.odd-transparent {
    background: transparent;
}
</style>
