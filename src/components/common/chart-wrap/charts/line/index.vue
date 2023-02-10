<template>
    <ChartWrap>
        <LineChart
            :id="`chart-${props.index}`"
            ref="lineChart"
            :chart-data="data.sDisplayData"
            :panel-info="props.panelInfo"
            :panel-width="props.panelInfo.chart_width"
            :x-axis-max-range="data.sTimeLine.endTime"
            :x-axis-min-range="data.sTimeLine.startTime"
            :is-stock-chart="cIsStockChart"
        />
    </ChartWrap>
</template>

<script lang="ts" setup>
import ChartWrap from '@/components/common/chart-wrap/index.vue';
import { convertDurationToSecond, getDateRange, getIntervalTime } from '@/helpers/date';
import { lineColors } from '@/helpers/tags';
import { BarPanel, ChartData, HighchartsDataset, LineDataset, LinePanel, PanelInfo, ReturnTagData, TagSet, TimeInfo, startTimeToendTimeType } from '@/interface/chart';
import { TimeLineType } from '@/interface/date';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { FORMAT_FULL_DATE } from '@/utils/constants';
import { toTimeUtcChart } from '@/utils/utils';
import moment from 'moment';
import { computed, defineExpose, defineProps, onMounted, reactive, ref, withDefaults, watch } from 'vue';
import { useRoute } from 'vue-router';
import LineChart from '../line/container/index.vue';

interface LineChartProps {
    panelInfo: LinePanel;
    index: number;
}

const props = withDefaults(defineProps<LineChartProps>(), {
    index: 0,
});

const store = useStore();
const route = useRoute();

const data = reactive({
    sDisplayData: {} as LineDataset, // Data show chart
    sTimeLine: {} as TimeLineType, // Time range
    sIntervalData: { IntervalType: convertInterType(props.panelInfo.interval_type.toLowerCase()), IntervalValue: 0 } as { IntervalValue: number; IntervalType: string },
    sCount: -1 as number,
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
// setVars
const sInnerValue = reactive({
    sTickPixels: props.panelInfo.pixels_per_tick <= 0 ? (1 as number) : (props.panelInfo.pixels_per_tick as number),
    sLimitParam: -1 as number,
    sLimit: -1 as number,
});
// function setVars(params: type) {}

const lineChart = ref(null);

const cIsStockChart = computed(() => {
    // return props.panelInfo.isStock === 'Y';
    return true;
});

// D3
//{ type: 'sec', value: 1 } if interval_type (gUnit) = ''
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

//

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

const getIntervalData = (chartWidth: number, aPanelInfo: PanelInfo, aTimeRange: TimeInfo, aCustomRange?: startTimeToendTimeType) => {
    return getIntervalTime(chartWidth, aPanelInfo, aTimeRange.startTime, aTimeRange.endTime, aCustomRange);
};

const fetchPanelData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
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

            Count: 305,
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

// pending
const setIntervalRefresh = () => {
    // const sRefreshTime = props.panelInfo.refresh;
    // clearTimeout(data.sInterVal);
    // if (sRefreshTime === 'off' || !sRefreshTime) return;
    // let intervalTime = convertDurationToSecond(sRefreshTime);
    // data.sInterVal = setTimeout(() => {
    //     // 왜 10초 뒤에 실행되야 하는 지 모르겠음.
    //     refreshData(true); //👈 true를 줘야 데이터 refresh가 실행 됨.
    // }, (intervalTime as number) * 1000);
};
const refreshData = async (aIsReset: boolean) => {
    // if (!aIsReset) return;
    // // this.sInitLoading = true; 차트 컴포넌트를 새로 그림.
    // await intializePanelData();
    // data.sTimeLineData = { ...data.sDisplayData };
    // setIntervalRefresh();
};
const refreshBoard = async (aIsRangeTimeChange: boolean) => {
    // if (this.sLoading || this.sIsZooming) return;  👈 원래는 이거임. panel에서 줌했을 때, dashboard 전체에 적용이 되어야 함.
    // if (data.sIsLoading) return;
    // if (aIsRangeTimeChange) {
    //     if (props.panelInfo.range_bgn && props.panelInfo.range_end) return;
    // } else {
    //     if (props.panelInfo.refresh) return;
    // }
    // await refreshData(true);
};

//
onMounted(async () => {
    await intializePanelData();
});

defineExpose({
    refreshBoard,
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
