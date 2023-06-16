<template>
    <div class="newchartdiv">
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
                    <input v-model="searchText" class="form-control taginput input" style="width: 180px" type="text" />
                    <span @click="onReset" class="input clear-icon" style="text-align: center"><img alt="Clear icon" :src="i_b_close" /></span>
                    <v-btn @click="onSearch" class="button-effect-color" :height="30" variant="outlined">Search</v-btn>
                </div>
                <div class="countGroup">
                    <div>Total : {{ cTagsSearch.length }} / {{ cTags.length }}</div>
                    <div>Select : {{ selectCount }}</div>
                </div>
                <div class="taglistdiv taglistscroll">
                    <div v-for="(aTime, aIndex) in tagsPaged[pageIndex]" :key="aIndex" @click="onSelectTag(aTime)" class="text" style="margin-bottom: 5px">{{ aTime }}</div>
                </div>
                <Pagination @e-on-change="onPaging" :total="Math.ceil(cTags.length / MAX_TAG_COUNT)" />
            </div>
            <div class="col-sm-6 newchart-right">
                <div class="selectedlistdiv taglistscroll" style="height: 300px">
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
import { getPaginationPages } from '@/utils/utils';
import { toast, ToastOptions } from 'vue3-toastify';

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
const cTagsSearch = ref<{ name: string }[]>([]);
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
const cIsDarkMode = computed(() => store.getters.getDarkMode);
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
    () => {
        if (cTableListSelect.value[0]) {
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
            return aVal['name'].search(sRegExp) != -1;
        });
    }
};
const onReset = () => {
    if (searchText.value != '') searchText.value = '';
};
const onSelectTag = (data: { name: string }) => {
    selectCount.value++;
    sSelectedTags.push({ tag_names: data, table: tableSelected.value, calculation_mode: 'avg', alias: '', weight: 1.0, use_y2: 'N', max: 0, min: 0 });
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
        toast('Select tags for the chart.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }
    if (sSelectedTags.length + noOfSelectTags.value > MAX_TAG_COUNT) {
        toast('The maximum number of tags in a chart is ' + MAX_TAG_COUNT.toString() + '.', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
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
