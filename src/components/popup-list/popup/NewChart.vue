<template>
    <div class="newchartdiv">
        <div class="row">
            <div class="newchart-all">
                <div class="tagtitle floatleft">Table</div>
                <ComboboxSelect class="input" :p-show-default-option="false" :p-data="[{ id: '1', name: 'TAG' }]" :p-value="'1'" style="width: 100%" />
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
                        <p class="searchcount">Total : {{ cTags.length }} / 10,000</p>
                    </div>
                    <div class="selectCountBox floatright">
                        <p class="selCountText">
                            Select : <span>{{ selectCount }}</span>
                        </p>
                    </div>
                </div>
                <div class="taglistdiv taglistscroll">
                    <div style="margin-bottom: 5px" v-for="aTime in cTags" :key="aTime" class="text" @click="onSelectTag(aTime)">{{ aTime }}</div>
                </div>
                <Pagination :total="Math.ceil(cTags.length / 1)" @e-on-change="onPaging"/>
            </div>
            <div class="col-sm-6 newchart-right">
                <div class="wrapcharttype overflowhidden">
                    <ChartSelect @e-on-change="onSelectChart" />
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
import { computed, defineEmits, reactive, ref } from 'vue';
import { ChartType } from '@/enums/app';
const searchText = ref<string>('');
const chartType = ref<ChartType>(ChartType.Zone);
const selectCount = ref<number>(0);
const cTags = ['TAG0001', 'TAG0002'];
const store = useStore();
// const cTableList = computed((): ResBoardList[] => store.state.gTableList);
const onSearch = () => {
    if (searchText.value != '') console.log('searchText.value', searchText.value.trim());
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
    console.log(data, 'data');
};
const onPaging = (index: number) => {
    console.log(index, 'index');
}
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
