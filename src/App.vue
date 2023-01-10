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
            <router-view />
            <ButtonCreate :is-add-chart="true" :on-click="test" />
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App">
import ButtonCreate from "./components/common/button-create/index.vue";
import { useStore } from './store';
import { computed } from 'vue';
import { MutationTypes } from '@/store/mutations';
const test = () => alert('test');
const store = useStore();
const cIsDarkMode = computed(() => store.state.gDarkMode);
</script>
<style lang="scss">
@import './index.scss';
</style>
