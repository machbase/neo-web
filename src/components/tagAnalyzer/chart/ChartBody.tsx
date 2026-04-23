import TimeSeriesChart from './TimeSeriesChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page, Toast } from '@/design-system/components';
import moment from 'moment';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { FFTModal } from '../modal/FFTModal';
import { isEmpty } from '@/utils';
import { buildSeriesSummaryRows } from '../utils/series/SeriesSummaryUtils';
import { formatDurationLabel } from '../utils/time/IntervalUtils';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelRangeChangeEvent,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from '../utils/panelRuntimeTypes';
import type {
    SelectedRangeSeriesSummary,
    PanelSeriesConfig,
} from '../utils/series/seriesTypes';

// Used by PanelBody to type drag select state.
type DragSelectState = {
    isOpen: boolean;
    startTime: number;
    endTime: number;
    seriesSummaries: SelectedRangeSeriesSummary[];
    menuPosition: { x: number; y: number };
};

const INITIAL_DRAG_SELECT_STATE: DragSelectState = {
    isOpen: false,
    startTime: 0,
    endTime: 0,
    seriesSummaries: [],
    menuPosition: { x: 0, y: 0 },
};

/**
 * Combines the chart view with the local popup UI around it.
 * Intent: Keep the chart controls and selection popup close to the shared panel chart.
 * @param props The panel body props and chart interaction handlers.
 * @returns The rendered panel body around the shared chart component.
 */
const ChartBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
    pTagSet,
    pSetIsFFTModal,
    pOnDragSelectStateChange,
    pOnHighlightSelection,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pShiftHandlers: PanelShiftHandlers;
    pTagSet: PanelSeriesConfig[];
    pSetIsFFTModal: (aValue: boolean | ((aPrev: boolean) => boolean)) => void;
    pOnDragSelectStateChange: (aIsDragSelectActive: boolean, aCanOpenFft: boolean) => void;
    pOnHighlightSelection: (aStartTime: number, aEndTime: number) => void;
}) => {
    const [dragSelectState, setDragSelectState] = useState(INITIAL_DRAG_SELECT_STATE);

    useEffect(() => {
        if (!pPanelState.isDragSelectActive) {
            setDragSelectState(INITIAL_DRAG_SELECT_STATE);
        }
    }, [pPanelState.isDragSelectActive]);

    /**
     * Captures the selected chart window and opens the local stats popup for that range.
     * Intent: Turn a completed brush selection into the local summary popup state.
     * @param event The selected chart range from the brush interaction.
     * @returns `false` to stop the chart selection handler from continuing.
     */
    const handleSelection = (event: PanelRangeChangeEvent) => {
        if (event.min === undefined || event.max === undefined) {
            return false;
        }

        if (pPanelState.isHighlightActive) {
            pOnHighlightSelection(Math.floor(event.min), Math.ceil(event.max));
            return false;
        }

        const sSeriesSummaries = buildSeriesSummaryRows(
            pNavigateState.chartData,
            pTagSet,
            event.min,
            event.max,
        );
        if (isEmpty(sSeriesSummaries)) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        const sRect = pChartRefs.areaChart.current?.getBoundingClientRect();
        const menuPosition = sRect ? { x: sRect.left - 90, y: sRect.top - 35 } : { x: 10, y: 10 };

        setDragSelectState({
            isOpen: true,
            startTime: Math.floor(event.min),
            endTime: Math.ceil(event.max),
            seriesSummaries: sSeriesSummaries,
            menuPosition,
        });
        pOnDragSelectStateChange(true, true);
        return false;
    };

    /**
     * Clears the current drag selection and closes the summary popup.
     * Intent: Reset the temporary drag-select UI back to its idle state.
     * @returns Nothing.
     */
    const handleCloseDragSelect = () => {
        setDragSelectState(INITIAL_DRAG_SELECT_STATE);
        pOnDragSelectStateChange(false, false);
    };

    const chartHandlers: PanelChartHandlers = {
        ...pChartHandlers,
        onSelection: handleSelection,
    };

    /**
     * Stops right-button presses from reaching the chart surface.
     * Intent: Let the panel context menu open without ECharts treating right click as a drag gesture.
     * @param aEvent The mouse-down event from the chart wrapper.
     * @returns Nothing.
     */
    function handleChartMouseDownCapture(aEvent: MouseEvent<HTMLDivElement>) {
        if (aEvent.button !== 2) {
            return;
        }

        aEvent.preventDefault();
        aEvent.stopPropagation();
    }

    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeLeft}
                />
                <div
                    className="chart-body"
                    ref={pChartRefs.areaChart}
                    onMouseDownCapture={handleChartMouseDownCapture}
                >
                    <TimeSeriesChart
                        pChartRefs={pChartRefs}
                        pChartState={pChartState}
                        pPanelState={pPanelState}
                        pNavigateState={pNavigateState}
                        pChartHandlers={chartHandlers}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeRight}
                />
            </div>
            {pPanelState.isFFTModal && (
                <FFTModal
                    pSeriesSummaries={dragSelectState.seriesSummaries}
                    setIsOpen={pSetIsFFTModal}
                    pStartTime={dragSelectState.startTime}
                    pEndTime={dragSelectState.endTime}
                />
            )}
            <Popover
                isOpen={dragSelectState.isOpen}
                position={dragSelectState.menuPosition}
                onClose={handleCloseDragSelect}
            >
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCloseDragSelect}
                            icon={<Close size={16} />}
                        />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(dragSelectState.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(dragSelectState.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>
                            {'( ' +
                                formatDurationLabel(
                                    dragSelectState.startTime,
                                    dragSelectState.endTime,
                                ) +
                                ' )'}
                        </Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>
                            name
                        </Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>
                            min
                        </Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>
                            max
                        </Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>
                            avg
                        </Page.DpRow>
                    </Page.DpRow>
                    {dragSelectState.seriesSummaries.map((aItem, aIndex) => {
                        return (
                            <Page.DpRow key={aItem.name + aIndex}>
                                <Page.ContentText
                                    pContent={aItem?.name ?? ''}
                                    style={{ flex: 1 }}
                                />
                                <Page.ContentText
                                    pContent={aItem?.min ?? ''}
                                    style={{ flex: 1 }}
                                />
                                <Page.ContentText
                                    pContent={aItem?.max ?? ''}
                                    style={{ flex: 1 }}
                                />
                                <Page.ContentText
                                    pContent={aItem?.avg ?? ''}
                                    style={{ flex: 1 }}
                                />
                            </Page.DpRow>
                        );
                    })}
                </Page>
            </Popover>
        </>
    );
};
export default ChartBody;

