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
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import type { OverlapPanelInfo } from '../domain/BoardDomain';
import {
    alignOverlapTime,
    buildOverlapLoadState,
    hasOverlapPanelDraftChanged,
    mapOverlapRows,
    resolveOverlapTimeRange,
} from './OverlapComparisonUtils';
import {
    buildChartSeriesData,
    type ChartRow,
    mapRowsToChartData,
    type ChartSeriesData,
    type OverlapLoadResult,
} from '../domain/ChartDomain';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
} from '../domain/time/TimeIntervalUtils';
import { fetchCalculatedSeriesRows, fetchRawSeriesRows } from '../fetch/PanelSeriesDataRepository';
import type { RawFetchSampling } from '../fetch/FetchContracts';
import { buildOverlapChartOption, type OverlapChartInfo } from './OverlapChartOptionBuilder';
import { resolvePanelAxesForRuntime } from '../domain/PanelDomain';
import type { IntervalOption, TimeRangeMs } from '../domain/time/TimeTypes';
import { createTimeRangeMs } from '../domain/time/TimeRangeUtils';

const RAW_FETCH_SAMPLING_DISABLED: RawFetchSampling = { kind: 'disabled' };
const EMPTY_OVERLAP_DATA_STATUS_STYLE = {
    margin: '8px 0',
    padding: '8px 10px',
    border: '1px solid rgba(253, 181, 50, 0.35)',
    borderRadius: '4px',
    background: 'rgba(253, 181, 50, 0.08)',
    color: '#fdb532',
    fontSize: '11px',
    lineHeight: '16px',
} as const;
const OVERLAP_TOOLBAR_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
} as const;
const OVERLAP_INTERVAL_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: '11px',
    lineHeight: '16px',
} as const;
const OVERLAP_TOOLBAR_BUTTON_ICON_STYLE = {
    width: '18px',
    height: '18px',
} as const;
const OVERLAP_SHIFT_FRACTION = 0.3;
const OVERLAP_ZOOM_IN_FACTOR = 0.7;
const OVERLAP_ZOOM_OUT_FACTOR = 1.4;

type OverlapModalProps = {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: OverlapPanelInfo[];
    pRollupTableList: string[];
};

enum OverlapAlignmentMode {
    PRESERVE_OFFSET = 'PRESERVE_OFFSET',
    ALIGN_START = 'ALIGN_START',
}

type OverlapPanelFetchPlan = {
    panelInfo: OverlapPanelInfo;
    timeRange: TimeRangeMs;
    interval: IntervalOption;
    count: number;
};

type OverlapChartDataZoomState = {
    startValue?: number | string | Date;
    endValue?: number | string | Date;
};

type OverlapChartInstance = {
    dispatchAction: (action: { type: 'dataZoom'; startValue: number; endValue: number }) => void;
    getOption?: () => {
        dataZoom?: OverlapChartDataZoomState[];
    };
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
    const [sOriginTimeList, setOriginTimeList] = useState<number[]>([]);
    const [sEmptySeriesLabels, setEmptySeriesLabels] = useState<string[]>([]);
    const [sSharedFetchInterval, setSharedFetchInterval] = useState<IntervalOption | undefined>();
    const [sAlignmentMode, setAlignmentMode] = useState<OverlapAlignmentMode>(
        OverlapAlignmentMode.ALIGN_START,
    );
    const [sAppliedPanelsInfo, setAppliedPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);
    const [sDraftPanelsInfo, setDraftPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);

    if (sInitialPanelStartByKeyRef.current === null) {
        sInitialPanelStartByKeyRef.current = createInitialPanelStartByKey(pPanelsInfo);
    }

    const sInitialPanelStartByKey = sInitialPanelStartByKeyRef.current;
    const getCurrentChartWidth = function getCurrentChartWidth(): number {
        return sAreaChart.current?.clientWidth ?? 1;
    };

    const fetchOverlapPanelData = async function fetchOverlapPanelData(
        fetchPlan: OverlapPanelFetchPlan,
        anchorPanel: OverlapPanelInfo,
        sharedInterval: IntervalOption,
        alignmentMode: OverlapAlignmentMode,
    ): Promise<OverlapLoadResult> {
        const { panelInfo, timeRange, count } = fetchPlan;
        const sTagSet = panelInfo.board.data.tag_set;
        if (sTagSet.length === 0) {
            return {
                originTime: undefined,
                chartSeries: undefined,
                emptySeriesLabel: getOverlapPanelLabel(panelInfo),
            };
        }

        const sTagSetElement = sTagSet[0];
        const sFetchTimeRange = panelInfo.isRaw
            ? {
                  startTime: Math.round(timeRange.startTime),
                  endTime: Math.round(timeRange.endTime),
              }
            : {
                  startTime: alignOverlapTime(Math.round(timeRange.startTime), sharedInterval),
                  endTime: alignOverlapTime(Math.round(timeRange.endTime), sharedInterval),
              };
        const sFetchResult = panelInfo.isRaw
            ? await fetchRawSeriesRows(
                  sTagSetElement,
                  sFetchTimeRange,
                  sharedInterval,
                  count,
                  RAW_FETCH_SAMPLING_DISABLED,
                  panelInfo.board.general.is_order_by,
              )
            : await fetchCalculatedSeriesRows(
                  sTagSetElement,
                  sFetchTimeRange,
                  sharedInterval,
                  count,
                  pRollupTableList,
              );

        const sOriginTime = getOverlapMappingOrigin(
            panelInfo,
            anchorPanel,
            sFetchTimeRange.startTime,
            alignmentMode,
        );

        const sChartRows = mapRowsToChartData(sFetchResult.data?.rows);
        const sOverlapRows = mapOverlapRows(sChartRows, sOriginTime);
        const sChartSeries = buildChartSeriesData(
            sTagSetElement,
            sOverlapRows,
            panelInfo.isRaw,
            false,
        );

        return {
            originTime: sOriginTime,
            chartSeries: sChartSeries,
            emptySeriesLabel: hasVisibleOverlapRows(sOverlapRows)
                ? undefined
                : sChartSeries.name,
        };
    };
    const loadOverlapData = async function loadOverlapData(
        panelsInfo: OverlapPanelInfo[],
        alignmentMode: OverlapAlignmentMode = sAlignmentMode,
    ): Promise<void> {
        if (!panelsInfo.length) return;

        const sAnchorPanel = panelsInfo[0];
        const sComparisonDuration = getSmallestOverlapDuration(panelsInfo);
        const sFetchPlans = panelsInfo.map((panelInfo) =>
            createOverlapPanelFetchPlan(
                panelInfo,
                sComparisonDuration,
                getCurrentChartWidth(),
            ),
        );
        const sSharedInterval = getSmallestOverlapInterval(sFetchPlans);
        setSharedFetchInterval(sSharedInterval);
        const sLoadResults = await Promise.all(
            sFetchPlans.map((fetchPlan) =>
                fetchOverlapPanelData(
                    fetchPlan,
                    sAnchorPanel,
                    sSharedInterval,
                    alignmentMode,
                ),
            ),
        );
        const sLoadState = buildOverlapLoadState(sLoadResults);

        setOriginTimeList(sLoadState.originTimes);
        setSeriesData(sLoadState.chartSeries);
        setEmptySeriesLabels(sLoadState.emptySeriesLabels);
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
    const toggleAlignmentMode = function toggleAlignmentMode(): void {
        const sNextAlignmentMode =
            sAlignmentMode === OverlapAlignmentMode.ALIGN_START
                ? OverlapAlignmentMode.PRESERVE_OFFSET
                : OverlapAlignmentMode.ALIGN_START;

        setAlignmentMode(sNextAlignmentMode);
        setOriginTimeList([]);
        setSeriesData([]);
        setEmptySeriesLabels([]);
        setSharedFetchInterval(undefined);
        void loadOverlapData(sAppliedPanelsInfo, sNextAlignmentMode);
    };
    const applyDraftPanelTime = function applyDraftPanelTime(): void {
        if (!hasOverlapPanelDraftChanged(sAppliedPanelsInfo, sDraftPanelsInfo)) {
            return;
        }

        setOriginTimeList([]);
        setSeriesData([]);
        setEmptySeriesLabels([]);
        setSharedFetchInterval(undefined);
        setAppliedPanelsInfo(sDraftPanelsInfo);
        void loadOverlapData(sDraftPanelsInfo);
    };
    const handleOverlapChartReady = function handleOverlapChartReady(instance: unknown): void {
        sOverlapChartInstanceRef.current = instance as OverlapChartInstance;
    };
    const applyOverlapChartZoom = function applyOverlapChartZoom(zoomFactor: number): void {
        const sCurrentRange = getCurrentOverlapChartVisibleRange(
            sOverlapChartInstanceRef.current,
            sOverlapChartInfo.xAxisRange,
        );

        if (!sCurrentRange) {
            return;
        }

        const sCurrentWidth = sCurrentRange.endTime - sCurrentRange.startTime;
        if (sCurrentWidth <= 0) {
            return;
        }

        const sNextWidth = sCurrentWidth * zoomFactor;
        const sCenterTime = sCurrentRange.startTime + sCurrentWidth / 2;
        const sNextStartTime = sCenterTime - sNextWidth / 2;

        sOverlapChartInstanceRef.current?.dispatchAction({
            type: 'dataZoom',
            startValue: sNextStartTime,
            endValue: sNextStartTime + sNextWidth,
        });
    };
    const applyOverlapChartShift = function applyOverlapChartShift(direction: -1 | 1): void {
        const sCurrentRange = getCurrentOverlapChartVisibleRange(
            sOverlapChartInstanceRef.current,
            sOverlapChartInfo.xAxisRange,
        );

        if (!sCurrentRange) {
            return;
        }

        const sCurrentWidth = sCurrentRange.endTime - sCurrentRange.startTime;
        if (sCurrentWidth <= 0) {
            return;
        }

        const sOffset = sCurrentWidth * OVERLAP_SHIFT_FRACTION * direction;

        sOverlapChartInstanceRef.current?.dispatchAction({
            type: 'dataZoom',
            startValue: sCurrentRange.startTime + sOffset,
            endValue: sCurrentRange.endTime + sOffset,
        });
    };
    const handleAreaChartRef = (element: HTMLDivElement | null): void => {
        sAreaChart.current = element;
        if (!element || sHasLoadedInitialDataRef.current) {
            return;
        }

        sHasLoadedInitialDataRef.current = true;
        void loadOverlapData(sAppliedPanelsInfo);
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
                pDuration={sDraftComparisonDuration}
                pShiftOffsetMs={sShiftOffsetMs}
                pOnSetShiftOffset={(offsetMs: number) =>
                    setPanelShiftOffset(sPanelKey, offsetMs)
                }
            />
        );
    }

    const sAppliedAnchorPanel = sAppliedPanelsInfo[0];
    const sDraftComparisonDuration = getSmallestOverlapDuration(sDraftPanelsInfo);
    const sCanRenderChart = Boolean(
        sAppliedAnchorPanel && sSeriesData.length > 0,
    );
    const sIsAlignStartMode = sAlignmentMode === OverlapAlignmentMode.ALIGN_START;
    const sHasDraftChanges = hasOverlapPanelDraftChanged(sAppliedPanelsInfo, sDraftPanelsInfo);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;
    const sOverlapChartInfo = useMemo<OverlapChartInfo>(
        () => ({
            seriesData: sSeriesData,
            seriesStartTimeList: sOriginTimeList,
            includeZeroInYAxisRange: sAppliedAnchorPanel?.board.axes.left_y_axis.zero_base ?? false,
            xAxisRange: getOverlapXAxisRange(
                sAppliedPanelsInfo,
                sAlignmentMode,
            ),
        }),
        [
            sAlignmentMode,
            sAppliedAnchorPanel?.board.axes.left_y_axis.zero_base,
            sAppliedPanelsInfo,
            sOriginTimeList,
            sSeriesData,
        ],
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
                    <div style={OVERLAP_TOOLBAR_STYLE}>
                        <Button
                            variant="secondary"
                            size="xsm"
                            icon={<Refresh size={12} />}
                            onClick={() => void loadOverlapData(sAppliedPanelsInfo)}
                            isToolTip
                            toolTipContent="Refresh data"
                            aria-label="Refresh data"
                        />
                        <Button
                            variant="secondary"
                            size="xsm"
                            icon={<VscChevronLeft size={16} />}
                            disabled={!sCanRenderChart}
                            onClick={() => applyOverlapChartShift(-1)}
                            isToolTip
                            toolTipContent="Shift left"
                            aria-label="Shift left"
                        />
                        <Button
                            variant="secondary"
                            size="xsm"
                            icon={<img src={ZoomInTwo} style={OVERLAP_TOOLBAR_BUTTON_ICON_STYLE} />}
                            disabled={!sCanRenderChart}
                            onClick={() => applyOverlapChartZoom(OVERLAP_ZOOM_IN_FACTOR)}
                            isToolTip
                            toolTipContent="Zoom in"
                            aria-label="Zoom in"
                        />
                        <Button
                            variant="secondary"
                            size="xsm"
                            icon={<img src={ZoomOutTwo} style={OVERLAP_TOOLBAR_BUTTON_ICON_STYLE} />}
                            disabled={!sCanRenderChart}
                            onClick={() => applyOverlapChartZoom(OVERLAP_ZOOM_OUT_FACTOR)}
                            isToolTip
                            toolTipContent="Zoom out"
                            aria-label="Zoom out"
                        />
                        <Button
                            variant="secondary"
                            size="xsm"
                            icon={<VscChevronRight size={16} />}
                            disabled={!sCanRenderChart}
                            onClick={() => applyOverlapChartShift(1)}
                            isToolTip
                            toolTipContent="Shift right"
                            aria-label="Shift right"
                        />
                        <Button
                            variant="secondary"
                            size="xsm"
                            active={sIsAlignStartMode}
                            onClick={toggleAlignmentMode}
                            isToolTip
                            toolTipContent={
                                sIsAlignStartMode
                                    ? 'Show selected panel offsets'
                                    : 'Align all series starts to elapsed 0'
                            }
                        >
                            {sIsAlignStartMode ? 'Preserve offset' : 'Align start'}
                        </Button>
                        {sSharedFetchInterval && (
                            <span style={OVERLAP_INTERVAL_LABEL_STYLE}>
                                Fetch interval: {formatOverlapIntervalLabel(sSharedFetchInterval)}
                            </span>
                        )}
                    </div>
                    <div ref={handleAreaChartRef}>
                        {sCanRenderChart && (
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
                        )}
                        {sEmptySeriesLabels.length > 0 && (
                            <div style={EMPTY_OVERLAP_DATA_STATUS_STYLE}>
                                {sEmptySeriesLabels.map((seriesLabel, index) => (
                                    <div key={`${seriesLabel}-${index}`}>
                                        {seriesLabel}: No overlap data for selected range.
                                    </div>
                                ))}
                            </div>
                        )}
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

function getOverlapPanelLabel(panelInfo: OverlapPanelInfo): string {
    const sFirstTag = panelInfo.board.data.tag_set[0];

    return (
        sFirstTag?.alias ||
        sFirstTag?.sourceTagName ||
        panelInfo.board.general.chart_title ||
        panelInfo.board.data.index_key
    );
}

function hasVisibleOverlapRows(rows: ChartRow[]): boolean {
    return rows.some(([, value]) => value !== null);
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

function createOverlapPanelFetchPlan(
    panelInfo: OverlapPanelInfo,
    anchorDuration: number,
    chartWidth: number,
): OverlapPanelFetchPlan {
    const sPanelBoardAxes = resolvePanelAxesForRuntime(panelInfo.board.axes);
    const sTimeRange = resolveOverlapTimeRange(panelInfo, anchorDuration);
    const sInterval = calculateInterval(
        sTimeRange.startTime,
        sTimeRange.endTime,
        chartWidth,
        panelInfo.isRaw,
        Number(sPanelBoardAxes.x_axis.calculated_data_pixels_per_tick),
        Number(sPanelBoardAxes.x_axis.raw_data_pixels_per_tick),
        undefined,
    );
    const sCount = calculateSampleCount(
        panelInfo.board.data.count ?? -1,
        panelInfo.isRaw,
        sPanelBoardAxes.x_axis.calculated_data_pixels_per_tick,
        sPanelBoardAxes.x_axis.raw_data_pixels_per_tick,
        chartWidth,
    );

    return {
        panelInfo,
        timeRange: sTimeRange,
        interval: sInterval,
        count: sCount,
    };
}

function getSmallestOverlapInterval(fetchPlans: OverlapPanelFetchPlan[]): IntervalOption {
    if (fetchPlans.length === 0) {
        throw new Error('Cannot resolve overlap interval without panels.');
    }

    return fetchPlans.reduce((smallestPlan, currentPlan) => {
        const sSmallestMs = getPositiveIntervalMs(smallestPlan.interval);
        const sCurrentMs = getPositiveIntervalMs(currentPlan.interval);

        return sCurrentMs < sSmallestMs ? currentPlan : smallestPlan;
    }).interval;
}

function getPositiveIntervalMs(interval: IntervalOption): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);

    return sIntervalMs > 0 ? sIntervalMs : Number.POSITIVE_INFINITY;
}

function formatOverlapIntervalLabel(interval: IntervalOption): string {
    return `${interval.IntervalValue} ${interval.IntervalType}`;
}

function getSmallestOverlapDuration(panelsInfo: OverlapPanelInfo[]): number {
    const sPositiveDurations = panelsInfo
        .map((panelInfo) => panelInfo.duration)
        .filter((duration) => Number.isFinite(duration) && duration > 0);

    if (sPositiveDurations.length === 0) {
        return panelsInfo[0]?.duration ?? 0;
    }

    return Math.min(...sPositiveDurations);
}

function getOverlapMappingOrigin(
    panelInfo: OverlapPanelInfo,
    anchorPanel: OverlapPanelInfo,
    fetchStartTime: number,
    alignmentMode: OverlapAlignmentMode,
): number {
    if (alignmentMode === OverlapAlignmentMode.PRESERVE_OFFSET) {
        return anchorPanel.start;
    }

    return panelInfo.isRaw ? panelInfo.start : fetchStartTime;
}

function getOverlapXAxisRange(
    panelsInfo: OverlapPanelInfo[],
    alignmentMode: OverlapAlignmentMode,
): TimeRangeMs | undefined {
    const sAnchorPanel = panelsInfo[0];

    if (!sAnchorPanel) {
        return undefined;
    }

    if (alignmentMode === OverlapAlignmentMode.ALIGN_START) {
        return createTimeRangeMs(0, getSmallestOverlapDuration(panelsInfo));
    }

    const sStartOffsets = panelsInfo.map((panelInfo) => panelInfo.start - sAnchorPanel.start);
    const sComparisonDuration = getSmallestOverlapDuration(panelsInfo);
    const sEndOffsets = panelsInfo.map((panelInfo) =>
        panelInfo.start + sComparisonDuration - sAnchorPanel.start,
    );

    return createTimeRangeMs(
        Math.min(...sStartOffsets),
        Math.max(...sEndOffsets),
    );
}

function getCurrentOverlapChartVisibleRange(
    chartInstance: OverlapChartInstance | null,
    fallbackRange: TimeRangeMs | undefined,
): TimeRangeMs | undefined {
    const sDataZoomState = chartInstance?.getOption?.()?.dataZoom?.[0];
    const sStartTime = getFiniteChartRangeValue(sDataZoomState?.startValue);
    const sEndTime = getFiniteChartRangeValue(sDataZoomState?.endValue);

    if (
        sStartTime !== undefined &&
        sEndTime !== undefined &&
        sEndTime > sStartTime
    ) {
        return createTimeRangeMs(sStartTime, sEndTime);
    }

    return fallbackRange;
}

function getFiniteChartRangeValue(value: number | string | Date | undefined): number | undefined {
    const sValue = value instanceof Date ? value.getTime() : Number(value);

    return Number.isFinite(sValue) ? sValue : undefined;
}

export default OverlapModal;
