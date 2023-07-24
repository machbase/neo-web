<template>
    <div class="tag-view">
        <ChartDashboard ref="sPanels" :chart-data-single="sDataChart" />
    </div>
</template>
<script setup lang="ts" name="ChartView">
import ChartDashboard from '@/components/common/chart-dashboard/index.vue';
import { BoardInfo, PanelInfo } from '@/interface/chart';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const store = useStore();
const sDialog = ref<boolean>(false);
const sData = ref<BoardInfo>();
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const cBoard = computed((): BoardInfo => store.state.gBoard);
const sPanels = ref(null);
const sDataChart = ref<PanelInfo[]>([]);
const CPanels = computed((): PanelInfo[][] => store.state.gBoard.panels);

function onOpenPopup() {
    sDialog.value = true;
}
const onClosePopup = () => {
    sDialog.value = false;
};
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
