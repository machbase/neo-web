<template>
    <v-pagination v-model="sIndex" class="pagination-cp" :size="'x-small'" :active-color="'#2ec0df'" :color="'#9ca2ab'" :length="props.total"></v-pagination>
</template>

<script setup lang="ts" name="Pagination">
import { defineProps, defineEmits, withDefaults, ref, watch } from 'vue';
const sIndex = ref<number>(1);
interface PagingProps {
    total: number;
}
const props = withDefaults(defineProps<PagingProps>(), {
    total: 1,
});
const emit = defineEmits(['eOnChange']);

watch(
    () => sIndex.value,
    () => {
        emit('eOnChange', sIndex.value);
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
