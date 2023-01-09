<template>
    <div class="footer">Tag Analyzer {{ version }}</div>
</template>

<script setup lang="ts" name="Footer">
const version = import.meta.env.VITE_TAG_ANALYZER_VERSION;
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
