<template>
    <v-pagination v-model="sIndex" :active-color="'#2ec0df'" class="pagination-cp" :color="'#9ca2ab'" :length="props.total" :size="'x-small'"></v-pagination>
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
