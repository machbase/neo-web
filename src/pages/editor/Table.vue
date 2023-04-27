<template>
    <v-sheet height="100%" class="scroll-wrapper" @scroll="handleScroll">
        <div ref="scrollRef">
            <table>
                <thead class="header-fix">
                    <tr>
                        <th>
                            <span>index</span>
                        </th>
                        <th v-for="item in headers">
                            <span>{{ item }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(content, index) in items" :class="Number(index) % 2 === 0 ? '' : 'odd'">
                        <td>
                            <span>{{ index + 1 }}</span>
                        </td>
                        <td v-for="value in content">
                            <span>{{ value }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </v-sheet>
</template>

<script setup lang="ts" name="table">
import { defineProps, ref, defineEmits } from 'vue';

const props = defineProps({
    items: {
        type: Object,
        default: [],
    },
    headers: {
        type: Object,
        default: [],
    },
});

const handleZeroScroll = () => {
    window.scrollTo(0, 0);
};

const emits = defineEmits(['UpdateItems']);
const scrollRef = ref();

const handleScroll = (e: any) => {
    let element = scrollRef.value;
    if (element && element.getBoundingClientRect().bottom < window.innerHeight + 1) {
        emits('UpdateItems');
    }
};
</script>

<style scoped>
.scroll-wrapper {
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
    width: auto;
    table-layout: auto;
}
table,
th,
td {
    border: 1px solid #bfbfbf;
    border-collapse: collapse;
}
th {
    font-weight: bold;
    font-size: 13px;
    padding: 0 10px;

    min-width: 100px;
    height: 35px;
}
td {
    font-size: 12px;
    font-weight: 300;

    padding: 0 10px;
    height: 35px;
}
span {
    display: flex;
    justify-content: start;
}
.header-fix {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: black;
    color: white;
    border: 1px solid red;
}
.odd {
    background-color: rgb(245, 245, 245);
}
</style>
