import { MdOutlineStackedLineChart, Refresh } from '@/assets/icons/Icon';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import OverlapTimeShiftControls from '../editor/OverlapTimeShiftControls';
import type { OverlapShiftDirection } from '../editor/OverlapTimeShiftControls';
import { Modal } from '@/design-system/components/Modal';
import { Button, Page } from '@/design-system/components';
import type { Dispatch, SetStateAction } from 'react';
import type { ChartSeriesItem } from '../utils/modelTypes';
import type { OverlapPanelInfo } from '../utils/TagAnalyzerTypes';
import { buildOverlapChartOption } from '../panel/chartOptions/OverlapChartOption';
import { calculateInterval } from '../utils/TagAnalyzerTimeUtils';
import { getSourceTagName } from '../utils/legacy/LegacyUtils';
import {
    alignOverlapTime,
    buildOverlapLoadState,
    buildOverlapChartSeries,
    calculateOverlapSampleCount,
    resolveOverlapTimeRange,
    shiftOverlapPanels,
} from './OverlapModalUtils';
import { fetchSeriesRows, mapRowsToChartData } from '../utils/TagAnalyzerFetchUtils';

// Props for the overlap comparison modal.
// Used by OverlapModal to type component props.
type OverlapModalProps = {
    pSetIsModal: Dispatch<SetStateAction<boolean>>;
    pPanelsInfo: OverlapPanelInfo[];
};

// Shows multiple selected panels on a shared time axis so their trends can be compared.
// It fetches overlap data, keeps per-panel offsets, and drives the overlap chart controls.
// Future Refactor Target: this flow still re-implements pieces of the panel fetch pipeline.
/**
 * Renders the overlap comparison modal for the currently selected panels.
 * @param pProps The overlap modal inputs and close handler.
 * @returns The overlap comparison modal.
 */
function OverlapModal({ pSetIsModal, pPanelsInfo }: OverlapModalProps) {
    const [sChartData, setChartData] = useState<ChartSeriesItem[]>([]);
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<InstanceType<typeof ReactECharts> | null>(null);
    const [sStartTimeList, setStartTimeList] = useState<number[]>([]);
    const [sPanelsInfo, setPanelsInfo] = useState<OverlapPanelInfo[]>([]);

    const sRollupTableList = useRecoilValue(gRollupTableList);

    /**
     * Fetches one overlap panel through the shared series-fetch path and normalizes it for the overlap chart.
     * @param aPanelInfo The overlap panel being loaded.
     * @param aAnchorPanel The anchor panel that defines the comparison duration.
     * @returns The overlap load result for the panel.
     * Side effect: performs a repository fetch for the requested overlap series.
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
            const sFetchResult = await fetchSeriesRows(
                sTagSetElement,
                sFetchTimeRange,
                sIntervalTime,
                sCount,
                aPanelInfo.isRaw,
                sRollupTableList,
                undefined,
                undefined,
            );

            const sSeriesStartTime = aPanelInfo.isRaw
                ? aPanelInfo.start
                : sFetchTimeRange.startTime;

            return {
                startTime: sSeriesStartTime,
                chartSeries: buildOverlapChartSeries(
                    sTagSetElement,
                    mapRowsToChartData(sFetchResult.data?.rows),
                    sSeriesStartTime,
                    aPanelInfo.isRaw,
                ),
            };
        },
        [sRollupTableList],
    );

    /**
     * Loads every currently selected overlap panel and rebuilds the chart state in the original panel order.
     * @param aPanelsInfo The overlap panels to load.
     * @returns Nothing.
     * Side effect: performs overlap fetches and stores the rebuilt chart state in local React state.
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
     * @param aPanelKey The target panel key.
     * @param aType The shift direction.
     * @param aRange The shift amount in milliseconds.
     * @returns Nothing.
     * Side effect: updates local overlap-panel state, which triggers a reload effect for the overlap chart.
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
     * Syncs the modal-local overlap panel list from the latest parent selection.
     * @returns Nothing.
     * Side effect: replaces the modal-local overlap panel list from incoming props.
     */
    function syncPanelsInfoFromProps() {
        setPanelsInfo(pPanelsInfo);
    }

    /**
     * Reloads overlap data whenever the modal-local overlap selection changes.
     * @returns Nothing.
     * Side effect: triggers overlap data fetches for the current modal-local panel list.
     */
    function reloadOverlapDataEffect() {
        void loadOverlapData(sPanelsInfo);
    }

    /**
     * Refreshes the currently loaded overlap chart without changing the selected panels.
     * @returns Nothing.
     * Side effect: reloads overlap data for the current modal selection.
     */
    function handleRefresh() {
        if (sChartRef.current) {
            void loadOverlapData(sPanelsInfo);
        }
    }

    /**
     * Closes the overlap modal.
     * @returns Nothing.
     * Side effect: updates the parent-controlled modal-open state.
     */
    function handleCloseModal() {
        pSetIsModal(false);
    }

    /**
     * Renders one set of time-shift controls for a loaded overlap panel.
     * @param aItem The overlap panel being rendered.
     * @param aIdx The display index used for the control color.
     * @returns The time-shift controls for the overlap panel.
     */
    function renderOverlapTimeShiftControl(aItem: OverlapPanelInfo, aIdx: number) {
        const sFirstTag = aItem.board.data.tag_set[0];

        /**
         * Applies a time shift to the rendered overlap panel.
         * @param aDirection The shift direction selected by the control.
         * @param aRange The shift amount in milliseconds.
         * @returns Nothing.
         * Side effect: updates the overlap panel start time in local modal state.
         */
        function handleShiftTimeControl(aDirection: OverlapShiftDirection, aRange: number) {
            shiftPanelTime(aItem.board.meta.index_key, aDirection, aRange);
        }

        return (
            <OverlapTimeShiftControls
                pColorIndex={aIdx}
                key={aItem.board.meta.index_key}
                pLabel={sFirstTag.alias ? sFirstTag.alias : getSourceTagName(sFirstTag)}
                pStart={aItem.start}
                pDuration={sAnchorPanel.duration}
                pOnShiftTime={handleShiftTimeControl}
            />
        );
    }

    useEffect(syncPanelsInfoFromProps, [pPanelsInfo]);

    useEffect(reloadOverlapDataEffect, [loadOverlapData, sPanelsInfo]);

    const sAnchorPanel = sPanelsInfo[0];
    const sCanRenderChart = Boolean(sAnchorPanel && sChartData[sPanelsInfo.length - 1]);
    const sChartWidth = sAreaChart.current?.clientWidth ?? 0;

    return (
        <Modal.Root
            isOpen={true}
            onClose={handleCloseModal}
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
                        onClick={handleRefresh}
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
                                    sAnchorPanel.board.axes.zero_base,
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
                        {sPanelsInfo.map(renderOverlapTimeShiftControl)}
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
