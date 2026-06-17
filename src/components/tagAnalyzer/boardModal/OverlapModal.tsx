import {
    MdOutlineStackedLineChart,
    Refresh,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import ReactECharts from 'echarts-for-react';
import OverlapTimeShiftPanel from './OverlapTimeShiftPanel';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { OverlapPanelInfo } from '../domain/BoardDomain';
import {
    buildOverlapLoadState,
    hasOverlapPanelDraftChanged,
    mapOverlapRows,
    resolveOverlapTimeRange,
} from './OverlapComparisonUtils';
import {
    buildChartSeriesData,
    mapRowsToChartData,
    type ChartSeriesData,
    type OverlapLoadResult,
} from '../domain/ChartDomain';
import { calculateInterval, calculateSampleCount } from '../domain/time/interval/TimeIntervalUtils';
import { fetchCalculatedSeriesRows, fetchRawSeriesRows } from '../fetch/PanelSeriesDataRepository';
import type { RawFetchSampling } from '../fetch/FetchContracts';
import { buildOverlapChartOption, type OverlapChartInfo } from './OverlapChartOptionBuilder';
import { resolvePanelAxesForRuntime } from '../domain/PanelDomain';

const RAW_FETCH_SAMPLING_DISABLED: RawFetchSampling = { kind: 'disabled' };
const OVERLAP_CHART_SHIFT_FRACTION = 0.3;
const OVERLAP_CHART_CONTAINER_STYLE = { position: 'relative' } as const;
const OVERLAP_CHART_SIDE_CONTROLS_STYLE = {
    position: 'absolute',
    left: '6px',
    right: '6px',
    top: '50%',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'space-between',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
} as const;
const OVERLAP_CHART_SIDE_BUTTON_STYLE = {
    pointerEvents: 'auto',
} as const;

type RangeShiftDirection = -1 | 1;
type OverlapChartDataZoomState = {
    startValue?: number | string | Date;
    endValue?: number | string | Date;
};
type OverlapChartVisibleRange = {
    startTime: number;
    endTime: number;
};
type OverlapChartInstance = {
    dispatchAction: (action: {
        type: 'dataZoom';
        startValue: number;
        endValue: number;
    }) => void;
    getOption?: () => {
        dataZoom?: OverlapChartDataZoomState[];
    };
};

type OverlapModalProps = {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: OverlapPanelInfo[];
    pRollupTableList: string[];
};

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
// Future Refactor Target: this flow still re-implements pieces of the panel fetch pipeline.
function OverlapModal({
    pSetIsModal,
    pPanelsInfo,
    pRollupTableList,
}: OverlapModalProps): JSX.Element {
    const [sSeriesData, setSeriesData] = useState<ChartSeriesData[]>([]);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sOverlapChartInstanceRef = useRef<OverlapChartInstance | null>(null);
    const sHasLoadedInitialDataRef = useRef(false);
    const sInitialPanelStartByKeyRef = useRef<Map<string, number> | null>(null);
    const [sStartTimeList, setStartTimeList] = useState<number[]>([]);
    const [sAppliedPanelsInfo, setAppliedPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);
    const [sDraftPanelsInfo, setDraftPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);

    if (sInitialPanelStartByKeyRef.current === null) {
        sInitialPanelStartByKeyRef.current = createInitialPanelStartByKey(pPanelsInfo);
    }

    const sInitialPanelStartByKey = sInitialPanelStartByKeyRef.current;

    const fetchOverlapPanelData = async function fetchOverlapPanelData(
        panelInfo: OverlapPanelInfo,
        anchorPanel: OverlapPanelInfo,
    ): Promise<OverlapLoadResult> {
        const sChartWidth = sAreaChart.current?.clientWidth ? sAreaChart.current.clientWidth : 1;
        const sPanelBoardAxes = resolvePanelAxesForRuntime(panelInfo.board.axes);
        const sCount = calculateSampleCount(
            panelInfo.board.data.count ?? -1,
            panelInfo.isRaw,
            sPanelBoardAxes.x_axis.calculated_data_pixels_per_tick,
            sPanelBoardAxes.x_axis.raw_data_pixels_per_tick,
            sChartWidth,
        );
        const sTagSet = panelInfo.board.data.tag_set;
        if (sTagSet.length === 0) {
            return {
                originTime: undefined,
                chartSeries: undefined,
                emptySeriesLabel: undefined,
            };
        }

        const sTimeRange = resolveOverlapTimeRange(panelInfo, anchorPanel.duration);
        const sPanelAxes = resolvePanelAxesForRuntime(anchorPanel.board.axes);
        const sIntervalTime = calculateInterval(
            sTimeRange.startTime,
            sTimeRange.endTime,
            sChartWidth,
            panelInfo.isRaw,
            Number(sPanelAxes.x_axis.calculated_data_pixels_per_tick),
            Number(sPanelAxes.x_axis.raw_data_pixels_per_tick),
            undefined,
        );

        const sTagSetElement = sTagSet[0];
        const sFetchTimeRange = {
            startTime: Math.round(sTimeRange.startTime),
            endTime: Math.round(sTimeRange.endTime),
        };
        const sFetchResult = panelInfo.isRaw
            ? await fetchRawSeriesRows(
                  sTagSetElement,
                  sFetchTimeRange,
                  sIntervalTime,
                  sCount,
                  RAW_FETCH_SAMPLING_DISABLED,
                  panelInfo.board.general.is_order_by,
              )
            : await fetchCalculatedSeriesRows(
                  sTagSetElement,
                  sFetchTimeRange,
                  sIntervalTime,
                  sCount,
                  pRollupTableList,
              );

        const sSeriesStartTime = panelInfo.start;
        const sChartRows = mapRowsToChartData(sFetchResult.data?.rows);
        const sDisplayRows = panelInfo.isRaw
            ? sChartRows
            : clampChartRowsToTimeRange(sChartRows, sTimeRange);

        const sOverlapRows = mapOverlapRows(
            sDisplayRows,
            sSeriesStartTime,
        );

        return {
            originTime: sSeriesStartTime,
            chartSeries: buildChartSeriesData(sTagSetElement, sOverlapRows, panelInfo.isRaw, false),
            emptySeriesLabel: undefined,
        };
    };
    const loadOverlapData = async function loadOverlapData(
        panelsInfo: OverlapPanelInfo[],
    ): Promise<void> {
        if (!panelsInfo.length) return;

        const sAnchorPanel = panelsInfo[0];
        const sLoadResults = await Promise.all(
            panelsInfo.map((panelInfo) => fetchOverlapPanelData(panelInfo, sAnchorPanel)),
        );
        const sLoadState = buildOverlapLoadState(sLoadResults);

        setStartTimeList(sLoadState.startTimes);
        setSeriesData(sLoadState.chartSeries);
    };
    const setPanelShiftOffset = function setPanelShiftOffset(
        panelKey: string,
        offsetMs: number,
    ): void {
        if (!Number.isFinite(offsetMs)) {
            throw new Error('Overlap shift offset must be a finite number of milliseconds.');
        }

        const sInitialStart = getInitialPanelStart(sInitialPanelStartByKey, panelKey);
        const sNextStart = sInitialStart + offsetMs;

        setDraftPanelsInfo((currentPanelsInfo) => {
            let sDidUpdatePanel = false;
            const sNextPanelsInfo = currentPanelsInfo.map((panelInfo) => {
                if (panelInfo.board.data.index_key !== panelKey) {
                    return panelInfo;
                }

                sDidUpdatePanel = true;

                return panelInfo.start === sNextStart
                    ? panelInfo
                    : {
                          ...panelInfo,
                          start: sNextStart,
                      };
            });

            if (!sDidUpdatePanel) {
                throw new Error(`Cannot shift missing overlap panel: ${panelKey}`);
            }

            return sNextPanelsInfo;
        });
    };
    const applyDraftPanelTime = function applyDraftPanelTime(): void {
        if (!hasOverlapPanelDraftChanged(sAppliedPanelsInfo, sDraftPanelsInfo)) {
            return;
        }

        setStartTimeList([]);
        setSeriesData([]);
        setAppliedPanelsInfo(sDraftPanelsInfo);
        void loadOverlapData(sDraftPanelsInfo);
    };
    const handleAreaChartRef = (element: HTMLDivElement | null): void => {
        sAreaChart.current = element;
        if (!element || sHasLoadedInitialDataRef.current) {
            return;
        }

        sHasLoadedInitialDataRef.current = true;
        void loadOverlapData(sAppliedPanelsInfo);
    };
    const handleOverlapChartReady = function handleOverlapChartReady(
        instance: unknown,
    ): void {
        sOverlapChartInstanceRef.current = instance as OverlapChartInstance;
    };
    const shiftOverlapChart = function shiftOverlapChart(
        direction: RangeShiftDirection,
    ): void {
        const sVisibleRange = getCurrentOverlapChartVisibleRange(
            sOverlapChartInstanceRef.current,
            sSeriesData,
        );

        if (!sVisibleRange) {
            return;
        }

        const sVisibleRangeWidth =
            sVisibleRange.endTime - sVisibleRange.startTime;
        if (sVisibleRangeWidth <= 0) {
            return;
        }

        const sOffset =
            sVisibleRangeWidth * OVERLAP_CHART_SHIFT_FRACTION * direction;

        sOverlapChartInstanceRef.current?.dispatchAction({
            type: 'dataZoom',
            startValue: sVisibleRange.startTime + sOffset,
            endValue: sVisibleRange.endTime + sOffset,
        });
    };
    function renderOverlapTimeShiftPanel(item: OverlapPanelInfo, idx: number): JSX.Element {
        const sFirstTag = item.board.data.tag_set[0];
        const sFirstTagLabel = sFirstTag?.alias || sFirstTag?.sourceTagName || '';
        const sPanelKey = item.board.data.index_key;
        const sShiftOffsetMs = item.start - getInitialPanelStart(
            sInitialPanelStartByKey,
            sPanelKey,
        );

        return (
            <OverlapTimeShiftPanel
                pColorIndex={idx}
                key={sPanelKey}
                pLabel={sFirstTagLabel}
                pStart={item.start}
                pDuration={sAnchorPanel.duration}
                pShiftOffsetMs={sShiftOffsetMs}
                pOnSetShiftOffset={(offsetMs: number) =>
                    setPanelShiftOffset(sPanelKey, offsetMs)
                }
            />
        );
    }

    const sAnchorPanel = sDraftPanelsInfo[0];
    const sAppliedAnchorPanel = sAppliedPanelsInfo[0];
    const sCanRenderChart = Boolean(
        sAppliedAnchorPanel && sSeriesData[sAppliedPanelsInfo.length - 1],
    );
    const sHasDraftChanges = hasOverlapPanelDraftChanged(sAppliedPanelsInfo, sDraftPanelsInfo);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;
    const sOverlapChartInfo = useMemo<OverlapChartInfo>(
        () => ({
            seriesData: sSeriesData,
            seriesStartTimeList: sStartTimeList,
            includeZeroInYAxisRange: sAppliedAnchorPanel?.board.axes.left_y_axis.zero_base ?? false,
        }),
        [sAppliedAnchorPanel?.board.axes.left_y_axis.zero_base, sSeriesData, sStartTimeList],
    );

    return (
        <Modal.Root
            isOpen={true}
            onClose={() => pSetIsModal(false)}
            size="lg"
            style={{ height: 'auto', maxHeight: '80vh' }}
        >
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
                        onClick={() => void loadOverlapData(sAppliedPanelsInfo)}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div ref={handleAreaChartRef}>
                        <div style={OVERLAP_CHART_CONTAINER_STYLE}>
                            {sCanRenderChart && (
                                <>
                                    <ReactECharts
                                        option={buildOverlapChartOption(sOverlapChartInfo)}
                                        notMerge
                                        lazyUpdate
                                        onChartReady={handleOverlapChartReady}
                                        style={{
                                            width: sChartWidth ? `${sChartWidth - 10}px` : '100%',
                                            height: 300,
                                        }}
                                        opts={{ renderer: 'canvas' }}
                                    />
                                    <div style={OVERLAP_CHART_SIDE_CONTROLS_STYLE}>
                                        <Button
                                            variant="secondary"
                                            size="xsm"
                                            icon={<VscChevronLeft size={16} />}
                                            disabled={!sCanRenderChart}
                                            onClick={() => shiftOverlapChart(-1)}
                                            isToolTip
                                            toolTipContent="Shift overlap chart left"
                                            aria-label="Shift overlap chart left"
                                            style={OVERLAP_CHART_SIDE_BUTTON_STYLE}
                                        />
                                        <Button
                                            variant="secondary"
                                            size="xsm"
                                            icon={<VscChevronRight size={16} />}
                                            disabled={!sCanRenderChart}
                                            onClick={() => shiftOverlapChart(1)}
                                            isToolTip
                                            toolTipContent="Shift overlap chart right"
                                            aria-label="Shift overlap chart right"
                                            style={OVERLAP_CHART_SIDE_BUTTON_STYLE}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        {sDraftPanelsInfo.map(renderOverlapTimeShiftPanel)}
                    </div>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer>
                <div
                    title={sHasDraftChanges ? 'Apply overlap time changes' : 'Nothing to update'}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                    }}
                >
                    <Button
                        variant="primary"
                        size="sm"
                        disabled={!sHasDraftChanges}
                        onClick={applyDraftPanelTime}
                    >
                        Apply
                    </Button>
                    {sHasDraftChanges && (
                        <span
                            style={{
                                color: '#fdb532',
                                fontSize: '11px',
                                lineHeight: '14px',
                            }}
                        >
                            Update has not been applied.
                        </span>
                    )}
                </div>
                <Modal.Cancel />
            </Modal.Footer>
        </Modal.Root>
    );
}

function createInitialPanelStartByKey(panelsInfo: OverlapPanelInfo[]): Map<string, number> {
    const sPanelStartByKey = new Map<string, number>();

    panelsInfo.forEach((panelInfo) => {
        const sPanelKey = panelInfo.board.data.index_key;

        if (sPanelStartByKey.has(sPanelKey)) {
            throw new Error(`Duplicate overlap panel key: ${sPanelKey}`);
        }

        sPanelStartByKey.set(sPanelKey, panelInfo.start);
    });

    return sPanelStartByKey;
}

function getInitialPanelStart(
    panelStartByKey: Map<string, number>,
    panelKey: string,
): number {
    const sInitialPanelStart = panelStartByKey.get(panelKey);

    if (sInitialPanelStart === undefined) {
        throw new Error(`Cannot find initial start for overlap panel: ${panelKey}`);
    }

    return sInitialPanelStart;
}

function getCurrentOverlapChartVisibleRange(
    chartInstance: OverlapChartInstance | null,
    seriesData: ChartSeriesData[],
): OverlapChartVisibleRange | undefined {
    const sDataZoomState = chartInstance?.getOption?.()?.dataZoom?.[0];
    const sStartTime = getFiniteChartRangeValue(sDataZoomState?.startValue);
    const sEndTime = getFiniteChartRangeValue(sDataZoomState?.endValue);

    if (
        sStartTime !== undefined &&
        sEndTime !== undefined &&
        sEndTime > sStartTime
    ) {
        return {
            startTime: sStartTime,
            endTime: sEndTime,
        };
    }

    return getOverlapSeriesDataRange(seriesData);
}

function getOverlapSeriesDataRange(
    seriesData: ChartSeriesData[],
): OverlapChartVisibleRange | undefined {
    const sTimestamps = seriesData.flatMap((series) =>
        series.data.map(([timestamp]) => timestamp),
    );

    if (sTimestamps.length === 0) {
        return undefined;
    }

    const sStartTime = Math.min(...sTimestamps);
    const sEndTime = Math.max(...sTimestamps);

    if (!Number.isFinite(sStartTime) || !Number.isFinite(sEndTime)) {
        return undefined;
    }

    if (sEndTime <= sStartTime) {
        return undefined;
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}

function getFiniteChartRangeValue(
    value: number | string | Date | undefined,
): number | undefined {
    const sValue = value instanceof Date ? value.getTime() : Number(value);

    return Number.isFinite(sValue) ? sValue : undefined;
}

function clampChartRowsToTimeRange(
    rows: ChartSeriesData['data'],
    timeRange: OverlapChartVisibleRange,
): ChartSeriesData['data'] {
    return rows.map(([timestamp, value]) => [
        Math.min(Math.max(timestamp, timeRange.startTime), timeRange.endTime),
        value,
    ]);
}

export default OverlapModal;
