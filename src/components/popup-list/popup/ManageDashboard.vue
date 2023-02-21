<template>
    <div class="manage-dashboard">
        <v-table class="manage-dashboard__table">
            <thead>
                <tr>
                    <th v-for="aTitle in DATA_TITLE" :key="aTitle" class="text-title">{{ aTitle }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(aBoard, aIndex) in sBoardList" :key="aBoard.board_id">
                    <td class="text-row">{{ aIndex }}</td>
                    <td class="text-row">{{ aBoard.board_id }}</td>
                    <td class="text-row">
                        <div v-if="!aBoard.edit">{{ aBoard.board_name }}</div>
                        <div v-else class="text-row-edit">
                            <input v-model="aBoard.board_name" type="text" class="input" />
                            <v-btn variant="outlined" class="button-effect-color" @click="onEditBoard(aBoard)"> Ok </v-btn>
                            <v-btn variant="outlined" class="button-effect" @click="sBoardList[aIndex].edit = false"> Cancel </v-btn>
                        </div>
                    </td>
                    <td class="text-row imgs">
                        <router-link :to="{ name: RouteNames.VIEW, params: { id: aBoard.board_id }, query: {} }" target="_blank">
                            <img :src="i_b_newwin" />
                        </router-link>
                        <img :src="i_b_edit" @click="sBoardList[aIndex].edit = true" />
                        <img :src="i_b_del" @click="onDeleteBoard(aBoard.board_id, aBoard.board_name)" />
                    </td>
                </tr>
            </tbody>
        </v-table>
        <Pagination :total="cTotal" />
    </div>
</template>

<script setup lang="ts" name="ManageDashboard">
import { putBoard, deleteBoard } from '@/api/repository/api';
import i_b_del from '@/assets/image/i_b_del.png';
import i_b_edit from '@/assets/image/i_b_edit.png';
import i_b_newwin from '@/assets/image/i_b_newwin.png';
import Pagination from '@/components/common/pagination/index.vue';
import { RouteNames } from '@/enums/routes';
import { ResBoardList } from '@/interface/tagView';
import { useStore } from '@/store';
import { MutationTypes } from '@/store/mutations';
import { computed, defineEmits, ref, watch } from 'vue';
import { DATA_TITLE } from './constant';
import { LENGTH_LIST } from '@/utils/constants';
export interface BoardInfo {
    board_id: string;
    board_name: string;
    last_edit: string;
    edit: boolean;
}

const store = useStore();
const emit = defineEmits(['eClosePopup']);
const cBoardList = computed((): ResBoardList[] => store.state.gBoardList);
const sBoardList = ref<BoardInfo[]>(
    cBoardList.value.map((aBoard) => {
        return {
            ...aBoard,
            edit: false,
        };
    })
);
const cTotal = computed(() => Math.ceil(sBoardList.value.length / LENGTH_LIST));

const onEditBoard = async (aBoard: BoardInfo) => {
    const sRes = await putBoard({ sId: aBoard.board_id, board_name: aBoard.board_name });
    await store.commit(MutationTypes.setBoardList, sRes);
    sBoardList.value = sBoardList.value.map((aBoard) => {
        return {
            ...aBoard,
            edit: false,
        };
    });
};
const onDeleteBoard = async (sId: string, sName: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?\n(' + sId + ' - ' + sName + ')')) {
        return;
    }
    const sRes = (await deleteBoard(sId)) as any;
    await store.commit(MutationTypes.setBoardList, sRes.list);
    sBoardList.value = cBoardList.value.map((aBoard) => {
        return {
            ...aBoard,
            edit: false,
        };
    });
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
