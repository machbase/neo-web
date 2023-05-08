<template>
    <div class="footer">Tag Analyzer {{ version }}</div>
</template>

<script setup lang="ts" name="Footer">
import { useRoute } from 'vue-router';

const version = import.meta.env.VITE_TAG_ANALYZER_VERSION;
const route = useRoute();
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
