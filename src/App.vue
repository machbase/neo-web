<template>
    <div :class="cIsDarkMode ? 'dark' : 'light'">
        <!-- <button
            @click="
                () => {
                    store.commit(MutationTypes.activeDarkMode, !cIsDarkMode);
                }
            "
        >
            Change mode
        </button> -->
        <div class="app">
            <router-view name="Header" />
            <!-- <router-view /> -->
            <ChartSelect :is-row="true" @eOnChange="handle"/>
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App">
import ChartSelect from "./components/common/chart-select/index.vue";
import { useStore } from './store';
import { computed } from 'vue';
import { MutationTypes } from '@/store/mutations';
import { ChartType } from "./enums/app";
const handle = (data: ChartType) => console.log(data,'data');
const store = useStore();
const cIsDarkMode = computed(() => store.state.gDarkMode);
</script>
<style lang="scss">
@import './index.scss';
</style>
