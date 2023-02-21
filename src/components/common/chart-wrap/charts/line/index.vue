<template>
    <ChartWrap>
        <ChartHeader :panel-info="props.panelInfo" />
        <LineChart
            :id="`chart-${props.index}`"
            ref="lineChart"
            :chart-data="data.sDisplayData"
            :panel-info="props.panelInfo"
            :x-axis-max-range="data.sTimeLine.endTime"
            :x-axis-min-range="data.sTimeLine.startTime"
            :is-stock-chart="sIsStockChart"
        />
        <ViewPort />
    </ChartWrap>
</template>

<script lang="ts" setup>
import ChartWrap from '@/components/common/chart-wrap/index.vue';
import ViewPort from '@/components/common/chart-wrap/viewport/index.vue';
import ChartHeader from '@/components/common/chart-wrap/chart-header/index.vue';
import { getDateRange } from '@/helpers/date';
import { lineColors } from '@/helpers/tags';
import { BarPanel, ChartData, HighchartsDataset, LineDataset, LinePanel, PanelInfo, ReturnTagData, TagSet, TimeInfo, startTimeToendTimeType } from '@/interface/chart';
import { TimeLineType } from '@/interface/date';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { toTimeUtcChart } from '@/utils/utils';
import moment from 'moment';
import { computed, defineProps, onMounted, reactive, ref, withDefaults } from 'vue';
import LineChart from '../line/container/index.vue';

interface LineChartProps {
    panelInfo: LinePanel;
    index: number;
}
const props = withDefaults(defineProps<LineChartProps>(), {
    index: 0,
});
const store = useStore();
const data = reactive({
    sDisplayData: {} as LineDataset,
    sTimeLine: {} as TimeLineType,
    sIntervalData: { IntervalType: convertInterType(props.panelInfo.interval_type.toLowerCase()), IntervalValue: 0 } as { IntervalValue: number; IntervalType: string },
    sIsLoading: false,
});
function convertInterType(gUnit: string) {
    switch (gUnit) {
        case 's':
            return 'sec';
        case 'm':
            return 'min';
        case 'h':
            return 'hour';
        case 'd':
            return 'day';
        default:
            return gUnit;
    }
}
const sInnerValue = reactive({
    sTickPixels: props.panelInfo.pixels_per_tick <= 0 ? (1 as number) : (props.panelInfo.pixels_per_tick as number),
});

const lineChart = ref(null);
const sIsStockChart = ref<boolean>(true);

function calcInterval(aBgn: string, aEnd: string, aWidth: number): { IntervalType: string; IntervalValue: number } {
    var sBgn = new Date(aBgn);
    var sEnd = new Date(aEnd);
    var sDiff = sEnd.getTime() - sBgn.getTime();
    var sSecond = Math.floor(sDiff / 1000);
    var sCalc = sSecond / (aWidth / sInnerValue.sTickPixels);
    var sRet = { type: 'sec', value: 1 };
    if (sCalc > 60 * 60 * 12) {
        // interval > 12H
        sRet.type = 'day';
        sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
    } else if (sCalc > 60 * 60 * 6) {
        // interval > 6H
        sRet.type = 'hour';
        sRet.value = 12;
    } else if (sCalc > 60 * 60 * 3) {
        // interval > 3H
        sRet.type = 'hour';
        sRet.value = 6;
    } else if (sCalc > 60 * 60) {
        // interval > 1H
        sRet.type = 'hour';
        sRet.value = Math.ceil(sCalc / (60 * 60));
    } else if (sCalc > 60 * 30) {
        // interval > 30M
        sRet.type = 'hour';
        sRet.value = 1;
    } else if (sCalc > 60 * 20) {
        // interval > 20M
        sRet.type = 'min';
        sRet.value = 30;
    } else if (sCalc > 60 * 15) {
        // interval > 15M
        sRet.type = 'min';
        sRet.value = 20;
    } else if (sCalc > 60 * 10) {
        // interval > 10M
        sRet.type = 'min';
        sRet.value = 15;
    } else if (sCalc > 60 * 5) {
        // interval > 5M
        sRet.type = 'min';
        sRet.value = 10;
    } else if (sCalc > 60 * 3) {
        // interval > 3M
        sRet.type = 'min';
        sRet.value = 5;
    } else if (sCalc > 60) {
        // interval > 1M
        sRet.type = 'min';
        sRet.value = Math.ceil(sCalc / 60);
    } else if (sCalc > 30) {
        // interval > 30S
        sRet.type = 'min';
        sRet.value = 1;
    } else if (sCalc > 20) {
        // interval > 20S
        sRet.type = 'sec';
        sRet.value = 30;
    } else if (sCalc > 15) {
        // interval > 15S
        sRet.type = 'sec';
        sRet.value = 20;
    } else if (sCalc > 10) {
        // interval > 10S
        sRet.type = 'sec';
        sRet.value = 15;
    } else if (sCalc > 5) {
        // interval > 5S
        sRet.type = 'sec';
        sRet.value = 10;
    } else if (sCalc > 3) {
        // interval > 3S
        sRet.type = 'sec';
        sRet.value = 5;
    } else {
        sRet.type = 'sec';
        sRet.value = Math.ceil(sCalc);
    }
    if (sRet.value < 1) {
        sRet.value = 1;
    }
    return {
        IntervalType: sRet.type,
        IntervalValue: sRet.value,
    };
}
const getCalcStackedPercentage = (aTagList: ReturnTagData[][]) => {
    const sSumDatas = [] as number[];
    aTagList.forEach((tag: ReturnTagData[]) => {
        tag[0].Samples.forEach((data: ChartData, i: number) => {
            sSumDatas[i] = sSumDatas[i] ? sSumDatas[i] + data.Value : data.Value;
        });
    });
    return sSumDatas;
};
const convertData = async (aTagData: ReturnTagData[], aPanelInfo: PanelInfo, aTagInfo: TagSet, aIndex: number, aSumDatas: number[]): Promise<HighchartsDataset[]> => {
    const sTagColor = lineColors[aIndex];
    const sDataset = aTagData.map((aTag) => {
        return {
            name: `${aTag.TagName}(${aTag.CalculationMode})`,
            data: aTag.Samples.map((aItem) => {
                return [toTimeUtcChart(aItem.TimeStamp), aItem.Value];
            }),

            yAxis: aTagInfo.use_y2 === 'Y' ? 1 : 0,
            // color: sTagColor,
            type: props.panelInfo.chart_type === 'areaLine' ? 'area' : null,
            fillColor:
                props.panelInfo.chart_type === 'areaLine'
                    ? {
                          linearGradient: [0, 0, 0, 600],
                          stops: [
                              [0, sTagColor],
                              [1, 'rgba(54,127,235,0)'],
                          ],
                      }
                    : null,
            marker: {
                symbol: 'circle',
                lineColor: null,
                lineWidth: 1,
            },
        };
    });
    return sDataset;
};

const fetchPanelData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
    const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    let sLimit = aPanelInfo.count;
    let sCount = -1;
    if (sLimit < 0) {
        sCount = Math.ceil(sChartWidth / sInnerValue.sTickPixels);
    }
    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    const sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) data.sTimeLine = sTimeRange;
    const sIntervalTime =
        aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(data.sTimeLine.startTime as string, data.sTimeLine.endTime as string, sChartWidth) : data.sIntervalData;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        console.log('sTagSetElement', sTagSetElement);
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagData, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
            End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
            CalculationMode: sTagSetElement.calculation_mode.toLowerCase(),
            ...sIntervalTime,
            Count: sCount,
            Direction: 0,
        });
        sTagList.push(sFetchResult);
    }
    const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
    await sTagList.forEach(async (_, i: number) => {
        const sTag = aPanelInfo.tag_set[i];
        const sRes: ReturnTagData[] = sTagList.map((tag) => {
            return tag[0];
        });
        let sConvertData;
        sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
        sDatasets = sConvertData;
    });
    data.sDisplayData = { datasets: sDatasets };
};
const generateRollupDataChart = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
    let sLimit = aPanelInfo.count;
    let gUnit = convertInterType(aPanelInfo.interval_type.toLowerCase());
    if (gUnit != '') {
        sLimit = 0;
    }
    const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    const sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) data.sTimeLine = sTimeRange;
    const sIntervalTime =
        aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(data.sTimeLine.startTime as string, data.sTimeLine.endTime as string, sChartWidth) : data.sIntervalData;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagData, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
            End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
            CalculationMode: sTagSetElement.calculation_mode.toLowerCase(),
            ...sIntervalTime,
            Count: sLimit,
        });
        sTagList.push(sFetchResult);
    }
    const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
    await sTagList.forEach(async (_, i: number) => {
        const sTag = aPanelInfo.tag_set[i];
        const sRes: ReturnTagData[] = sTagList.map((tag) => {
            return tag[0];
        });
        let sConvertData;
        sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
        sDatasets = sConvertData;
    });
    data.sDisplayData = { datasets: sDatasets };
};
const drawRawDataTable = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
    let gDetailLimit = 0;
    gDetailLimit = aPanelInfo.detail_count;
    let sRawLimit = gDetailLimit;
    const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    const sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) data.sTimeLine = sTimeRange;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagDataRaw, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
            End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
            Count: sRawLimit,
            Direction: 0,
        });
        sTagList.push(sFetchResult);
    }
    const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
    await sTagList.forEach(async (_, i: number) => {
        const sTag = aPanelInfo.tag_set[i];
        const sRes: ReturnTagData[] = sTagList.map((tag) => {
            return tag[0];
        });
        let sConvertData;
        sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
        sDatasets = sConvertData;
    });
    data.sDisplayData = { datasets: sDatasets };
};
const generateRawDataChart = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType, aLimit?: any) => {
    const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    let gRawChartLimit = 0;
    gRawChartLimit = aPanelInfo.raw_chart_limit;
    if (aPanelInfo.raw_chart_limit < 0) {
        // -1: (chart width / 2), 0: chart width, >0: limit
        gRawChartLimit = Math.floor(sChartWidth / 2);
    } else if (aPanelInfo.raw_chart_limit == 0) {
        gRawChartLimit = sChartWidth;
    }
    if (aLimit === null) {
        aLimit = gRawChartLimit;
    }
    var sLimit = aLimit;

    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    const sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) data.sTimeLine = sTimeRange;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagDataRaw, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: moment(sTimeRange.startTime).format(FORMAT_FULL_DATE),
            End: moment(sTimeRange.endTime).format(FORMAT_FULL_DATE),
            Count: sLimit,
            Direction: 0,
        });
        sTagList.push(sFetchResult);
    }
    const sSumTagDatas = getCalcStackedPercentage(sTagList); // [72.19, ....]
    await sTagList.forEach(async (_, i: number) => {
        const sTag = aPanelInfo.tag_set[i];
        const sRes: ReturnTagData[] = sTagList.map((tag) => {
            return tag[0];
        });
        let sConvertData;
        sConvertData = await convertData(sRes, aPanelInfo, sTag, i, sSumTagDatas);
        sDatasets = sConvertData;
    });
    data.sDisplayData = { datasets: sDatasets };
};

const intializePanelData = async (aCustomRange?: startTimeToendTimeType) => {
    data.sIsLoading = true;
    try {
        await fetchPanelData(props.panelInfo, aCustomRange);
    } catch (error) {
        console.log(error);
    }
    data.sIsLoading = false;
};

onMounted(() => {
    intializePanelData();
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
