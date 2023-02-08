<template>
    <div class=""><ChartDashboard v-for="(aPanel, aIndex) in sData?.panels" :key="aIndex" /></div>
</template>
<script setup lang="ts" name="ShareView">
import { ref, watch, computed } from 'vue';
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { BoardInfo } from '@/interface/chart';
import { getBoard } from '@/api/repository/api';
import { useRoute } from 'vue-router';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';

const route = useRoute();
const sData = ref<BoardInfo>();
const store = useStore();
const setBoard = async (sId: string) => {
    const sRes: BoardInfo = await getBoard(sId);
    sData.value = sRes;
};
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);

watch(
    () => route.query.id,
    () => {
        if (route.query.id) {
            setBoard(route.query.id as string);
        }
    }
);
watch(
    () => cBoardList.value,
    () => {
        if (!route.query.id && cBoardList.value.length > 0) {
            setBoard(cBoardList.value[0]?.board_id as string);
        }
        if (route.query.id) {
            setBoard(route.query.id as string);
        }
    }
);
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
