import { MdOutlineStackedLineChart, Refresh } from '@/assets/icons/Icon';
import { useCallback, useEffect, useRef, useState } from 'react';
import OverlapChart from './OverlapChart';
import { isRollup } from '@/utils';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import OverlapTimeShiftControls from '../editor/OverlapTimeShiftControls';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerChartSeriesItem, TagAnalyzerOverlapPanelInfo } from '../panel/TagAnalyzerPanelModelTypes';
import { calculateInterval, getIntervalMs } from '../TagAnalyzerUtils';
import { getSourceTagName } from '../TagAnalyzerSeriesNaming';
import {
    alignOverlapTime,
    buildOverlapChartSeries,
    calculateOverlapSampleCount,
    resolveOverlapTimeRange,
} from './OverlapModalUtils';

type OverlapShiftDirection = '+' | '-';
type OverlapFetchResponse = {
    data?: {
        rows?: Array<[number, number]>;
    };
};

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
// Future Refactor Target: this flow still re-implements pieces of the panel fetch pipeline.
const OverlapModal = ({
    pSetIsModal,
    pPanelsInfo,
}: {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: TagAnalyzerOverlapPanelInfo[];
}) => {
    const [sChartData, setChartData] = useState<TagAnalyzerChartSeriesItem[]>([]);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<unknown>(null);
    const [sStartTimeList, setStartTimeList] = useState<number[]>([]);
    const [sPanelsInfo, setPanelsInfo] = useState<TagAnalyzerOverlapPanelInfo[]>([]);

    const sRollupTableList = useRecoilValue(gRollupTableList);

    const fetchOverlapPanelData = useCallback(async (aPanelInfo: TagAnalyzerOverlapPanelInfo, aAnchorPanel: TagAnalyzerOverlapPanelInfo) => {
        const sChartWidth = sAreaChart.current.clientWidth === 0 ? 1 : sAreaChart.current.clientWidth;
        const sLimit = aPanelInfo.board.data.count ?? -1;
        const sCount = calculateOverlapSampleCount(sLimit, aPanelInfo, sChartWidth);
        const sTagSet = aPanelInfo.board.data.tag_set;
        if (sTagSet.length === 0) {
            return {
                startTime: undefined,
                chartSeries: undefined,
            };
        }

        const sTimeRange = resolveOverlapTimeRange(aPanelInfo, aAnchorPanel.duration);
        const sPanelAxes = aAnchorPanel.board.axes;
        const sIntervalTime = calculateInterval(
            sTimeRange.startTime,
            sTimeRange.endTime,
            sChartWidth,
            aPanelInfo.isRaw,
            Number(sPanelAxes.pixels_per_tick),
            Number(sPanelAxes.pixels_per_tick_raw),
        );

        const sTagSetElement = sTagSet[0];
        let sFetchResult: OverlapFetchResponse = {};
        if (aPanelInfo.isRaw) {
            sFetchResult = await fetchRawData({
                Table: sTagSetElement.table,
                TagNames: getSourceTagName(sTagSetElement),
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
                TagNames: getSourceTagName(sTagSetElement),
                Start: alignOverlapTime(Math.round(sTimeRange.startTime), sIntervalTime),
                End: alignOverlapTime(Math.round(sTimeRange.endTime), sIntervalTime),
                Rollup: isRollup(sRollupTableList, sTagSetElement.table, getIntervalMs(sIntervalTime.IntervalType, sIntervalTime.IntervalValue), sTagSetElement.colName.value),
                CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                ...sIntervalTime,
                colName: sTagSetElement.colName,
                Count: sCount,
                RollupList: sRollupTableList,
            });
        }

        const sSeriesStartTime = aPanelInfo.isRaw ? aPanelInfo.start : alignOverlapTime(Math.round(sTimeRange.startTime), sIntervalTime);

        return {
            startTime: sSeriesStartTime,
            chartSeries: buildOverlapChartSeries({
                tagItem: sTagSetElement,
                rows: sFetchResult.data?.rows,
                seriesStartTime: sSeriesStartTime,
                isRaw: aPanelInfo.isRaw,
            }),
        };
    }, [sRollupTableList]);

    const loadOverlapData = useCallback(async (aPanelsInfo: TagAnalyzerOverlapPanelInfo[]) => {
        if (!aPanelsInfo.length) return;

        const sAnchorPanel = aPanelsInfo[0];
        const sChartSeriesList: TagAnalyzerChartSeriesItem[] = [];
        const sStartTimes: number[] = [];
        for (let i = 0; i < aPanelsInfo.length; i++) {
            const sData = await fetchOverlapPanelData(aPanelsInfo[i], sAnchorPanel);
            if (typeof sData.startTime === 'number') sStartTimes.push(sData.startTime);
            if (sData.chartSeries) sChartSeriesList.push(sData.chartSeries);
        }

        setStartTimeList(sStartTimes);
        setChartData(sChartSeriesList);
    }, [fetchOverlapPanelData]);

    const shiftPanelTime = useCallback((aPanelKey: string, aType: OverlapShiftDirection, aRange: number) => {
        setStartTimeList([]);
        setPanelsInfo((aPrev) => {
            const sNextPanels = aPrev.map((aItem) => {
                return aPanelKey === aItem.board.meta.index_key ? { ...aItem, start: aType === '+' ? aItem.start + aRange : aItem.start - aRange } : aItem;
            });

            void loadOverlapData(sNextPanels);
            return sNextPanels;
        });
    }, [loadOverlapData]);

    useEffect(() => {
        setPanelsInfo(pPanelsInfo);
        void loadOverlapData(pPanelsInfo);
    }, [loadOverlapData, pPanelsInfo]);

    const handleRefresh = () => {
        if (sChartRef.current) {
            void loadOverlapData(sPanelsInfo);
        }
    };

    const sAnchorPanel = sPanelsInfo[0];
    const sCanRenderChart = Boolean(sAnchorPanel && sChartData[sPanelsInfo.length - 1]);

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
                        {sCanRenderChart && (
                            <OverlapChart
                                pChartState={{
                                    chartData: sChartData,
                                    startTimeList: sStartTimeList,
                                    zeroBase: sAnchorPanel.board.axes.zero_base,
                                }}
                                pChartRefs={{
                                    areaChart: sAreaChart,
                                    chartRef: sChartRef,
                                }}
                            />
                        )}
                        {sPanelsInfo.map((aItem: TagAnalyzerOverlapPanelInfo, aIdx: number) => {
                            const sFirstTag = aItem.board.data.tag_set[0];
                            return (
                                <OverlapTimeShiftControls
                                    pColorIndex={aIdx}
                                    key={aItem.board.meta.index_key}
                                    pLabel={sFirstTag.alias ? sFirstTag.alias : getSourceTagName(sFirstTag)}
                                    pStart={aItem.start}
                                    pDuration={sAnchorPanel.duration}
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
