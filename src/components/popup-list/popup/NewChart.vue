<template>
    <div class="newchartdiv">
        <div class="row">
            <div class="newchart-all">
                <div class="tagtitle floatleft">Table</div>
                <ComboboxSelect class="input" :p-show-default-option="false" :p-data="cTableListSelect" :p-value="'TAG'" style="width: 100%" />
            </div>
        </div>
        <div class="row">
            <div class="col-sm-6 newchart-left">
                <div class="tagtitle floatleft">Tag</div>
                <div class="search-wrapper">
                    <input v-model="searchText" type="text" class="form-control taginput input" style="width: 180px" />
                    <span @click="onReset" class="input">X</span>
                    <v-btn class="button-effect-color" variant="outlined" :height="30" @click="onSearch">Search</v-btn>
                </div>
                <div class="countGroup">
                    <div class="wrapsearchcount floatleft">
                        <p class="searchcount">Total : {{ cTagsSearch.length }} / {{ cTags.length }}</p>
                    </div>
                    <div class="selectCountBox floatright">
                        <p class="selCountText">
                            Select : <span>{{ selectCount }}</span>
                        </p>
                    </div>
                </div>
                <div class="taglistdiv taglistscroll">
                    <div style="margin-bottom: 5px" v-for="aTime in cTagsSearch" :key="aTime" class="text" @click="onSelectTag(aTime)">{{ aTime.NAME }}</div>
                </div>
                <Pagination :total="Math.ceil(cTags.length / 1)" @e-on-change="onPaging" />
            </div>
            <div class="col-sm-6 newchart-right">
                <div class="wrapcharttype overflowhidden">
                    <ChartSelect @e-on-change="onSelectChart" />
                </div>
                <div class="selectedlistdiv taglistscroll">
                    <div v-for="(aTime, aIndex) in sSelectedTags" style="margin-bottom: 5px" :key="aIndex" class="text">
                        <span @click="onRemoveTag(aIndex)"> {{ aTime.NAME }}</span>
                        <ComboboxSelect :p-show-default-option="false" :p-data="CALC_MODE" :p-value="'avg'" @e-on-change="onChangeCalcMode" />
                    </div>
                </div>
                <div class="popup__btn-group">
                    <v-btn variant="outlined" class="button-effect-color" @click="onSetting"> Ok </v-btn>
                    <v-btn variant="outlined" class="button-effect" @click="onClosePopup"> Cancel </v-btn>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="NewChart">
import Pagination from '@/components/common/pagination/index.vue';
import TimeRange from '@/components/common/date-list/date-time-range.vue';
import TimeDuration from '@/components/common/date-list/date-time-duration.vue';
import CustomScale, { CustomScaleInput } from '@/components/common/custom-scale/index.vue';
import ButtonCreate from '@/components/common/button-create/index.vue';
import ChartSelect from '@/components/common/chart-select/index.vue';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import ComboboxTime from '@/components/common/combobox/combobox-time/index.vue';
import { useStore } from '@/store';
import { computed, defineEmits, reactive, ref, onMounted } from 'vue';
import { ChartType } from '@/enums/app';
import { CALC_MODE } from './constant';
import { fetchTablesData } from '@/api/repository/machiot';
import { ActionTypes } from '@/store/actions';
const emit = defineEmits(['eClosePopup']);
const searchText = ref<string>('');
const chartType = ref<ChartType>(ChartType.Zone);
const selectCount = ref<number>(0);
const cTags = computed(() => store.state.gTagList);
let cTagsSearch = ref<any>(cTags);
const sSelectedTags = reactive<any>([]);
const store = useStore();
// onMounted(async () => {
//     const data: any = await fetchTablesData();
//     console.log('🚀 ~ file: TimeDuration.vue:43 ~ onMounted ~ Data', data);
// });
const cTableList = computed(() => store.state.gTableList);
const cTableListSelect = computed(() =>
    cTableList.value.map((aItem: string) => {
        return {
            id: aItem,
            name: aItem,
        };
    })
);
console.log('🚀 ~ file: NewChart.vue:72 ~ cTableList', cTableList.value);
const onSearch = () => {
    if (searchText.value != '') {
        const searchTextTrim = searchText.value.trim();
        let sRegExp = new RegExp(searchTextTrim);
        if (searchTextTrim.charAt(0) == '/' && searchTextTrim.indexOf('/', 1) != -1) {
            // regexp
            var sSplit = searchTextTrim.split('/');
            sRegExp = sSplit.length > 2 ? new RegExp(sSplit[1], sSplit[2]) : new RegExp(sSplit[1]);
        }

        console.log('🚀 ~ file: NewChart.vue:91 ~ onSearch ~ searchTextTrim', searchTextTrim);
        cTagsSearch.value = cTagsSearch.value.filter(function (aVal: any) {
            return aVal['NAME'].search(sRegExp) != -1;
        });
    }
};
const onReset = () => {
    if (searchText.value != '') searchText.value = '';
};
const onSelectChart = (data: ChartType) => {
    console.log(data, 'data');
    chartType.value = data;
};
const onSelectTag = (data: any) => {
    selectCount.value++;
    sSelectedTags.push(data);
    console.log(data, 'data');
};
const onRemoveTag = (index: number) => {
    selectCount.value--;
    sSelectedTags.splice(index, 1);
    console.log(index, 'index');
};
const onChangeCalcMode = (data: string) => {
    console.log(data, 'data');
};
const onPaging = (index: number) => {
    console.log(index, 'index');
};
const onSetting = () => {
    onClosePopup();
    // store.dispatch(ActionTypes.setTimeRange, { start: dateStart.value, end: dateEnd.value }).then(() => onClosePopup());
};

const onClosePopup = () => {
    emit('eClosePopup');
};
store.dispatch(ActionTypes.fetchTableList);
store.dispatch(ActionTypes.fetchTagList, 'TAG');
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
