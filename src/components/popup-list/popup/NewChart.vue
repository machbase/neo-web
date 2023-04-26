<template>
    <div class="newchartdiv">
        <div v-if="!cTableListSelect[0]">
            <div class="on-roll-up">* There is no tag table.</div>
        </div>
        <div v-else-if="!sSelectTableOnRollup" class="row">
            <div class="row">
                <div class="on-roll-up">* The table is slow because the roll-up table is not generated.</div>
            </div>
        </div>

        <div class="row">
            <div class="newchart-all">
                <div class="tagtitle floatleft">Table</div>
                <ComboboxSelect
                    @e-on-change="onChangeTable"
                    class="input"
                    :p-data="cTableListSelect"
                    :p-show-default-option="false"
                    :p-value="cTableListSelect[0] ? cTableListSelect[0].name : 'TAG'"
                    style="width: 100%"
                />
            </div>
        </div>
        <div class="row">
            <div class="col-sm-6 newchart-left">
                <div class="tagtitle floatleft">Tag</div>
                <div class="search-wrapper">
                    <input v-model="searchText" @keydown.enter="onSearch" class="form-control taginput input" style="width: 180px" type="text" />
                    <span @click="onReset" class="input clear-icon"><img alt="Clear icon" :src="i_b_close" /></span>
                    <v-btn @click="onSearch" class="button-effect-color" :height="30" variant="outlined">Search</v-btn>
                </div>
                <div class="countGroup">
                    <div>Total : {{ cTagsSearch.length }} / {{ cTags.length }}</div>
                    <div>Select : {{ selectCount }}</div>
                </div>
                <div class="taglistdiv taglistscroll">
                    <!-- v-if="" -->
                    <div v-if="tagsPaged[pageIndex] && tagsPaged[pageIndex][0] && tagsPaged[pageIndex].length === 0">NO TAG</div>
                    <div v-for="(aTag, aIndex) in tagsPaged[pageIndex]" :key="aIndex" @click="onSelectTag(aTag)" class="text" style="margin-bottom: 5px">{{ aTag }}</div>
                </div>
                <Pagination @e-on-change="onPaging" :total="Math.ceil(cTags.length / MAX_TAG_COUNT)" />
            </div>
            <div class="col-sm-6 newchart-right overflowhidden">
                <div class="wrapcharttype overflowhidden">
                    <ChartSelect @e-on-change="onSelectChart" />
                </div>
                <div class="selectedlistdiv taglistscroll">
                    <div v-for="(aTime, aIndex) in sSelectedTags" :key="aIndex" class="wrapperTagSelect" style="margin-bottom: 5px">
                        <span @click="onRemoveTag(aIndex)"> {{ aTime.tag_names }}</span>
                        <ComboboxSelect @e-on-change="(item) => onChangeCalcMode(item, aIndex)" :p-data="CALC_MODE" :p-show-default-option="false" :p-value="'avg'" />
                    </div>
                </div>
                <div class="popup__btn-group">
                    <v-btn @click="onSetting" class="button-effect-color" variant="outlined"> Ok </v-btn>
                    <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="NewChart">
import i_b_close from '@/assets/image/i_b_close.png';
import Pagination from '@/components/common/pagination/index.vue';
import TimeRange from '@/components/common/date-list/date-time-range.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartSelect from '@/components/common/chart-select/index.vue';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import _ from 'lodash';

import { useStore } from '@/store';
import { computed, defineEmits, reactive, ref, watch } from 'vue';
import { ChartType } from '@/enums/app';
import { CALC_MODE, MAX_TAG_COUNT } from './constant';
import { fetchTablesData, fetchOnRollupTable, fetchRangeData } from '@/api/repository/machiot';
import { ActionTypes } from '@/store/actions';
import { TagSet } from '@/interface/chart';
import { CalculationMode } from '@/interface/constants';
import { getPaginationPages, toTimeUtcChart } from '@/utils/utils';
const emit = defineEmits(['eClosePopup']);
const searchText = ref<string>('');
const isSearchClick = ref<boolean>(false);
const tableSelected = ref<string>('');
const chartType = ref<ChartType>(ChartType.Zone);
const selectCount = ref<number>(0);
const sSelectTableOnRollup = ref<boolean>(false);
const cTags = computed(() => store.state.gTagList);
const cTagsSearch = ref<any>([]);
const sSelectedTags = reactive<Partial<TagSet>[]>([]);
const store = useStore();
const cTableList = computed(() => store.state.gTableList);
const cTableListSelect = computed(() =>
    cTableList.value.map((aItem: string) => {
        return {
            id: aItem,
            name: aItem,
        };
    })
);
const pageIndex = ref<number>(0);
const tagsPaged = computed(() => getPaginationPages(cTagsSearch.value, MAX_TAG_COUNT));
const onChangeTable = (aValue: string) => {
    tableSelected.value = aValue;
};
watch(
    () => cTags.value,
    () => {
        cTagsSearch.value = cTags.value;
    }
);
watch(
    () => searchText.value,
    () => {
        if (searchText.value == '') {
            cTagsSearch.value = cTags.value;
        }
    }
);
watch(
    () => tableSelected.value,
    async () => {
        if (cTableListSelect.value[0]) {
            const sRes = await fetchOnRollupTable(tableSelected.value);
            if (sRes.data.rows.length === 0) {
                sSelectTableOnRollup.value = false;
            } else {
                sSelectTableOnRollup.value = true;
            }
            store.dispatch(ActionTypes.fetchTagList, tableSelected.value);
        }
    }
);
const onSearch = () => {
    if (searchText.value != '') {
        isSearchClick.value = true;
        const searchTextTrim = searchText.value.trim();
        let sRegExp = new RegExp(searchTextTrim);
        if (searchTextTrim.charAt(0) == '/' && searchTextTrim.indexOf('/', 1) != -1) {
            // regexp
            var sSplit = searchTextTrim.split('/');
            sRegExp = sSplit.length > 2 ? new RegExp(sSplit[1], sSplit[2]) : new RegExp(sSplit[1]);
        }
        cTagsSearch.value = cTags.value.filter(function (aVal: any) {
            return aVal.search(sRegExp) != -1;
        });
    }
};
const onReset = () => {
    if (searchText.value != '') searchText.value = '';
};
const onSelectChart = (data: ChartType) => {
    chartType.value = data;
};
const onSelectTag = (data: string) => {
    selectCount.value++;

    sSelectedTags.push({ tag_names: data, table: tableSelected.value, calculation_mode: 'avg', alias: '', weight: 1.0, onRollup: sSelectTableOnRollup.value });
};
const onRemoveTag = (index: number) => {
    selectCount.value--;
    sSelectedTags.splice(index, 1);
};
const onChangeCalcMode = (data: CalculationMode, index: number) => {
    sSelectedTags[index].calculation_mode = data;
};
const onPaging = (index: number) => {
    pageIndex.value = index - 1;
};
const onSetting = () => {
    if (sSelectedTags.length <= 0) {
        alert('Select tags for the chart.');
        return;
    }
    if (sSelectedTags.length > MAX_TAG_COUNT) {
        alert('The maximum number of tags in a chart is ' + MAX_TAG_COUNT.toString() + '.');
        return;
    }

    const newData = {
        chartType: chartType.value,
        tagSet: sSelectedTags,
    };
    store.dispatch(ActionTypes.fetchNewChartBoard, newData).then(() => onClosePopup());
};

const onClosePopup = () => {
    emit('eClosePopup');
};
store.dispatch(ActionTypes.fetchTableList);
</script>

<style lang="scss" scoped>
@import 'index.scss';
.on-roll-up {
    color: #ec7676;
}
</style>
