<template>
    <v-sheet ref="scrollRef" @scroll="handleScroll" class="scroll-wrapper" color="transparent" height="calc(100% - 40px)">
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
                        <span>INDEX</span>
                    </th>
                    <th v-for="(item, aIdx) in headers" :key="aIdx">
                        <span>{{ item }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <!-- :class="cIsDarkMode ? 'dark' : 'light'"  -->
                <tr v-for="(content, index) in items" :key="index" :class="[cIsDarkMode ? (Number(index) % 2 === 0 ? '' : 'dark-odd') : Number(index) % 2 === 0 ? '' : 'odd']">
                    <td>
                        <span>{{ index + 1 }}</span>
                    </td>
                    <td v-for="(value, aIdx) in content" :key="aIdx">
                        <span>{{ value }}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </v-sheet>
</template>

<script setup lang="ts" name="table">
import { defineProps, ref, defineEmits, computed } from 'vue';
import { store } from '../../store';
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const props = defineProps({
    items: {
        type: Object,
        default: [] as any[],
    },
    headers: {
        type: Object,
        default: [] as any[],
    },
});

const handleZeroScroll = () => {
    window.scrollTo(0, 0);
};

const emits = defineEmits(['UpdateItems']);
const scrollRef = ref();

const handleScroll = (e: any) => {
    const { scrollHeight, scrollTop, clientHeight } = e.target;
    const isAtTheBottom = scrollHeight === scrollTop + clientHeight;
    if (isAtTheBottom) {
        emits('UpdateItems');
    }
};
</script>

<style scoped>
.scroll-wrapper {
    /* padding: 0 16px; */
    position: relative;
    overflow: auto;
    height: 100%;
    /* border-bottom: 3px solid #1f2e3a; */
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
table,
th,
td {
    /* border: 1px solid #bfbfbf; */
    vertical-align: center !important;
    border-collapse: collapse;
}
th {
    font-weight: bold;
    font-size: 13px;
    padding: 0 16px;
    border-bottom: 1px solid white;
    min-width: 100px;
    height: 35px;
    text-align: start;
    vertical-align: center !important;

    /* justify-content: start; */
}
td {
    font-size: 12px;
    font-weight: 300;
    vertical-align: center !important;
    padding: 0 16px;
    height: 35px;
}
span {
    height: 100%;
    /* /* align-items: center; */
    /* display: flex; */

    justify-content: start;
}
.header-fix {
    position: sticky;
    top: 0;
    z-index: 10;

    /* border: 1px solid white; */
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
