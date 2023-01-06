<template>
    <div class="dark">
        <div class="app">
            <router-view name="Header" />
            <router-view />
            <router-view name="Footer" />
        </div>
    </div>
</template>

<script setup lang="ts" name="App"></script>
<style lang="scss">
@import './index.scss';
</style>
