<template>
    <div :class="{ dark: cIsDardMode }">
        <button
            @click="
                () => {
                    store.commit(MutationTypes.activeDarkMode, !cIsDardMode);
                }
            "
        >
            Change mode
        </button>
        <div class="app">
            <router-view name="Header" />
            <router-view />
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App">
import { useStore } from './store';
import { computed } from 'vue';
import { MutationTypes } from '@/store/mutations';
const store = useStore();
const cIsDardMode = computed(() => store.state.gDarkMode);
</script>
<style lang="scss">
@import './index.scss';
</style>
