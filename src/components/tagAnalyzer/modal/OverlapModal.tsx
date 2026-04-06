import { MdOutlineStackedLineChart, Refresh } from '@/assets/icons/Icon';
import { useEffect, useState, useRef } from 'react';
import OverlapChart from './OverlapChart';
import { isRollup } from '@/utils';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import OverlapButtonList from '../edit/OverlapButtonList';
import HighchartsReact from 'highcharts-react-official';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerOverlapPanelInfo } from '../panel/TagAnalyzerPanelModelTypes';
import { calcInterval, getInterval } from '../TagAnalyzerUtil';

type OverlapModalProps = {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: TagAnalyzerOverlapPanelInfo[];
};

type OverlapShiftDirection = '+' | '-';

const getAlignedTime = (aTime: number, aInterval: { IntervalType: string; IntervalValue: number }) => {
    let sTimeUnit = 1000;
    if (aInterval.IntervalType === 'sec') {
        sTimeUnit = 1000 * aInterval.IntervalValue;
    } else if (aInterval.IntervalType === 'min') {
        sTimeUnit = 1000 * 60 * aInterval.IntervalValue;
    } else if (aInterval.IntervalType === 'hour') {
        sTimeUnit = 1000 * 60 * 60 * aInterval.IntervalValue;
    } else if (aInterval.IntervalType === 'day') {
        sTimeUnit = 1000 * 3600 * 24 * aInterval.IntervalValue;
    }

    return Math.floor(aTime / sTimeUnit) * sTimeUnit;
};

const calculateOverlapSampleCount = (aLimit: number, aPanelInfo: any, aChartWidth: number) => {
    if (aLimit >= 0) return -1;

    if (aPanelInfo.isRaw) {
        return aPanelInfo.board.axes.pixels_per_tick_raw > 0
            ? Math.ceil(aChartWidth / aPanelInfo.board.axes.pixels_per_tick_raw)
            : Math.ceil(aChartWidth);
    }

    return aPanelInfo.board.axes.pixels_per_tick > 0 ? Math.ceil(aChartWidth / aPanelInfo.board.axes.pixels_per_tick) : Math.ceil(aChartWidth);
};

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
const OverlapModal = ({ pSetIsModal, pPanelsInfo }: OverlapModalProps) => {
    const [sChartData, setChartData] = useState<any>([]);
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<HighchartsReact.RefObject>(null);
    const [sStartTimeList, setStartTimeList] = useState<any>([]);
    const [sPanelsInfo, setPanelsInfo] = useState<any>([]);

    const sRollupTableList = useRecoilValue(gRollupTableList);

    const fetchOverlapPanelData = async (aPanelInfo: any, sStart: string) => {
        const sChartWidth = sAreaChart.current.clientWidth === 0 ? 1 : sAreaChart.current.clientWidth;
        const sLimit = aPanelInfo?.board ? aPanelInfo.board.data.count : -1;
        const sCount = calculateOverlapSampleCount(sLimit, aPanelInfo, sChartWidth);
        const sTagSet = aPanelInfo.board.data.tag_set || [];
        if (sTagSet.length === 0) {
            return {
                startTime: undefined,
                chartSeries: undefined,
            };
        }

        const sTimeRange: any = {
            startTime: aPanelInfo.start as string,
            endTime: (aPanelInfo.start + (sStart ? pPanelsInfo[0].duration : sPanelsInfo[0].duration)) as string,
        };

        const sPanelAxes = (sStart ? pPanelsInfo[0].board : sPanelsInfo[0].board).axes;
        const sIntervalTime = calcInterval(
            sTimeRange.startTime,
            sTimeRange.endTime,
            sChartWidth,
            aPanelInfo.isRaw,
            Number(sPanelAxes.pixels_per_tick),
            Number(sPanelAxes.pixels_per_tick_raw),
        );

        const sTagSetElement = sTagSet[0];
        let sFetchResult: any = [];
        if (aPanelInfo.isRaw) {
            sFetchResult = await fetchRawData({
                Table: sTagSetElement.table,
                TagNames: sTagSetElement.tagName,
                Start: Math.round(sTimeRange.startTime),
                End: Math.round(sTimeRange.endTime),
                Rollup: sTagSetElement.onRollup,
                CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                ...sIntervalTime,
                colName: sTagSetElement.colName,
                Count: sCount,
            });
        } else {
            sFetchResult = await fetchCalculationData({
                Table: sTagSetElement.table,
                TagNames: sTagSetElement.tagName,
                Start: getAlignedTime(Math.round(sTimeRange.startTime), sIntervalTime),
                End: getAlignedTime(Math.round(sTimeRange.endTime), sIntervalTime),
                Rollup: isRollup(sRollupTableList, sTagSetElement.table, getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue), sTagSetElement.colName.value),
                CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                ...sIntervalTime,
                colName: sTagSetElement.colName,
                Count: sCount,
                RollupList: sRollupTableList,
            });
        }

        const sSeriesStartTime = aPanelInfo.isRaw ? aPanelInfo.start : getAlignedTime(Math.round(sTimeRange.startTime), sIntervalTime);

        return {
            startTime: sSeriesStartTime,
            chartSeries: {
                name: sTagSetElement.alias || `${sTagSetElement.tagName}(${aPanelInfo.IsRaw ? 'raw' : sTagSetElement.calculationMode.toLowerCase()})`,
                data:
                    sFetchResult?.data?.rows?.length > 0
                        ? sFetchResult.data.rows.map((aItem: any) => {
                              return [aItem[0] - sSeriesStartTime, aItem[1]];
                          })
                        : [],
                yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
            },
        };
    };

    const shiftPanelTime = (aPanelKey: string, aType: OverlapShiftDirection, aRange: number) => {
        setStartTimeList([]);
        setPanelsInfo((aPrev: any) =>
            aPrev.map((aItem: any) => {
                return aPanelKey === aItem.board.meta.index_key ? { ...aItem, start: aType === '+' ? aItem.start + aRange : aItem.start - aRange } : aItem;
            })
        );
        loadOverlapData(
            '',
            sPanelsInfo.map((aItem: any) => {
                return aPanelKey === aItem.board.meta.index_key ? { ...aItem, start: aType === '+' ? aItem.start + aRange : aItem.start - aRange } : aItem;
            })
        );
    };

    const loadOverlapData = async (aStart?: any, aPanelsInfo?: any) => {
        const sTargetPanels = aStart ? pPanelsInfo : aPanelsInfo;
        if (!sTargetPanels) return;

        const sChartSeriesList = [];
        const sStartTimes = [];
        for (let i = 0; i < pPanelsInfo.length; i++) {
            const sData = await fetchOverlapPanelData(sTargetPanels[i], aStart);
            if (typeof sData.startTime === 'number') sStartTimes.push(sData.startTime);
            if (sData.chartSeries) sChartSeriesList.push(sData.chartSeries);
        }

        setStartTimeList(sStartTimes);
        setChartData(sChartSeriesList);
    };

    useEffect(() => {
        setPanelsInfo(pPanelsInfo);

        loadOverlapData('start');
    }, []);

    const handleRefresh = () => {
        if (sChartRef.current) loadOverlapData('true');
    };

    return (
        <Modal.Root isOpen={true} onClose={() => pSetIsModal(false)} size="lg" style={{ height: 'auto', maxHeight: '80vh' }}>
            <Modal.Header>
                <Modal.Title>
                    <MdOutlineStackedLineChart size={16} />
                    <span>Overlap Chart</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Page.ContentBlock pHoverNone>
                    <Button
                        variant="secondary"
                        size="xsm"
                        icon={<Refresh size={12} />}
                        onClick={() => handleRefresh()}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div ref={sAreaChart}>
                        {sPanelsInfo[0] && sChartData[sPanelsInfo.length - 1] && (
                            <OverlapChart
                                pChartModel={{
                                    chartData: sChartData,
                                    startTimeList: sStartTimeList,
                                    zeroBase: sPanelsInfo[0].board.axes.zero_base,
                                }}
                                pChartRefs={{
                                    areaChart: sAreaChart,
                                    chartRef: sChartRef,
                                }}
                            />
                        )}
                        {sPanelsInfo.map((aItem: any, aIdx: number) => {
                            const sFirstTag = aItem.board.data.tag_set[0];
                            return (
                                <OverlapButtonList
                                    pColorIndex={aIdx}
                                    key={aItem.board.meta.index_key}
                                    pLabel={sFirstTag.alias ? sFirstTag.alias : sFirstTag.tagName}
                                    pStart={aItem.start}
                                    pDuration={sPanelsInfo[0].duration}
                                    pOnShiftTime={(aDirection, aRange) => shiftPanelTime(aItem.board.meta.index_key, aDirection, aRange)}
                                />
                            );
                        })}
                    </div>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel />
            </Modal.Footer>
        </Modal.Root>
    );
};
export default OverlapModal;
