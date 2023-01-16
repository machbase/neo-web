<template>
    <div :class="cIsDarkMode ? 'dark' : 'light'">
        <div class="app">
            <router-view name="Header" />
            <router-view class="body" />
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App">
import { useStore } from '@/store';
import { computed } from 'vue';
import { ActionTypes } from './store/actions';

const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
store.dispatch(ActionTypes.fetchPreference);
</script>
<style lang="scss">
@import './index.scss';
</style>
