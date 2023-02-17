<template>
    <div class="newchartdiv">
        <div class="row">
            <div class="newchart-all">
                <div class="tagtitle floatleft">Table</div>
                <ComboboxSelect class="input" :p-show-default-option="false" :p-data="cTableListSelect" :p-value="'TAG'" style="width: 100%" @e-on-change="onChangeTable" />
            </div>
        </div>
        <div class="row">
            <div class="col-sm-6 newchart-left">
                <div class="tagtitle floatleft">Tag</div>
                <div class="search-wrapper">
                    <input v-model="searchText" type="text" class="form-control taginput input" style="width: 180px" />
                    <span @click="onReset" style="text-align: center" class="input clear-icon"><img :src="i_b_close" alt="Clear icon" /></span>
                    <v-btn class="button-effect-color" variant="outlined" :height="30" @click="onSearch">Search</v-btn>
                </div>
                <div class="countGroup">
                    <div>Total : {{ cTagsSearch.length }} / {{ cTags.length }}</div>
                    <div>Select : {{ selectCount }}</div>
                </div>
                <div class="taglistdiv taglistscroll">
                    <div style="margin-bottom: 5px" v-for="(aTime, aIndex) in cTagsSearch" :key="aIndex" class="text" @click="onSelectTag(aTime)">{{ aTime.NAME }}</div>
                </div>
                <Pagination :total="Math.ceil(cTags.length / MAX_TAG_COUNT)" @e-on-change="onPaging" />
            </div>
            <div class="col-sm-6 newchart-right">
                <div class="selectedlistdiv taglistscroll" style="height: 300px">
                    <div v-for="(aTime, aIndex) in sSelectedTags" style="margin-bottom: 5px" :key="aIndex" class="wrapperTagSelect">
                        <span @click="onRemoveTag(aIndex)"> {{ aTime.tag_names }}</span>
                        <ComboboxSelect :p-show-default-option="false" :p-data="CALC_MODE" :p-value="'avg'" @e-on-change="(item) => onChangeCalcMode(item, aIndex)" />
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

<script setup lang="ts" name="NewTags">
import i_b_close from '@/assets/image/i_b_close.png';
import Pagination from '@/components/common/pagination/index.vue';
import ComboboxSelect from '@/components/common/combobox/combobox-select/index.vue';
import { useStore } from '@/store';
import { computed, defineEmits, reactive, ref, watch, defineProps, withDefaults, toRefs } from 'vue';
import { ChartType } from '@/enums/app';
import { CALC_MODE, MAX_TAG_COUNT } from './constant';
import { ActionTypes } from '@/store/actions';
import { TagSet } from '@/interface/chart';
import { CalculationMode } from '@/interface/constants';
interface NewTagProps {
    noOfSelectTags: number;
}
const props = defineProps<NewTagProps>();
const { noOfSelectTags } = toRefs(props);
const emit = defineEmits(['eClosePopup', 'eSubmit']);
const searchText = ref<string>('');
const isSearchClick = ref<boolean>(false);
const tableSelected = ref<string>('');
const chartType = ref<ChartType>(ChartType.Zone);
const selectCount = ref<number>(noOfSelectTags.value);
const cTags = computed(() => store.state.gTagList);
const cTagsSearch = ref<{ NAME: string }[]>([]);
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
    () => {
        store.dispatch(ActionTypes.fetchTagList, tableSelected.value);
    }
);
console.log('🚀 ~ file: NewChart.vue:72 ~ cTableList', cTableList.value);
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
            return aVal['NAME'].search(sRegExp) != -1;
        });
    }
};
const onReset = () => {
    if (searchText.value != '') searchText.value = '';
};
const onSelectTag = (data: { NAME: string }) => {
    selectCount.value++;
    sSelectedTags.push({ tag_names: data.NAME, table: tableSelected.value, calculation_mode: 'avg', alias: '', weight: 1.0, use_y2: 'N', max: 0, min: 0 });
};
const onRemoveTag = (index: number) => {
    selectCount.value--;
    sSelectedTags.splice(index, 1);
    console.log(index, 'index');
};
const onChangeCalcMode = (data: CalculationMode, index: number) => {
    sSelectedTags[index].calculation_mode = data;
};
const onPaging = (index: number) => {
    console.log(index, 'index');
};
const onSetting = () => {
    if (sSelectedTags.length <= 0) {
        alert('Select tags for the chart.');
        return;
    }
    if (sSelectedTags.length + noOfSelectTags.value > MAX_TAG_COUNT) {
        alert('The maximum number of tags in a chart is ' + MAX_TAG_COUNT.toString() + '.');
        return;
    }
    emit('eSubmit', sSelectedTags);
    onClosePopup();
};

const onClosePopup = () => {
    emit('eClosePopup');
};
store.dispatch(ActionTypes.fetchTableList);
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
