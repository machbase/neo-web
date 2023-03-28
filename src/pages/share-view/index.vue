<template>
    <ChartDashboard ref="sPanels" />
</template>
<script setup lang="ts" name="ShareView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { RouteNames } from '@/enums/routes';
import { PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { MutationTypes } from '@/store/mutations';
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const store = useStore();

const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);
const sPanels = ref(null);
const router = useRouter();
const onRefreshData = (aIsRangeTimeChange: boolean) => {
    (sPanels.value as any)?.refreshData(aIsRangeTimeChange);
};
onRefreshData(true);

onMounted(async () => {
    await store.dispatch(ActionTypes.fetchTableList);
    await store.dispatch(ActionTypes.fetchTagList, store.state.gTableList[0]);
    await store.dispatch(ActionTypes.fetchRangeData, { table: store.state.gTableList[0], tagName: store.state.gTagList[0].name });
    const cookieValue = await document.cookie.replace(/(?:(?:^|.*;\s*)data\s*\=\s*([^;]*).*$)|^.*$/, '$1');
    if (!cookieValue) {
        router.push({
            name: RouteNames.TAG_VIEW,
        });
        return;
    }
    await store.commit(MutationTypes.setBoardByFileUpload, JSON.parse(cookieValue));
    // sDataChart.value = await JSON.parse(cookieValue).panels[route.params.id as string];
});
// watch(
//     () => route.params.id,
//     () => {
//         if (route.params.id) {
//             setBoard(route.params.id as string);
//         }
//     },
//     { immediate: true }
// );
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
