<template>
    <div :class="cIsDarkMode ? 'dark' : 'light'">
        <div class="app">
            <Header />
            <!-- <router-view  /> -->

            <router-view class="body" />
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App">
import { useStore } from '@/store';
import Header from '@/components/header/index.vue';

import { computed, onMounted, nextTick } from 'vue';
import { ActionTypes } from './store/actions';
import { useRoute } from 'vue-router';
import { MutationTypes } from './store/mutations';

const route = useRoute();
const store = useStore();
const cIsDarkMode = computed(() => store.getters.getDarkMode);
</script>
<style lang="scss">
@import './index.scss';
</style>
