<template>
    <ChartWrap>
        <div v-if="sLoading" class="loading-chart">
            <img class="icon" :src="cIsDarkMode ? loader_b : loader_w" />
        </div>
        <ChartHeader
            @eOnReload="onReload"
            :p-data-range="data.sDataRange"
            :p-inner-value="sInnerValue"
            :p-interval-data="data.sIntervalData"
            :p-is-raw="data.sIsRaw"
            :p-panel-index="props.index"
            :p-panel-title="data.sPanelTitle"
            :p-tab-idx="props.pTabIdx"
            :p-type="props.pType"
            :panel-info="props.panelInfo"
            :x-axis-max-range="data.sMaxTime"
        />

        <AreaChart
            ref="areaChart"
            :id="`chart-${props.index}`"
            @eOnChange="OnChangeTimeRangerViewPort"
            @eOnChangeIsZoom="onChangeZoom"
            @eOnChangeNavigator="OnChangeTimeRangerViewPortNavigator"
            @eOnChangeRaw="OnChangeRaw"
            @eOnClick="OnChangeTimeClick"
            @eResetSquare="onResetSquare"
            :chart-data="data.sDisplayData"
            class="area-chart"
            :is-stock-chart="sIsStockChart"
            :max-y-chart="data.sMaxYChart"
            :p-is-raw="data.sIsRaw"
            :p-is-zoom="sIsZoom"
            :p-panel-width="
                data.sViewPortData.datasets &&
                data.sViewPortData.datasets
                    .map((i) => {
                        return { yAxis: i.yAxis };
                    })
                    .find((aItem) => aItem.yAxis === 1)
                    ? sClientWidth
                    : sClientWidth - 15
            "
            :panel-info="props.panelInfo"
            :view-data="data.sViewPortData"
            :x-axis-max-range="data.sTimeLine.endTime"
            :x-axis-min-range="data.sTimeLine.startTime"
            :x-max-time-range-view-port="data.sTimeRangeViewPort.endTime"
            :x-min-time-range-view-port="data.sTimeRangeViewPort.startTime"
        />
        <ViewPort
            v-if="data.sTimeLine"
            @eMoveFocus="moveFocus"
            @eOnChange="onChangeTimeRange"
            @eOnChangeAdjust="adjustViewportRange"
            @eOnChangeSRF="onChangeSRF"
            @eOnFocus="OnFocus"
            @eOnUndoTime="OnUndoTime"
            @eonCloseNavigator="onCloseNavigator"
            :p-data-range="data.sDataRange"
            :p-is-raw="data.sIsRaw"
            :p-is-zoom="sIsZoom"
            :p-panel-index="props.index"
            :p-time-range="data.sTimeLine"
            :p-x-axis-max-range="data.sMaxTime"
            :panel-info="props.panelInfo"
            :range-time="data.sTimeRangeViewPort"
        />
    </ChartWrap>
</template>

<script lang="ts" setup>
import loader_b from '@/assets/image/ajax-loader-b.gif';
import loader_w from '@/assets/image/ajax-loader-w.gif';
import ChartHeader from './header/index.vue';
import ChartWrap from '@/components/common/chart-wrap/index.vue';
import ViewPort from './container/viewport.vue';
import { getDateRange } from '@/helpers/date';
import { BarPanel, HighchartsDataset, LineDataset, LinePanel, startTimeToendTimeType } from '@/interface/chart';
import { TimeLineType } from '@/interface/date';
import { useStore } from '@/store';
import { ActionTypes } from '@/store/actions';
import { toDateUtcChart, toTimeUtcChart, rawtoTimeUtcChart } from '@/utils/utils';
import { computed, defineProps, onMounted, reactive, ref, watch, withDefaults, defineExpose, nextTick } from 'vue';
import AreaChart from './container/index.vue';
import { getChartMinMaxData } from '../../../api/repository/machiot';

interface AreaChartProps {
    panelInfo: LinePanel;
    index: number;
    pTabIdx: number;
    pType?: string;
}
const props = withDefaults(defineProps<AreaChartProps>(), {
    index: 0,
});
const gBoard = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return gTabList.value[sIdx];
});

const sClientWidth = ref(0);
const store = useStore();
const sLoading = ref<boolean>(false);
const areaChart = ref<any>();
const data = reactive({
    sIsRaw: true as boolean,
    sDisplayData: {} as LineDataset,
    sViewPortData: {} as LineDataset,
    sTimeLine: {} as TimeLineType,
    sTimeRangeViewPort: {} as TimeLineType,
    sIntervalData: { IntervalType: convertInterType(props.panelInfo.interval_type?.toLowerCase()), IntervalValue: 0 } as { IntervalValue: number; IntervalType: string },
    sIsLoading: false,
    sMaxYChart: 0 as number,
    sUndo: [] as TimeLineType[],
    sStatusUndo: false as boolean,
    sDataRange: 1,
    sTimeFormat: 0,
    sMaxTime: 0,
    sPanelTitle: '',
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
    sTickPixels: 0,
});
const cIsDarkMode = computed(() => store.getters.getDarkMode);
const gTabList = computed(() => {
    return store.state.gTabList;
});
const gSelectedTab = computed(() => store.state.gSelectedTab);

const cTimeRange = computed(() => {
    const sIdx = gTabList.value.findIndex((aItem: any) => aItem.board_id === gSelectedTab.value);
    return { start: gTabList.value[sIdx].range_bgn, end: gTabList.value[sIdx].range_end, refresh: gTabList.value[sIdx].refresh };
});

function calcInterval(aBgn: number, aEnd: number, aWidth: number): { IntervalType: string; IntervalValue: number } {
    let sDiff = aEnd - aBgn;
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
const fetchPanelData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType, aIsNavigator?: boolean) => {
    sLoading.value = true;
    let sChartWidth;
    sChartWidth = areaChart.value.chart.$el.clientWidth ? areaChart.value.chart.$el.clientWidth : window.outerWidth - 62;
    sClientWidth.value = sChartWidth;
    let sLimit = aPanelInfo.count;
    let sCount = -1;
    if (sLimit < 0) {
        // sCount = Math.ceil(sChartWidth / sInnerValue.sTickPixels);
    }
    let sDatasets = [] as HighchartsDataset[];
    const sTagSet = aPanelInfo.tag_set || [];
    if (sTagSet.length === 0) {
        sLoading.value = false;
        data.sDisplayData = { datasets: sDatasets };
        return;
    }
    let sTimeRange = await getDateRange(aPanelInfo, gBoard.value, aCustomRange);

    let sStartTime = toTimeUtcChart(sTimeRange.startTime);
    let sEndTime = toTimeUtcChart(sTimeRange.endTime);

    data.sTimeLine.startTime = sStartTime;
    data.sTimeLine.endTime = sEndTime;
    if (!aCustomRange && !aIsNavigator) {
        data.sTimeLine.startTime = sStartTime - (sEndTime - sStartTime) * -0.4;
        data.sTimeLine.endTime = sStartTime - (sEndTime - sStartTime) * -0.6;
    }
    const sIntervalTime = aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(sStartTime, sEndTime, sChartWidth) : data.sIntervalData;

    data.sIntervalData = sIntervalTime;

    const sString = props.panelInfo.tag_set
        .map((aItem) => {
            return `tags=${aItem.table}/${aItem.tag_names}`;
        })
        .join('&');

    const sSplitOptionData = props.panelInfo.option ? props.panelInfo.option.split(' ') : '';

    if (sSplitOptionData && sSplitOptionData.length >= 1) {
        data.sDataRange = Number(sSplitOptionData[2]);
        data.sMaxTime = Number(sSplitOptionData[1]);
    }
    const sData = await store.dispatch(ActionTypes.fetchxAxisChartData, { tagTables: sString, option: sSplitOptionData[0], range: data.sDataRange, time: data.sMaxTime });

    sData.data.datasets = sData.data.datasets.map((aItem) => {
        return { ...aItem, name: aItem.label };
    });
    data.sDisplayData = sData;
    data.sPanelTitle = sData.options.plugins.title.text;

    sLoading.value = false;
};
const fetchViewPortData = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType) => {
    const sChartWidth: number = areaChart.value.chart.$el.clientWidth ? areaChart.value.chart.$el.clientWidth : window.outerWidth - 62;
    let sLimit = aPanelInfo.count;
    let sCount = -1;
    if (sLimit < 0) {
        sCount = Math.ceil(sChartWidth / sInnerValue.sTickPixels);
    }
    let sDatasets = [] as HighchartsDataset[];
    const sTagSet = aPanelInfo.tag_set || [];

    if (sTagSet.length === 0) {
        sLoading.value = false;
        data.sViewPortData = { datasets: sDatasets };
        return;
    }

    let sTimeRange = await getDateRange(aPanelInfo, gBoard.value, aCustomRange);
    let sStartTime = toTimeUtcChart(sTimeRange.startTime);
    let sEndTime = toTimeUtcChart(sTimeRange.endTime);

    data.sTimeRangeViewPort.startTime = sStartTime;
    data.sTimeRangeViewPort.endTime = sEndTime;
    const sIntervalTime = aPanelInfo.interval_type.toLowerCase() === '' ? calcInterval(sStartTime, sEndTime, sChartWidth) : data.sIntervalData;
    data.sIntervalData = sIntervalTime;

    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagData, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: toDateUtcChart(sStartTime, true),
            End: toDateUtcChart(sEndTime, true),
            Rollup: sTagSetElement.onRollup,
            CalculationMode: sTagSetElement.calculation_mode.toLowerCase(),
            colName: sTagSetElement.colName,
            ...sIntervalTime,
            Count: sCount,
        });
        if (typeof sFetchResult === 'string') {
            // alert(sFetchResult);
        } else {
            await sDatasets.push({
                name: sTagSetElement.alias || `${sTagSetElement.tag_names}(${data.sIsRaw ? 'raw' : sTagSetElement.calculation_mode.toLowerCase()})`,
                data:
                    sFetchResult.length > 0
                        ? sFetchResult.map((aItem: any) => {
                              return [toTimeUtcChart(aItem.time), aItem.avg];
                          })
                        : [],
                yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
            });
        }
    }

    data.sViewPortData = await { datasets: sDatasets };
};
const generateRawDataChart = async (aPanelInfo: BarPanel, aCustomRange?: startTimeToendTimeType, aIsNavigator?: boolean, aLimit?: any) => {
    sLoading.value = true;
    const sChartWidth: number = areaChart.value.chart.$el.clientWidth ? areaChart.value.chart.$el.clientWidth : window.outerWidth - 62;
    let gRawChartLimit = 0;
    gRawChartLimit = aPanelInfo.raw_chart_limit;
    if (aPanelInfo.raw_chart_limit < 0) {
        gRawChartLimit = Math.floor(sChartWidth / 2);
    } else if (aPanelInfo.raw_chart_limit == 0) {
        gRawChartLimit = sChartWidth;
    }
    let sLimit = aLimit || gRawChartLimit;
    let sDatasets = [] as HighchartsDataset[];
    const sTagSet = aPanelInfo.tag_set || [];
    if (sTagSet.length === 0) {
        sLoading.value = false;
        data.sDisplayData = { datasets: sDatasets };
        return;
    }
    let sTimeRange = await getDateRange(aPanelInfo, gBoard.value, aCustomRange);
    let sStartTime = toTimeUtcChart(sTimeRange.startTime);
    let sEndTime = toTimeUtcChart(sTimeRange.endTime);

    data.sTimeLine.startTime = sStartTime;
    data.sTimeLine.endTime = sEndTime;
    if (!aCustomRange && !aIsNavigator) {
        data.sTimeLine.startTime = sStartTime - (sEndTime - sStartTime) * -0.4;
        data.sTimeLine.endTime = sStartTime - (sEndTime - sStartTime) * -0.6;
    }

    for (let index = 0; index < sTagSet.length; index++) {
        const sTagSetElement = sTagSet[index];
        const sFetchResult = await store.dispatch(ActionTypes.fetchTagDataRaw, {
            Table: sTagSetElement.table,
            TagNames: sTagSetElement.tag_names,
            Start: toDateUtcChart(sStartTime, true),
            End: toDateUtcChart(sEndTime, true),
            Count: sLimit,
            colName: sTagSetElement.colName,
            Direction: 0,
        });
        if (typeof sFetchResult === 'string') {
            // alert(sFetchResult);
        } else {
            sDatasets.push({
                name: sTagSetElement.alias || `${sTagSetElement.tag_names}(raw)`,
                data:
                    sFetchResult.length > 0
                        ? sFetchResult.map((aItem: any) => {
                              return [rawtoTimeUtcChart(aItem.TIME), aItem.VALUE];
                          })
                        : [],
                yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
            });
        }
    }

    data.sDisplayData = { datasets: sDatasets };
    sLoading.value = false;
    const sResult = sDatasets.find((aItem) => aItem.data.length === sLimit);
    if (sResult) {
        return true;
    }
};

const intializePanelData = async (aCustomRange?: startTimeToendTimeType, aViewPortRange?: startTimeToendTimeType) => {
    data.sIsLoading = true;

    try {
        const sValue = await getChartMinMaxData(props.panelInfo.tag_set[0].table, props.panelInfo.tag_set[0].tag_names);

        const sMaxIdx = sValue.data.columns.findIndex((aItem: string) => aItem === 'MAX_TIME');
        data.sMaxTime = sValue.data.rows[0][sMaxIdx];
        await fetchPanelData(props.panelInfo, aCustomRange);
    } catch (err) {}
    data.sIsLoading = false;
};
const onResetSquare = async (aParams: { min: number; max: number }) => {
    // sRatio
    const sRatio = 1 - ((aParams.max - aParams.min) * 100) / (data.sTimeRangeViewPort.endTime - data.sTimeRangeViewPort.startTime);

    await fetchViewPortData(props.panelInfo, {
        startTime: data.sTimeRangeViewPort.startTime + (aParams.min - data.sTimeRangeViewPort.startTime) * sRatio,
        endTime: data.sTimeRangeViewPort.endTime + (aParams.max - data.sTimeRangeViewPort.endTime) * sRatio,
    });
    if (data.sIsRaw) {
        await generateRawDataChart(props.panelInfo, {
            startTime: aParams.min,
            endTime: aParams.max,
        });
    } else {
        await fetchPanelData(props.panelInfo, {
            startTime: aParams.min,
            endTime: aParams.max,
        });
    }
};
const onReload = async () => {
    // data.sIsRaw = false;

    fetchPanelData(props.panelInfo);
    // await fetchViewPortData(props.panelInfo);
    // const { startTime, endTime } = getTimeReset({ startTime: data.sTimeRangeViewPort.startTime, endTime: data.sTimeRangeViewPort.endTime });
    // areaChart.value && areaChart.value.updateMinMaxChart(startTime, endTime);
};
const onChangeZoom = () => {
    if (props.panelInfo.tag_set.length === 0) return;
    sIsZoom.value = true;
};
const onChangeTimeRange = async (eValue: any) => {
    await areaChart.value.updateMinMaxNavigator(toTimeUtcChart(eValue.dateStart), toTimeUtcChart(eValue.dateEnd));
    areaChart.value.updateMinMaxChart(eValue.dateStart, eValue.dateEnd);
};
const onChangeSRF = async (eValue: any) => {
    switch (eValue) {
        case 0:
            data.sIsRaw = false;
            if (data.sTimeLine.endTime - data.sTimeLine.startTime < -1 * props.panelInfo.raw_chart_threshold) {
                await fetchViewPortData(props.panelInfo, {
                    startTime: data.sTimeLine.startTime,
                    endTime: data.sTimeLine.startTime + 10000,
                });
                const { startTime, endTime } = {
                    startTime: data.sTimeRangeViewPort.startTime - (data.sTimeRangeViewPort.endTime - data.sTimeRangeViewPort.startTime) * -0.25,
                    endTime: data.sTimeRangeViewPort.startTime - (data.sTimeRangeViewPort.endTime - data.sTimeRangeViewPort.startTime) * -0.75,
                };
                areaChart.value && areaChart.value.updateMinMaxChart(startTime, endTime);
                return;
            } else {
                await fetchPanelData(props.panelInfo, {
                    startTime: data.sTimeLine.startTime,
                    endTime: data.sTimeLine.endTime,
                });
                areaChart.value.updateMinMaxChart(data.sTimeLine.startTime, data.sTimeLine.endTime);
            }

            break;
        case 1:
            data.sIsRaw = true;

            await generateRawDataChart(props.panelInfo, {
                startTime: data.sTimeLine.startTime,
                endTime: data.sTimeLine.endTime,
            });

            await areaChart.value.chart.chart.xAxis[0].setExtremes(
                data.sDisplayData.datasets[0].data[0][0],
                data.sDisplayData.datasets[0].data[data.sDisplayData.datasets[0].data.length - 1][0]
            );
            break;
        default:
            break;
    }
};

const moveFocus = async (sType: string) => {
    if (areaChart.value.chart.chart.resetZoomButton) {
        areaChart.value.chart.chart.xAxis[0].setExtremes();
        areaChart.value.chart.chart.resetZoomButton.destroy();
        delete areaChart.value.chart.chart.resetZoomButton;
    }

    const sNano = data.sDataRange * 1000000000;
    if (sType === 'right') data.sMaxTime = data.sMaxTime + sNano / 2;
    else data.sMaxTime = data.sMaxTime - sNano / 2;
    fetchPanelData(props.panelInfo);
};
const adjustViewportRange = async (aEvent: { type: 'O' | 'I'; zoom: number }) => {
    if (areaChart.value.chart.chart.resetZoomButton) {
        areaChart.value.chart.chart.xAxis[0].setExtremes();
        areaChart.value.chart.chart.resetZoomButton.destroy();
        delete areaChart.value.chart.chart.resetZoomButton;
    }
    let sRangeValue;
    if (aEvent.type === 'O') sRangeValue = data.sDataRange / (aEvent.zoom * 10);
    else sRangeValue = data.sDataRange * (aEvent.zoom * 10);

    if (sRangeValue >= 10) data.sDataRange = 10;
    else if (sRangeValue <= 0.001) data.sDataRange = 0.001;
    else data.sDataRange = sRangeValue;

    fetchPanelData(props.panelInfo);
};
const OnFocus = async () => {
    let sBgn = data.sTimeLine.startTime;
    let sEnd = data.sTimeLine.endTime;
    let sTimeGap = sEnd - sBgn;
    let sNewTimeBgn = null;
    let sNewTimeEnd = null;
    sNewTimeBgn = sBgn - sTimeGap * -0.25;
    sNewTimeEnd = sEnd + sTimeGap * -0.25;

    await areaChart.value.updateMinMaxNavigator(sBgn, sEnd);
    await areaChart.value.updateMinMaxChart(sNewTimeBgn, sNewTimeEnd);
};
async function OnChangeTimeClick(params: any) {
    areaChart.value.updateMinMaxChart(params.min, params.max);
}
function OnChangeRaw(aStatus: boolean) {
    data.sIsRaw = aStatus;
}
const getTimeReset = (sTimeRange: TimeLineType) => {
    return {
        startTime: sTimeRange.startTime - (sTimeRange.endTime - sTimeRange.startTime) * -0.4,
        endTime: sTimeRange.startTime - (sTimeRange.endTime - sTimeRange.startTime) * -0.6,
    };
};
const onCloseNavigator = async () => {
    let { startTime, endTime } = await getDateRange(props.panelInfo, gBoard.value);
    let sStartTime = toTimeUtcChart(startTime);
    let sEndTime = toTimeUtcChart(endTime);
    areaChart.value.updateMinMaxChart(sStartTime, sEndTime);
    sIsZoom.value = false;
};
const OnUndoTime = () => {
    if (data.sUndo.length === 2) {
        areaChart.value.updateMinMaxChart(data.sUndo[0].startTime, data.sUndo[0].endTime);
    }
};

// Call when data of chart reDraw
async function OnChangeTimeRangerViewPort(params: any, aStatus?: string) {
    if (aStatus === 'expand') {
        if (data.sIsRaw) {
            const sLimit = await generateRawDataChart(props.panelInfo, {
                startTime: params.min,
                endTime: params.max,
            });
            if (sLimit) {
                if (params.max - params.min >= -1 * props.panelInfo.raw_chart_threshold) {
                    data.sIsRaw = false;
                    fetchPanelData(props.panelInfo, {
                        startTime: params.min,
                        endTime: params.max,
                    });
                } else {
                    areaChart.value.updateMinMaxChart(
                        data.sDisplayData.datasets[0].data[0][0],
                        data.sDisplayData.datasets[0].data[data.sDisplayData.datasets[0].data.length - 1][0],
                        true
                    );
                }
            }
        } else {
            await fetchPanelData(props.panelInfo, {
                startTime: params.min,
                endTime: params.max,
            });
        }
    } else {
        if (data.sIsRaw) {
            await generateRawDataChart(props.panelInfo, {
                startTime: params.min,
                endTime: params.max,
            });
        } else {
            await fetchPanelData(props.panelInfo, {
                startTime: params.min,
                endTime: params.max,
            });
        }
    }
    if (data.sDisplayData.datasets[0]?.data.length > 0) {
        const sTime = {
            startTime: data.sTimeLine.startTime,
            endTime: data.sTimeLine.endTime,
        };
        if (data.sUndo.length <= 1) {
            data.sUndo.push({
                startTime: data.sTimeLine.startTime,
                endTime: data.sTimeLine.endTime,
            });
        } else {
            if (data.sUndo.length === 2) {
                data.sUndo[0] = data.sUndo[1];
                data.sUndo[1] = sTime;
            }
        }
    }
}
// Call when data of navigator reDraw
async function OnChangeTimeRangerViewPortNavigator(params: any) {
    await fetchViewPortData(props.panelInfo, {
        startTime: params.min,
        endTime: params.max,
    });
}

watch(
    () => props.panelInfo.pixels_per_tick,
    () => {
        props.panelInfo.pixels_per_tick <= 0 ? (sInnerValue.sTickPixels = 1) : (sInnerValue.sTickPixels = props.panelInfo.pixels_per_tick);
    },
    {
        immediate: true,
    }
);
watch([() => props.panelInfo.interval_value], () => {
    data.sIntervalData.IntervalValue = props.panelInfo.interval_value;
    data.sIntervalData.IntervalType = props.panelInfo.interval_type;
});
watch([() => props.panelInfo.start_with_vport, () => props.panelInfo.tag_set], () => {
    if (props.panelInfo.tag_set.length === 0) {
        onCloseNavigator();
        return;
    }
    if (props.panelInfo.start_with_vport === 'Y') {
        onReload();
        sIsZoom.value = true;
    } else {
        onCloseNavigator();
    }
});
watch(
    [
        () => props.panelInfo.chart_title,
        () => props.panelInfo.chart_height,
        () => props.panelInfo.chart_width,
        () => props.panelInfo.use_detail,
        () => props.panelInfo.use_zoom,
        () => props.panelInfo.drilldown_zoom,
        () => props.panelInfo.use_normalize,
        () => props.panelInfo.raw_chart_threshold,
        () => props.panelInfo.range_end,
        () => props.panelInfo.range_bgn,
        () => props.panelInfo.refresh,
    ],
    () => {
        onReload();
    }
);

onMounted(() => {
    nextTick(() => {
        intializePanelData();
        // onReload();
    });
});

defineExpose({ onReload });
</script>

<style lang="scss" scoped>
@import 'index.scss';
.area-chart {
    display: flex;
    justify-content: center;
}
</style>
