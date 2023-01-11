<template>
    <v-pagination v-model="index" :class="cIsDarkMode ? 'dark' : 'light'" :size="'x-small'" :active-color="'#2ec0df'" :color="'#9ca2ab'" :length="props.total"></v-pagination>
</template>

<script setup lang="ts" name="Pagination">
import { useStore } from '@/store';
import { computed, defineProps, defineEmits, withDefaults, ref, watch } from 'vue';
const index = ref<number>(1);
interface PagingProps {
    total: number;
}
const props = withDefaults(defineProps<PagingProps>(), {
    total: 1,
});
const store = useStore();
const cIsDarkMode = computed(() => store.state.gDarkMode);
const emit = defineEmits(['eOnChange']);

watch(
    () => index.value,
    () => {
        emit('eOnChange', index.value);
    }
);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
