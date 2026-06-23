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
import { Button, Page, Toast } from '@/design-system/components';
import type { OverlapPanelInfo } from '../domain/BoardDomain';
import {
    buildOverlapLoadState,
    getSeriesTimeBounds,
    hasOverlapPanelDraftChanged,
    resolveOverlapTimeRange,
} from './OverlapComparisonUtils';
import {
    mapFetchResultToChartData,
    type ChartSeriesData,
    type OverlapLoadResult,
} from '../domain/ChartDomain';
import { fetchMainPanelSeriesRows } from '../fetch/PanelSeriesDataRepository';
import type { RollupTableMap } from '../fetch/FetchContracts';
import { buildOverlapChartOption, type OverlapChartInput } from './OverlapChartOptionBuilder';

const OVERLAP_LOAD_ERROR_MESSAGE = 'Failed to load overlap data.';
const OVERLAP_CHART_SHIFT_FRACTION = 0.3;
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
    pRollupTableList: RollupTableMap;
};

function OverlapModal({
    pSetIsModal,
    pPanelsInfo,
    pRollupTableList,
}: OverlapModalProps): JSX.Element {
    const [sSeriesData, setSeriesData] = useState<ChartSeriesData[]>([]);
    const [sIsLoadingOverlapData, setIsLoadingOverlapData] = useState(false);
    const [sOverlapLoadError, setOverlapLoadError] = useState<string | undefined>();
    const [sAppliedPanelsInfo, setAppliedPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);
    const [sDraftPanelsInfo, setDraftPanelsInfo] = useState<OverlapPanelInfo[]>(pPanelsInfo);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sOverlapChartInstanceRef = useRef<OverlapChartInstance | null>(null);
    const sHasLoadedInitialDataRef = useRef(false);
    const sLoadRequestIdRef = useRef(0);
    const sInitialPanelStartByKeyRef = useRef<Map<string, number> | null>(null);

    if (sInitialPanelStartByKeyRef.current === null) {
        sInitialPanelStartByKeyRef.current = createInitialPanelStartByKey(pPanelsInfo);
    }
    const sInitialPanelStartByKey = sInitialPanelStartByKeyRef.current;

    const sAnchorPanel = sDraftPanelsInfo[0];
    const sAppliedAnchorPanel = sAppliedPanelsInfo[0];
    const sCanRenderChart = Boolean(
        sAppliedAnchorPanel && sSeriesData[sAppliedPanelsInfo.length - 1],
    );
    const sHasDraftChanges = hasOverlapPanelDraftChanged(sAppliedPanelsInfo, sDraftPanelsInfo);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;
    const sOverlapChartInput = useMemo<OverlapChartInput>(
        () => ({
            seriesData: sSeriesData,
            includeZeroInYAxisRange: sAppliedAnchorPanel?.includeZeroInYAxisRange ?? false,
        }),
        [sAppliedAnchorPanel?.includeZeroInYAxisRange, sSeriesData],
    );

    async function fetchOverlapPanelData(
        panelInfo: OverlapPanelInfo,
        anchorPanel: OverlapPanelInfo,
    ): Promise<OverlapLoadResult> {
        const sChartWidthPx = sAreaChart.current?.clientWidth || 1;
        const sTimeRange = resolveOverlapTimeRange(panelInfo, anchorPanel.duration);
        const sFetchTimeRange = {
            startTime: Math.round(sTimeRange.startTime),
            endTime: Math.round(sTimeRange.endTime),
        };
        const sFetchResult = await fetchMainPanelSeriesRows(
            [panelInfo.series],
            panelInfo.queryLimit,
            panelInfo.intervalType,
            panelInfo.xAxis,
            panelInfo.mainChartSampling,
            sChartWidthPx,
            panelInfo.isRaw,
            panelInfo.isOrderBy,
            sFetchTimeRange,
            pRollupTableList,
        );
        const sChartSeries = mapFetchResultToChartData(
            sFetchResult,
            { includeColor: false },
        )[0];

        return {
            chartSeries: sChartSeries,
        };
    }

    async function loadOverlapData(panelsInfo: OverlapPanelInfo[]): Promise<void> {
        const sRequestId = ++sLoadRequestIdRef.current;

        if (!panelsInfo.length) {
            setSeriesData([]);
            setOverlapLoadError(undefined);
            return;
        }

        setIsLoadingOverlapData(true);
        setOverlapLoadError(undefined);
        setSeriesData([]);

        try {
            const sAnchor = panelsInfo[0];
            const sResults = await Promise.all(
                panelsInfo.map((panelInfo) => fetchOverlapPanelData(panelInfo, sAnchor)),
            );

            if (sRequestId !== sLoadRequestIdRef.current) {
                return;
            }

            const sLoadState = buildOverlapLoadState(sResults);
            setSeriesData(sLoadState.chartSeries);
        } catch (error) {
            if (sRequestId !== sLoadRequestIdRef.current) {
                return;
            }

            const sMessage =
                error instanceof Error && error.message
                    ? error.message
                    : OVERLAP_LOAD_ERROR_MESSAGE;

            setOverlapLoadError(sMessage);
            Toast.error(sMessage, undefined);
        } finally {
            if (sRequestId === sLoadRequestIdRef.current) {
                setIsLoadingOverlapData(false);
            }
        }
    }

    function setPanelShiftOffset(panelKey: string, offsetMs: number): void {
        if (!Number.isFinite(offsetMs)) {
            throw new Error('Overlap shift offset must be a finite number of milliseconds.');
        }

        const sNextStart = getInitialPanelStart(sInitialPanelStartByKey, panelKey) + offsetMs;

        setDraftPanelsInfo((currentPanelsInfo) => {
            let sDidUpdatePanel = false;
            const sNext = currentPanelsInfo.map((panelInfo) => {
                if (panelInfo.panelKey !== panelKey) return panelInfo;
                sDidUpdatePanel = true;
                return panelInfo.start === sNextStart ? panelInfo : { ...panelInfo, start: sNextStart };
            });

            if (!sDidUpdatePanel) {
                throw new Error(`Cannot shift missing overlap panel: ${panelKey}`);
            }
            return sNext;
        });
    }

    function applyDraftPanelTime(): void {
        if (!sHasDraftChanges) return;
        setAppliedPanelsInfo(sDraftPanelsInfo);
        void loadOverlapData(sDraftPanelsInfo);
    }

    function handleAreaChartRef(element: HTMLDivElement | null): void {
        sAreaChart.current = element;
        if (!element || sHasLoadedInitialDataRef.current) return;
        sHasLoadedInitialDataRef.current = true;
        void loadOverlapData(sAppliedPanelsInfo);
    }

    function shiftOverlapChart(direction: RangeShiftDirection): void {
        const sVisibleRange = getCurrentOverlapChartVisibleRange(
            sOverlapChartInstanceRef.current,
            sSeriesData,
        );
        if (!sVisibleRange) return;

        const sWidth = sVisibleRange.endTime - sVisibleRange.startTime;
        if (sWidth <= 0) return;

        const sOffset = sWidth * OVERLAP_CHART_SHIFT_FRACTION * direction;
        sOverlapChartInstanceRef.current?.dispatchAction({
            type: 'dataZoom',
            startValue: sVisibleRange.startTime + sOffset,
            endValue: sVisibleRange.endTime + sOffset,
        });
    }

    function renderOverlapTimeShiftPanel(item: OverlapPanelInfo, idx: number): JSX.Element {
        const sPanelKey = item.panelKey;
        const sLabel = item.label;
        const sShiftOffsetMs = item.start - getInitialPanelStart(sInitialPanelStartByKey, sPanelKey);

        return (
            <OverlapTimeShiftPanel
                pColorIndex={idx}
                key={sPanelKey}
                pLabel={sLabel}
                pStart={item.start}
                pDuration={sAnchorPanel.duration}
                pShiftOffsetMs={sShiftOffsetMs}
                pOnSetShiftOffset={(offsetMs: number) => setPanelShiftOffset(sPanelKey, offsetMs)}
            />
        );
    }

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
                        disabled={sIsLoadingOverlapData}
                        onClick={() => void loadOverlapData(sAppliedPanelsInfo)}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div ref={handleAreaChartRef}>
                        <div style={{ position: 'relative' }}>
                            {sIsLoadingOverlapData && (
                                <Page.ContentText pContent="Loading overlap data..." />
                            )}
                            {!sIsLoadingOverlapData && sOverlapLoadError && (
                                <Page.ContentText pContent={sOverlapLoadError} />
                            )}
                            {!sIsLoadingOverlapData && sCanRenderChart && (
                                <>
                                    <ReactECharts
                                        option={buildOverlapChartOption(sOverlapChartInput)}
                                        notMerge
                                        lazyUpdate
                                        onChartReady={(instance) =>
                                            (sOverlapChartInstanceRef.current = instance as OverlapChartInstance)
                                        }
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
                                            style={{ pointerEvents: 'auto' }}
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
                                            style={{ pointerEvents: 'auto' }}
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
                        disabled={!sHasDraftChanges || sIsLoadingOverlapData}
                        onClick={applyDraftPanelTime}
                    >
                        Apply
                    </Button>
                    {sHasDraftChanges && (
                        <span style={{ color: '#fdb532', fontSize: '11px', lineHeight: '14px' }}>
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
        const sPanelKey = panelInfo.panelKey;
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

    if (sStartTime !== undefined && sEndTime !== undefined && sEndTime > sStartTime) {
        return { startTime: sStartTime, endTime: sEndTime };
    }
    return getSeriesTimeBounds(seriesData);
}

function getFiniteChartRangeValue(
    value: number | string | Date | undefined,
): number | undefined {
    const sValue = value instanceof Date ? value.getTime() : Number(value);
    return Number.isFinite(sValue) ? sValue : undefined;
}

export default OverlapModal;
