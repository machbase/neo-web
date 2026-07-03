import './OverlapModal.scss';
import {
    MdOutlineStackedLineChart,
    Refresh,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import ReactECharts from 'echarts-for-react';
import { Modal } from '@/design-system/components/Modal';
import { Button, Dropdown, Input, Page, Toast } from '@/design-system/components';
import type { OverlapPanelInfo } from './OverlapTypes';
import { getSeriesTimeBounds } from './OverlapComparisonUtils';
import type { ChartRow, ChartSeriesData } from '../../domain/ChartDomain';
import { mapFetchResultToChartData } from '../../fetch/panelData/mapFetchResultToChartData';
import { fetchMainPanelSeriesRows } from '../../fetch/panelData/PanelSeriesDataRepository';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import { buildOverlapChartOption, type OverlapChartInput } from './OverlapChartOptionBuilder';
import { getTimeRangeWidth, shiftTimeRange } from '../../domain/time/TimeRangeUtils';
import { TimeUnit, type TimeRangeMs } from '../../domain/time/TimeTypes';
import { getTimeUnitMilliseconds } from '../../domain/time/TimeIntervalUtils';
import { resolvePanelAxesForRuntime } from '../../domain/panel/PanelRuntime';
import { getSeriesListKeyAxisKind } from '../../domain/SeriesDomain';
import { formatRangeEndpointLabel } from '../../formatting/TimeFormatters';

const OVERLAP_LOAD_ERROR_MESSAGE = 'Failed to load overlap data.';
const OVERLAP_CHART_SHIFT_FRACTION = 0.3;
const OVERLAP_CHART_FETCH_WIDTH_PX = 1000;
const OVERLAP_PANEL_SHIFT_UNIT_DROPDOWN_STYLE = {
    width: 72,
} as const;
const OVERLAP_PANEL_SHIFT_UNIT_TRIGGER_STYLE = {
    height: 28,
    minHeight: 28,
    fontSize: 12,
} as const;
const OVERLAP_SHIFT_ERROR_MESSAGE = 'Shift amount must be 0 or greater.';
const OVERLAP_SHIFT_UNIT_OPTIONS = [
    { label: 'ms', value: TimeUnit.Millisecond },
    { label: 'sec', value: TimeUnit.Second },
    { label: 'min', value: TimeUnit.Minute },
    { label: 'hour', value: TimeUnit.Hour },
    { label: 'day', value: TimeUnit.Day },
];

type RangeShiftDirection = -1 | 1;
type OverlapChartDataZoomState = {
    startValue?: number | string | Date;
    endValue?: number | string | Date;
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
type OverlapDisplayPanelInfo = OverlapPanelInfo & {
    originalRuntimeRange: TimeRangeMs;
    shiftAmount: string;
    shiftUnit: TimeUnit;
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
    const [sBaseSeriesData, setBaseSeriesData] = useState<ChartSeriesData[]>([]);
    const [sIsLoadingOverlapData, setIsLoadingOverlapData] = useState(false);
    const [sOverlapLoadError, setOverlapLoadError] = useState<string | undefined>();
    const [sPanelsInfo, setPanelsInfo] = useState<OverlapDisplayPanelInfo[]>(
        () => createInitialOverlapPanels(pPanelsInfo),
    );
    const sOverlapChartInstanceRef = useRef<OverlapChartInstance | null>(null);
    const sLoadRequestIdRef = useRef(0);
    const sInitialPanelsInfoRef = useRef<OverlapDisplayPanelInfo[] | undefined>(undefined);

    if (sInitialPanelsInfoRef.current === undefined) {
        sInitialPanelsInfoRef.current = sPanelsInfo;
    }

    const sAnchorPanel = sPanelsInfo[0];
    const sIsNumericXAxis = isNumericOverlapPanel(sAnchorPanel);
    const sSeriesData = useMemo(
        () => applyPanelRangeShifts(sBaseSeriesData, sPanelsInfo),
        [sBaseSeriesData, sPanelsInfo],
    );
    const sCanRenderChart = sPanelsInfo.length > 0 && sSeriesData.length > 0;
    const sOverlapChartInput = useMemo<OverlapChartInput>(
        () => ({
            seriesData: sSeriesData,
            includeZeroInYAxisRange: sAnchorPanel?.panelInfo.axes.leftY.zeroBase ?? false,
            isNumericXAxis: sIsNumericXAxis,
        }),
        [
            sAnchorPanel?.panelInfo.axes.leftY.zeroBase,
            sIsNumericXAxis,
            sSeriesData,
        ],
    );

    const fetchOverlapPanelData = useCallback(async (
        panelDisplayInfo: OverlapDisplayPanelInfo,
    ): Promise<ChartSeriesData[]> => {
        const sPanelInfo = panelDisplayInfo.panelInfo;
        const sRuntimeAxes = resolvePanelAxesForRuntime(
            sPanelInfo.axes,
            sPanelInfo.display.pixelsPerTick,
            sPanelInfo.display.mainChartSampling,
        );
        const sFetchResult = await fetchMainPanelSeriesRows(
            sPanelInfo.query.tagSet,
            sPanelInfo.query.count,
            sPanelInfo.query.intervalType,
            sRuntimeAxes.x,
            sRuntimeAxes.mainChartSampling,
            OVERLAP_CHART_FETCH_WIDTH_PX,
            sPanelInfo.mode.isRaw,
            sPanelInfo.mode.isOrderBy,
            panelDisplayInfo.originalRuntimeRange,
            pRollupTableList,
        );
        const sChartSeries = mapFetchResultToChartData(
            sFetchResult,
            { includeColor: false },
        ).map((chartSeries) => ({
            ...chartSeries,
            overlapPanelKey: panelDisplayInfo.panelKey,
            name: buildOverlapSeriesName(sPanelInfo.title, chartSeries.name),
        }));
        return sChartSeries;
    }, [pRollupTableList]);

    const loadOverlapData = useCallback(async (panelsInfo: OverlapDisplayPanelInfo[]): Promise<void> => {
        const sRequestId = ++sLoadRequestIdRef.current;

        if (!panelsInfo.length) {
            setBaseSeriesData([]);
            setOverlapLoadError(undefined);
            return;
        }

        setIsLoadingOverlapData(true);
        setOverlapLoadError(undefined);
        setBaseSeriesData([]);

        try {
            const sResults = await Promise.all(
                panelsInfo.map((panelInfo) => fetchOverlapPanelData(panelInfo)),
            );

            if (sRequestId !== sLoadRequestIdRef.current) {
                return;
            }
            setBaseSeriesData(makeOverlapSeriesNamesUnique(sResults.flat()));
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
    }, [fetchOverlapPanelData]);

    useEffect(() => {
        void loadOverlapData(sInitialPanelsInfoRef.current ?? []);

        return () => {
            sLoadRequestIdRef.current += 1;
        };
    }, [loadOverlapData]);

    function updatePanelShiftAmount(
        panelKey: string,
        event: ChangeEvent<HTMLInputElement>,
    ): void {
        const sNextAmount = event.target.value;
        setPanelsInfo((previousPanels) =>
            previousPanels.map((panelInfo) =>
                panelInfo.panelKey === panelKey
                    ? { ...panelInfo, shiftAmount: sNextAmount }
                    : panelInfo,
            ),
        );
    }

    function updatePanelShiftUnit(panelKey: string, shiftUnit: string): void {
        setPanelsInfo((previousPanels) =>
            previousPanels.map((panelInfo) =>
                panelInfo.panelKey === panelKey
                    ? { ...panelInfo, shiftUnit: shiftUnit as TimeUnit }
                    : panelInfo,
            ),
        );
    }

    function shiftPanelDisplayRange(
        panelKey: string,
        direction: RangeShiftDirection,
    ): void {
        setPanelsInfo((previousPanels) =>
            previousPanels.map((panelInfo) => {
                if (panelInfo.panelKey !== panelKey) {
                    return panelInfo;
                }

                const sShiftOffset = getPanelShiftOffset(panelInfo, sIsNumericXAxis);
                if (sShiftOffset === undefined) {
                    Toast.error(OVERLAP_SHIFT_ERROR_MESSAGE, undefined);
                    return panelInfo;
                }

                if (sShiftOffset === 0) {
                    return panelInfo;
                }

                return {
                    ...panelInfo,
                    runtimeRange: shiftTimeRange(
                        panelInfo.runtimeRange,
                        sShiftOffset * direction,
                    ),
                };
            }),
        );
    }

    function shiftOverlapChart(direction: RangeShiftDirection): void {
        const sVisibleRange = getCurrentOverlapChartVisibleRange(
            sOverlapChartInstanceRef.current,
            sSeriesData,
        );
        if (!sVisibleRange) return;

        const sWidth = getTimeRangeWidth(sVisibleRange);
        if (sWidth <= 0) return;

        const sOffset = sWidth * OVERLAP_CHART_SHIFT_FRACTION * direction;
        sOverlapChartInstanceRef.current?.dispatchAction({
            type: 'dataZoom',
            startValue: sVisibleRange.startTime + sOffset,
            endValue: sVisibleRange.endTime + sOffset,
        });
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
                        onClick={() => void loadOverlapData(sPanelsInfo)}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div>
                        <div className="overlap-modal__chart-area">
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
                                            width: '100%',
                                            height: 300,
                                        }}
                                        opts={{ renderer: 'canvas' }}
                                    />
                                    <div className="overlap-modal__side-controls">
                                        <Button
                                            variant="secondary"
                                            size="xsm"
                                            icon={<VscChevronLeft size={16} />}
                                            disabled={!sCanRenderChart}
                                            onClick={() => shiftOverlapChart(-1)}
                                            isToolTip
                                            toolTipContent="Shift overlap chart left"
                                            aria-label="Shift overlap chart left"
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
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="overlap-modal__shift-list">
                        {sPanelsInfo.map((panelInfo) => (
                            <OverlapPanelShiftRow
                                key={panelInfo.panelKey}
                                panelInfo={panelInfo}
                                isNumericXAxis={sIsNumericXAxis}
                                onShiftAmountChange={updatePanelShiftAmount}
                                onShiftUnitChange={updatePanelShiftUnit}
                                onShiftRange={shiftPanelDisplayRange}
                            />
                        ))}
                    </div>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

type OverlapPanelShiftRowProps = {
    panelInfo: OverlapDisplayPanelInfo;
    isNumericXAxis: boolean;
    onShiftAmountChange: (
        panelKey: string,
        event: ChangeEvent<HTMLInputElement>,
    ) => void;
    onShiftUnitChange: (panelKey: string, shiftUnit: string) => void;
    onShiftRange: (
        panelKey: string,
        direction: RangeShiftDirection,
    ) => void;
};

function OverlapPanelShiftRow({
    panelInfo,
    isNumericXAxis,
    onShiftAmountChange,
    onShiftUnitChange,
    onShiftRange,
}: OverlapPanelShiftRowProps): JSX.Element {
    const sPanelTitle = getPanelDisplayTitle(panelInfo);

    return (
        <div className="overlap-modal__shift-row">
            <div className="overlap-modal__shift-text">
                <strong className="overlap-modal__shift-title">{sPanelTitle}</strong>
                <span className="overlap-modal__shift-label">Original</span>
                <span className="overlap-modal__shift-value">{formatOverlapRange(panelInfo.originalRuntimeRange, isNumericXAxis)}</span>
                <span className="overlap-modal__shift-label">Altered</span>
                <span className="overlap-modal__shift-value">{formatOverlapRange(panelInfo.runtimeRange, isNumericXAxis)}</span>
            </div>
            <div className="overlap-modal__shift-controls">
                <Button
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronLeft size={14} />}
                    onClick={() => onShiftRange(panelInfo.panelKey, -1)}
                    isToolTip
                    toolTipContent="Shift altered range left"
                    aria-label={`Shift altered range left for ${sPanelTitle}`}
                />
                <Input
                    aria-label={`Shift amount for ${sPanelTitle}`}
                    type="number"
                    min={0}
                    step="any"
                    size="sm"
                    value={panelInfo.shiftAmount}
                    onChange={(event) => onShiftAmountChange(panelInfo.panelKey, event)}
                    style={{ width: 88 }}
                />
                <Dropdown.Root
                    options={OVERLAP_SHIFT_UNIT_OPTIONS}
                    value={panelInfo.shiftUnit}
                    onChange={(unit) => onShiftUnitChange(panelInfo.panelKey, unit)}
                    style={OVERLAP_PANEL_SHIFT_UNIT_DROPDOWN_STYLE}
                >
                    <Dropdown.Trigger
                        style={OVERLAP_PANEL_SHIFT_UNIT_TRIGGER_STYLE}
                    />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
                <Button
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronRight size={14} />}
                    onClick={() => onShiftRange(panelInfo.panelKey, 1)}
                    isToolTip
                    toolTipContent="Shift altered range right"
                    aria-label={`Shift altered range right for ${sPanelTitle}`}
                />
            </div>
        </div>
    );
}

function createInitialOverlapPanels(
    panelsInfo: OverlapPanelInfo[],
): OverlapDisplayPanelInfo[] {
    return panelsInfo.map((panelInfo) => ({
        ...panelInfo,
        originalRuntimeRange: panelInfo.runtimeRange,
        runtimeRange: panelInfo.runtimeRange,
        shiftAmount: '1',
        shiftUnit: TimeUnit.Second,
    }));
}

function applyPanelRangeShifts(
    seriesData: ChartSeriesData[],
    panelsInfo: OverlapDisplayPanelInfo[],
): ChartSeriesData[] {
    const sPanelShiftByKey = new Map(
        panelsInfo.map((panelInfo) => [
            panelInfo.panelKey,
            panelInfo.runtimeRange.startTime - panelInfo.originalRuntimeRange.startTime,
        ]),
    );

    return seriesData.map((series) => {
        const sPanelKey = getOverlapSeriesPanelKey(series);
        const sShiftOffset = sPanelKey
            ? sPanelShiftByKey.get(sPanelKey) ?? 0
            : 0;

        return shiftChartSeriesData(series, sShiftOffset);
    });
}

function getOverlapSeriesPanelKey(series: ChartSeriesData): string | undefined {
    const sPanelKey = series.overlapPanelKey;
    return typeof sPanelKey === 'string' ? sPanelKey : undefined;
}

function shiftChartSeriesData(
    chartSeries: ChartSeriesData,
    shiftOffset: number,
): ChartSeriesData {
    if (shiftOffset === 0) {
        return chartSeries;
    }

    return {
        ...chartSeries,
        data: chartSeries.data.map((chartRow): ChartRow => [
            chartRow[0] + shiftOffset,
            chartRow[1],
        ]),
    };
}

function makeOverlapSeriesNamesUnique(
    seriesData: ChartSeriesData[],
): ChartSeriesData[] {
    const sSeenNameCounts = new Map<string, number>();

    return seriesData.map((series) => {
        const sCurrentCount = sSeenNameCounts.get(series.name) ?? 0;
        sSeenNameCounts.set(series.name, sCurrentCount + 1);

        if (sCurrentCount === 0) {
            return series;
        }

        return {
            ...series,
            name: `${series.name} (${sCurrentCount + 1})`,
        };
    });
}
function getPanelDisplayTitle(panelInfo: OverlapDisplayPanelInfo): string {
    return panelInfo.panelInfo.title.trim() || 'Panel';
}

function buildOverlapSeriesName(
    panelTitle: string,
    seriesName: string,
): string {
    const sPanelTitle = panelTitle.trim() || 'Panel';
    return `${sPanelTitle} / ${seriesName}`;
}

function getPanelShiftOffset(
    panelInfo: OverlapDisplayPanelInfo,
    isNumericXAxis: boolean,
): number | undefined {
    const sAmount = Number(panelInfo.shiftAmount);
    if (!Number.isFinite(sAmount) || sAmount < 0) {
        return undefined;
    }

    if (sAmount === 0) {
        return 0;
    }

    if (isNumericXAxis) {
        return sAmount;
    }

    const sOffset = getTimeUnitMilliseconds(panelInfo.shiftUnit, sAmount);
    return sOffset > 0 ? sOffset : undefined;
}

function formatOverlapRange(
    range: TimeRangeMs,
    isNumericXAxis: boolean,
): string {
    const sStart = formatRangeEndpointLabel(
        range.startTime,
        isNumericXAxis,
        range,
    );
    const sEnd = formatRangeEndpointLabel(
        range.endTime,
        isNumericXAxis,
        range,
    );

    return `${sStart} ~ ${sEnd}`;
}

function isNumericOverlapPanel(
    panelInfo: OverlapPanelInfo | undefined,
): boolean {
    return getSeriesListKeyAxisKind(panelInfo?.panelInfo.query.tagSet) === 'double';
}

function getCurrentOverlapChartVisibleRange(
    chartInstance: OverlapChartInstance | null,
    seriesData: ChartSeriesData[],
): TimeRangeMs | undefined {
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

