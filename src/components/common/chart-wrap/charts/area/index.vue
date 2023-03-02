<template>
    <ChartWrap>
        <div v-if="sLoading" class="loading-chart">
            <img :src="cIsDarkMode ? loader_b : loader_w" class="icon" />
        </div>
        <ChartHeader
            :panel-info="props.panelInfo"
            :x-axis-max-range="data.sTimeLine.endTime"
            :x-axis-min-range="data.sTimeLine.startTime"
            :p-inner-value="sInnerValue"
            :p-interval-data="data.sIntervalData"
            @eOnReload="onReload"
        />
        <AreaChart
            :id="`chart-${props.index}`"
            ref="areaChart"
            :max-y-chart="data.sMaxYChart"
            :chart-data="data.sDisplayData"
            :view-data="data.sViewPortData"
            :panel-info="props.panelInfo"
            :x-axis-max-range="data.sTimeLine.endTime"
            :x-axis-min-range="data.sTimeLine.startTime"
            :x-min-time-range-view-port="data.sTimeRangeViewPort.startTime"
            :x-max-time-range-view-port="data.sTimeRangeViewPort.endTime"
            :is-stock-chart="sIsStockChart"
            :p-is-zoom="sIsZoom"
            @eOnChange="OnChangeTimeRangerViewPort"
        />
        <ViewPort
            :range-time="data.sTimeRangeViewPort"
            :panel-info="props.panelInfo"
            :p-is-zoom="sIsZoom"
            @eOnChange="onChangeTimeRange"
            @eOnChangeAdjust="adjustViewportRange"
            @eOnChangeSRF="onChangeSRF"
            @eOnFocus="OnFocus"
            @eonCloseNavigator="onCloseNavigator"
        />
    </ChartWrap>
</template>

<script lang="ts" setup>
import loader_b from '@/assets/image/ajax-loader-b.gif';
import loader_w from '@/assets/image/ajax-loader-w.gif';
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
import { computed, defineProps, onMounted, reactive, ref, withDefaults, watch } from 'vue';
import AreaChart from './container/index.vue';
import { useSlots } from 'vue';

interface AreaChartProps {
    panelInfo: LinePanel;
    index: number;
}
const props = withDefaults(defineProps<AreaChartProps>(), {
    index: 0,
});

const store = useStore();
const slots = useSlots();
const sLoading = ref<boolean>(false);
const areaChart = ref<any>();
const data = reactive({
    sDisplayData: {} as LineDataset,
    sViewPortData: {} as LineDataset,
    sTimeLine: {} as TimeLineType,
    sTimeRangeViewPort: {} as TimeLineType,
    sIntervalData: { IntervalType: convertInterType(props.panelInfo.interval_type.toLowerCase()), IntervalValue: 0 } as { IntervalValue: number; IntervalType: string },
    sIsLoading: false,
    sMaxYChart: 0 as number,
});
const sIsZoom = ref<boolean>(true);

const sIsStockChart = ref<boolean>(true);
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
const cIsDarkMode = computed(() => store.getters.getDarkMode);

function calcInterval(aBgn: string, aEnd: string, aWidth: number): { IntervalType: string; IntervalValue: number } {
    let sBgn = new Date(aBgn);
    let sEnd = new Date(aEnd);
    let sDiff = sEnd.getTime() - sBgn.getTime();
    let sSecond = Math.floor(sDiff / 1000);
    let sCalc = sSecond / (aWidth / sInnerValue.sTickPixels);
    let sRet = { type: 'sec', value: 1 };
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
    sLoading.value = true;
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
    let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) {
        sTimeRange = {
            startTime: moment(moment(sTimeRange.endTime).valueOf() - 100000).format('YYYY-MM-DDTHH:mm:ss'),
            endTime: sTimeRange.endTime,
        };
    }
    data.sTimeLine.startTime = sTimeRange.startTime;
    data.sTimeLine.endTime = sTimeRange.endTime;
    const sIntervalTime =
        aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(data.sTimeLine.startTime as string, data.sTimeLine.endTime as string, sChartWidth) : data.sIntervalData;
    data.sIntervalData = sIntervalTime;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
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
    data.sMaxYChart = getMaxValue(sDatasets);
    sLoading.value = false;
};
const fetchViewPortData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
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
    let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    data.sTimeRangeViewPort.startTime = sTimeRange.startTime;
    data.sTimeRangeViewPort.endTime = sTimeRange.endTime;
    const sIntervalTime =
        aPanelInfo.interval_type.toLowerCase() === ''
            ? calcInterval(data.sTimeRangeViewPort.startTime as string, data.sTimeRangeViewPort.endTime as string, sChartWidth)
            : data.sIntervalData;
    data.sIntervalData = sIntervalTime;
    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
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
    data.sViewPortData = { datasets: sDatasets };
};

const drawRawDataTable = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
    sLoading.value = true;
    let gDetailLimit = 0;
    gDetailLimit = aPanelInfo.detail_count;
    let sRawLimit = gDetailLimit;
    const sChartWidth: number = (document.getElementById(`chart-${props.index}`) as HTMLElement)?.clientWidth;
    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    if (!aCustomRange) {
        sTimeRange = {
            // startTime: moment(sTimeRange.startTime).valueOf() - 133000,
            startTime: moment(moment(sTimeRange.endTime).valueOf() - 133000).format('YYYY-MM-DDTHH:mm:ss'),
            endTime: sTimeRange.endTime,
        };
    }
    data.sTimeLine.startTime = sTimeRange.startTime;
    data.sTimeLine.endTime = sTimeRange.endTime;
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
    sLoading.value = false;
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
    let sLimit = aLimit;

    let sDatasets = [] as HighchartsDataset[];
    const sTagList: ReturnTagData[][] = [];
    const sTagSet = aPanelInfo.tag_set || [];
    if (!sTagSet.length) return;
    let sTimeRange = await getDateRange(aPanelInfo, store.state.gBoard, aCustomRange);
    data.sTimeRangeViewPort.startTime = sTimeRange.startTime;
    data.sTimeRangeViewPort.endTime = sTimeRange.endTime;
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

const intializePanelData = async (aCustomRange?: startTimeToendTimeType, aViewPortRange?: startTimeToendTimeType) => {
    data.sIsLoading = true;
    try {
        if (!aCustomRange && !aViewPortRange) {
            await fetchViewPortData(props.panelInfo);
            await fetchPanelData(props.panelInfo);
        } else {
            await fetchViewPortData(props.panelInfo, aViewPortRange);
            await fetchPanelData(props.panelInfo, aCustomRange);
        }
    } catch (error) {
        console.log(error);
    }
    data.sIsLoading = false;
};

const onReload = async () => {
    intializePanelData();
};
const onChangeTimeRange = async (eValue: any) => {
    await fetchViewPortData(props.panelInfo, {
        startTime: eValue.dateStart,
        endTime: eValue.dateEnd,
    });
    await fetchPanelData(props.panelInfo, {
        startTime: data.sTimeLine.startTime,
        endTime: data.sTimeLine.endTime,
    });
};
const onChangeSRF = async (eValue: any) => {
    const aCustomRange = {
        startTime: eValue.dateStart,
        endTime: eValue.dateEnd,
    };
    switch (eValue) {
        case 0:
            await fetchViewPortData(props.panelInfo);
            await fetchPanelData(props.panelInfo);
            break;
        case 1:
            await generateRawDataChart(props.panelInfo, null as any, null);
            await drawRawDataTable(props.panelInfo);
            break;
        default:
            break;
    }
};

const adjustViewportRange = async (aEvent: { type: 'O' | 'I'; zoom: number }) => {
    let sType = aEvent.type;
    let sZoom = aEvent.zoom / 2; // left & right

    let sBgn = data.sTimeRangeViewPort.startTime;
    let sEnd = data.sTimeRangeViewPort.endTime;
    let sTimeGap = moment(sEnd).valueOf() - moment(sBgn).valueOf();
    let sNewTimeBgn = null;
    let sNewTimeEnd = null;

    if (sType == 'I') {
        sZoom = sZoom * -1.0;
    }
    // calc new time range
    sNewTimeBgn = moment(sBgn).valueOf() - sTimeGap * sZoom;
    sNewTimeEnd = moment(sEnd).valueOf() + sTimeGap * sZoom;

    if (sNewTimeBgn >= sNewTimeEnd) {
        alert('The time range is too small to perform this function.');
        return;
    }
    await fetchViewPortData(props.panelInfo, {
        startTime: moment(sNewTimeBgn).format(FORMAT_FULL_DATE),
        endTime: moment(sNewTimeEnd).format(FORMAT_FULL_DATE),
    });
    await fetchPanelData(props.panelInfo, {
        startTime: data.sTimeLine.startTime,
        endTime: data.sTimeLine.endTime,
    });
};
const OnFocus = async () => {
    let sBgn = data.sTimeLine.startTime;
    let sEnd = data.sTimeLine.endTime;
    let sTimeGap = moment(sEnd).valueOf() - moment(sBgn).valueOf();
    let sNewTimeBgn = null;
    let sNewTimeEnd = null;
    sNewTimeBgn = moment(sBgn).valueOf() - sTimeGap * -0.25;
    sNewTimeEnd = moment(sEnd).valueOf() + sTimeGap * -0.25;

    await fetchViewPortData(props.panelInfo, {
        startTime: sBgn,
        endTime: sEnd,
    });
    await fetchPanelData(props.panelInfo, {
        startTime: moment(sNewTimeBgn).format(FORMAT_FULL_DATE),
        endTime: moment(sNewTimeEnd).format(FORMAT_FULL_DATE),
    });
};
async function OnChangeTimeRangerViewPort(params: any) {
    await fetchPanelData(props.panelInfo, {
        startTime: moment(params.min).utc().format(FORMAT_FULL_DATE),
        endTime: moment(params.max).utc().format(FORMAT_FULL_DATE),
    });
}
const getMaxValue = (array: any) => {
    return array.reduce((result: number, current: any) => {
        current.data.forEach((a: any) => {
            if (a[1] > result) result = a[1];
        });
        return result;
    }, 0);
};
const onCloseNavigator = () => {
    sIsZoom.value = false;
};

watch(
    () => props.panelInfo,
    () => {
        intializePanelData();
    }
);
onMounted(() => {
    intializePanelData();
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
