import { MdOutlineStackedLineChart, Refresh } from '@/assets/icons/Icon';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import OverlapTimeShiftPanel from './OverlapTimeShiftPanel';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { ChartSeriesData } from '../utils/series/PanelSeriesTypes';
import type {
    OverlapPanelInfo,
    OverlapShiftDirection,
} from './OverlapTypes';
import { getSeriesShortName } from '../utils/series/PanelSeriesLabelFormatter';
import { calculateInterval } from '../utils/time/IntervalUtils';
import {
    alignOverlapTime,
    buildOverlapLoadState,
    mapOverlapRows,
    resolveOverlapTimeRange,
    shiftOverlapPanels,
} from './OverlapComparisonUtils';
import {
    buildChartSeriesData,
    mapRowsToChartData,
} from '../utils/fetch/parsing/ChartSeriesMapper';
import {
    calculateSampleCount,
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from '../utils/fetch/PanelChartDatasetFetcher';
import { RAW_FETCH_SAMPLING_DISABLED } from './BoardModalConstants';
import {
    buildOverlapChartOption,
    type OverlapChartInfo,
} from './OverlapChartOptionBuilder';

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
// Future Refactor Target: this flow still re-implements pieces of the panel fetch pipeline.
/**
 * Renders the overlap comparison modal for the currently selected panels.
 * Intent: Show several selected panels on one shared axis so the user can compare their trends.
 * @param pProps The overlap modal inputs and close handler.
 * @returns {JSX.Element}
 */
function OverlapModal({
    pSetIsModal,
    pPanelsInfo,
    pRollupTableList,
}: {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: OverlapPanelInfo[];
    pRollupTableList: string[];
}) {
    const [sSeriesData, setSeriesData] = useState<ChartSeriesData[]>([]);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<InstanceType<typeof ReactECharts> | null>(null);
    const [sStartTimeList, setStartTimeList] = useState<number[]>([]);
    const [sPanelsInfo, setPanelsInfo] = useState<OverlapPanelInfo[]>([]);

    /**
     * Fetches one overlap panel through the shared series-fetch path and normalizes it for the overlap chart.
     * Intent: Reuse the normal fetch pipeline while reshaping the result for overlap comparison.
     * @param {OverlapPanelInfo} aPanelInfo The overlap panel being loaded.
     * @param {OverlapPanelInfo} aAnchorPanel The anchor panel that defines the comparison duration.
     * @returns {Promise<{ startTime: number | undefined; chartSeries: ChartSeriesData | undefined }>} The overlap load result for the panel.
     */
    const fetchOverlapPanelData = useCallback(
        async function fetchOverlapPanelData(
            panelInfo: OverlapPanelInfo,
            anchorPanel: OverlapPanelInfo,
        ) {
            const sChartWidth = sAreaChart.current?.clientWidth
                ? sAreaChart.current.clientWidth
                : 1;
            const sLimit = panelInfo.board.data.count;
            const sPanelBoardAxes = panelInfo.board.axes;
            const sCount = calculateSampleCount(
                sLimit,
                true,
                panelInfo.isRaw,
                sPanelBoardAxes.x_axis.calculated_data_pixels_per_tick,
                sPanelBoardAxes.x_axis.raw_data_pixels_per_tick,
                sChartWidth,
            );
            const sTagSet = panelInfo.board.data.tag_set;
            if (sTagSet.length === 0) {
                return {
                    startTime: undefined,
                    chartSeries: undefined,
                };
            }

            const sTimeRange = resolveOverlapTimeRange(panelInfo, anchorPanel.duration);
            const sPanelAxes = anchorPanel.board.axes;
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
            const sFetchTimeRange = panelInfo.isRaw
                ? {
                      startTime: Math.round(sTimeRange.startTime),
                      endTime: Math.round(sTimeRange.endTime),
                  }
                : {
                      startTime: alignOverlapTime(Math.round(sTimeRange.startTime), sIntervalTime),
                      endTime: alignOverlapTime(Math.round(sTimeRange.endTime), sIntervalTime),
                  };
            const sFetchResult = panelInfo.isRaw
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

            const sSeriesStartTime = panelInfo.isRaw
                ? panelInfo.start
                : sFetchTimeRange.startTime;

            const sOverlapRows = mapOverlapRows(
                mapRowsToChartData(sFetchResult.data?.rows),
                sSeriesStartTime,
            );

            return {
                startTime: sSeriesStartTime,
                chartSeries: buildChartSeriesData(
                    sTagSetElement,
                    sOverlapRows,
                    panelInfo.isRaw,
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
        async function loadOverlapData(panelsInfo: OverlapPanelInfo[]) {
            if (!panelsInfo.length) return;

            const sAnchorPanel = panelsInfo[0];
            const sLoadResults = await Promise.all(
                panelsInfo.map((panelInfo) => fetchOverlapPanelData(panelInfo, sAnchorPanel)),
            );
            const sLoadState = buildOverlapLoadState(sLoadResults);

            setStartTimeList(sLoadState.startTimes);
            setSeriesData(sLoadState.chartSeries);
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
        panelKey: string,
        type: OverlapShiftDirection,
        range: number,
    ) {
        setStartTimeList([]);
        setPanelsInfo((prev) => shiftOverlapPanels(prev, panelKey, type, range));
    }, []);

    /**
     * Renders one time-shift panel for a loaded overlap panel.
     * Intent: Keep the overlap adjustment panel colocated with the rendered panel row.
     * @param {OverlapPanelInfo} item The overlap panel being rendered.
     * @param {number} idx The display index used for the panel color.
     * @returns {JSX.Element}
     */
    function renderOverlapTimeShiftPanel(item: OverlapPanelInfo, idx: number) {
        const sFirstTag = item.board.data.tag_set[0];

        return (
            <OverlapTimeShiftPanel
                pColorIndex={idx}
                key={item.board.meta.index_key}
                pLabel={getSeriesShortName(sFirstTag)}
                pStart={item.start}
                pDuration={sAnchorPanel.duration}
                pOnShiftTime={(direction: OverlapShiftDirection, range: number) =>
                    shiftPanelTime(item.board.meta.index_key, direction, range)
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
    const sCanRenderChart = Boolean(sAnchorPanel && sSeriesData[sPanelsInfo.length - 1]);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;
    const sOverlapChartInfo = useMemo<OverlapChartInfo>(
        () => ({
            seriesData: sSeriesData,
            seriesStartTimeList: sStartTimeList,
            includeZeroInYAxisRange:
                sAnchorPanel?.board.axes.left_y_axis.zero_base ?? false,
        }),
        [sAnchorPanel?.board.axes.left_y_axis.zero_base, sSeriesData, sStartTimeList],
    );

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
                                option={buildOverlapChartOption(sOverlapChartInfo)}
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
