import { MdOutlineStackedLineChart, Refresh } from '@/assets/icons/Icon';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import OverlapTimeShiftPanel from '../editor/OverlapTimeShiftPanel';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { ChartSeriesItem } from '../utils/series/seriesTypes';
import type {
    OverlapPanelInfo,
    OverlapShiftDirection,
} from '../utils/boardTypes';
import { buildOverlapChartOption } from '../chart/options/ChartOptionBuilder';
import { getSeriesShortName } from '../utils/series/SeriesLabelFormatter';
import { calculateInterval } from '../utils/time/IntervalUtils';
import {
    alignOverlapTime,
    buildOverlapLoadState,
    mapOverlapRows,
    resolveOverlapTimeRange,
    shiftOverlapPanels,
} from './OverlapComparisonUtils';
import {
    buildChartSeriesItem,
    mapRowsToChartData,
} from '../utils/fetch/parsing/ChartSeriesMapper';
import { calculateSampleCount } from '../utils/fetch/FetchSampleCountResolver';
import {
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from '../utils/fetch/ChartSeriesRowsLoader';
import { RAW_FETCH_SAMPLING_DISABLED } from './ModalConstants';
import type { OverlapModalProps } from './ModalTypes';

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
// Future Refactor Target: this flow still re-implements pieces of the panel fetch pipeline.
/**
 * Renders the overlap comparison modal for the currently selected panels.
 * Intent: Show several selected panels on one shared axis so the user can compare their trends.
 * @param {OverlapModalProps} pProps The overlap modal inputs and close handler.
 * @returns {JSX.Element}
 */
function OverlapModal({ pSetIsModal, pPanelsInfo, pRollupTableList }: OverlapModalProps) {
    const [sChartData, setChartData] = useState<ChartSeriesItem[]>([]);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<InstanceType<typeof ReactECharts> | null>(null);
    const [sStartTimeList, setStartTimeList] = useState<number[]>([]);
    const [sPanelsInfo, setPanelsInfo] = useState<OverlapPanelInfo[]>([]);

    /**
     * Fetches one overlap panel through the shared series-fetch path and normalizes it for the overlap chart.
     * Intent: Reuse the normal fetch pipeline while reshaping the result for overlap comparison.
     * @param {OverlapPanelInfo} aPanelInfo The overlap panel being loaded.
     * @param {OverlapPanelInfo} aAnchorPanel The anchor panel that defines the comparison duration.
     * @returns {Promise<{ startTime: number | undefined; chartSeries: ChartSeriesItem | undefined }>} The overlap load result for the panel.
     */
    const fetchOverlapPanelData = useCallback(
        async function fetchOverlapPanelData(
            aPanelInfo: OverlapPanelInfo,
            aAnchorPanel: OverlapPanelInfo,
        ) {
            const sChartWidth = sAreaChart.current?.clientWidth
                ? sAreaChart.current.clientWidth
                : 1;
            const sLimit = aPanelInfo.board.data.count;
            const sPanelBoardAxes = aPanelInfo.board.axes;
            const sCount = calculateSampleCount(
                sLimit,
                true,
                aPanelInfo.isRaw,
                sPanelBoardAxes.x_axis.calculated_data_pixels_per_tick,
                sPanelBoardAxes.x_axis.raw_data_pixels_per_tick,
                sChartWidth,
            );
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
                Number(sPanelAxes.x_axis.calculated_data_pixels_per_tick),
                Number(sPanelAxes.x_axis.raw_data_pixels_per_tick),
                undefined,
            );

            const sTagSetElement = sTagSet[0];
            const sFetchTimeRange = aPanelInfo.isRaw
                ? {
                      startTime: Math.round(sTimeRange.startTime),
                      endTime: Math.round(sTimeRange.endTime),
                  }
                : {
                      startTime: alignOverlapTime(Math.round(sTimeRange.startTime), sIntervalTime),
                      endTime: alignOverlapTime(Math.round(sTimeRange.endTime), sIntervalTime),
                  };
            const sFetchResult = aPanelInfo.isRaw
                ? await fetchRawSeriesRows(
                      sTagSetElement,
                      sFetchTimeRange,
                      sIntervalTime,
                      sCount,
                      RAW_FETCH_SAMPLING_DISABLED,
                  )
                : await fetchCalculatedSeriesRows(
                      sTagSetElement,
                      sFetchTimeRange,
                      sIntervalTime,
                      sCount,
                      pRollupTableList,
                  );

            const sSeriesStartTime = aPanelInfo.isRaw
                ? aPanelInfo.start
                : sFetchTimeRange.startTime;

            const sOverlapRows = mapOverlapRows(
                mapRowsToChartData(sFetchResult.data?.rows),
                sSeriesStartTime,
            );

            return {
                startTime: sSeriesStartTime,
                chartSeries: buildChartSeriesItem(
                    sTagSetElement,
                    sOverlapRows,
                    aPanelInfo.isRaw,
                    false,
                ),
            };
        },
        [pRollupTableList],
    );

    /**
     * Loads every currently selected overlap panel and rebuilds the chart state in the original panel order.
     * Intent: Keep the overlap chart synchronized with the current modal selection.
     * @param {OverlapPanelInfo[]} aPanelsInfo The overlap panels to load.
     * @returns {Promise<void>}
     */
    const loadOverlapData = useCallback(
        async function loadOverlapData(aPanelsInfo: OverlapPanelInfo[]) {
            if (!aPanelsInfo.length) return;

            const sAnchorPanel = aPanelsInfo[0];
            const sLoadResults = await Promise.all(
                aPanelsInfo.map((aPanelInfo) => fetchOverlapPanelData(aPanelInfo, sAnchorPanel)),
            );
            const sLoadState = buildOverlapLoadState(sLoadResults);

            setStartTimeList(sLoadState.startTimes);
            setChartData(sLoadState.chartSeries);
        },
        [fetchOverlapPanelData],
    );

    /**
     * Shifts one overlap panel along the shared comparison axis.
     * Intent: Update one panel offset without disturbing the rest of the overlap selection.
     * @param {string} aPanelKey The target panel key.
     * @param {OverlapShiftDirection} aType The shift direction.
     * @param {number} aRange The shift amount in milliseconds.
     * @returns {void}
     */
    const shiftPanelTime = useCallback(function shiftPanelTime(
        aPanelKey: string,
        aType: OverlapShiftDirection,
        aRange: number,
    ) {
        setStartTimeList([]);
        setPanelsInfo((aPrev) => shiftOverlapPanels(aPrev, aPanelKey, aType, aRange));
    }, []);

    /**
     * Renders one time-shift panel for a loaded overlap panel.
     * Intent: Keep the overlap adjustment panel colocated with the rendered panel row.
     * @param {OverlapPanelInfo} aItem The overlap panel being rendered.
     * @param {number} aIdx The display index used for the panel color.
     * @returns {JSX.Element}
     */
    function renderOverlapTimeShiftPanel(aItem: OverlapPanelInfo, aIdx: number) {
        const sFirstTag = aItem.board.data.tag_set[0];

        return (
            <OverlapTimeShiftPanel
                pColorIndex={aIdx}
                key={aItem.board.meta.index_key}
                pLabel={getSeriesShortName(sFirstTag)}
                pStart={aItem.start}
                pDuration={sAnchorPanel.duration}
                pOnShiftTime={(aDirection: OverlapShiftDirection, aRange: number) =>
                    shiftPanelTime(aItem.board.meta.index_key, aDirection, aRange)
                }
            />
        );
    }

    useEffect(() => {
        setPanelsInfo(pPanelsInfo);
    }, [pPanelsInfo]);

    useEffect(() => {
        void loadOverlapData(sPanelsInfo);
    }, [loadOverlapData, sPanelsInfo]);

    const sAnchorPanel = sPanelsInfo[0];
    const sCanRenderChart = Boolean(sAnchorPanel && sChartData[sPanelsInfo.length - 1]);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;

    return (
        <Modal.Root
            isOpen={true}
            onClose={() => pSetIsModal(false)}
            size="lg"
            style={{ height: 'auto', maxHeight: '80vh' }}
            className={undefined}
            closeOnEscape={undefined}
            closeOnOutsideClick={undefined}
        >
            <Modal.Header className={undefined} style={undefined}>
                <Modal.Title className={undefined} style={undefined}>
                    <MdOutlineStackedLineChart size={16} />
                    <span>Overlap Chart</span>
                </Modal.Title>
                <Modal.Close children={undefined} className={undefined} style={undefined} />
            </Modal.Header>
            <Modal.Body className={undefined} style={undefined}>
                <Page.ContentBlock
                    pHoverNone
                    pActive={undefined}
                    pSticky={undefined}
                    style={undefined}
                >
                    <Button
                        variant="secondary"
                        size="xsm"
                        icon={<Refresh size={12} />}
                        onClick={() => {
                            if (sChartRef.current) {
                                void loadOverlapData(sPanelsInfo);
                            }
                        }}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                    <div ref={sAreaChart}>
                        {sCanRenderChart && (
                            <ReactECharts
                                ref={sChartRef}
                                option={buildOverlapChartOption(
                                    sChartData,
                                    sStartTimeList,
                                    sAnchorPanel.board.axes.left_y_axis.zero_base,
                                )}
                                notMerge
                                lazyUpdate
                                style={{
                                    width: sChartWidth ? `${sChartWidth - 10}px` : '100%',
                                    height: 300,
                                }}
                                opts={{ renderer: 'canvas' }}
                            />
                        )}
                        {sPanelsInfo.map(renderOverlapTimeShiftPanel)}
                    </div>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer className={undefined} style={undefined}>
                <Modal.Cancel
                    children={undefined}
                    className={undefined}
                    style={undefined}
                    onClick={undefined}
                    autoFocus={undefined}
                />
            </Modal.Footer>
        </Modal.Root>
    );
}
export default OverlapModal;

