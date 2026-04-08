import PanelChart from './PanelChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import PanelFftModal from './PanelFftModal';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page, Toast } from '@/design-system/components';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { isEmpty } from '@/utils';
import { computeSeriesCalcList, getDuration } from '../TagAnalyzerUtils';
import { getSelectionMenuPosition } from './PanelRuntimeUtils';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelRangeChangeEvent,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from './TagAnalyzerPanelTypes';
import type { TagAnalyzerMinMaxItem, TagAnalyzerTagItem } from './TagAnalyzerPanelModelTypes';

type DragSelectState = {
    isOpen: boolean;
    startTime: number;
    endTime: number;
    minMaxList: TagAnalyzerMinMaxItem[];
    menuPosition: { x: number; y: number };
};

const INITIAL_DRAG_SELECT_STATE: DragSelectState = {
    isOpen: false,
    startTime: 0,
    endTime: 0,
    minMaxList: [],
    menuPosition: { x: 0, y: 0 },
};

/**
 * Combines the chart view with the local popup UI around it.
 * It renders the graph, range move buttons, FFT modal, and the min/max/avg selection summary.
 * @param props The panel body props and chart interaction handlers.
 * @returns The rendered panel body around the shared chart component.
 */
const PanelBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
    pTagSet,
    pSetIsFFTModal,
    pOnDragSelectStateChange,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: Omit<PanelChartHandlers, 'onSelection'>;
    pShiftHandlers: Pick<PanelShiftHandlers, 'onShiftPanelRangeLeft' | 'onShiftPanelRangeRight'>;
    pTagSet: TagAnalyzerTagItem[];
    pSetIsFFTModal: (aValue: boolean | ((aPrev: boolean) => boolean)) => void;
    pOnDragSelectStateChange: (aIsDragSelectActive: boolean, aCanOpenFft: boolean) => void;
}) => {
    const [dragSelectState, setDragSelectState] = useState(INITIAL_DRAG_SELECT_STATE);

    useEffect(() => {
        if (!pPanelState.isDragSelectActive) {
            setDragSelectState(INITIAL_DRAG_SELECT_STATE);
        }
    }, [pPanelState.isDragSelectActive]);

    /**
     * Captures the selected chart window and opens the local stats popup for that range.
     * @param event The selected chart range from the brush interaction.
     * @returns `false` to stop the chart selection handler from continuing.
     */
    const handleSelection = (event: PanelRangeChangeEvent) => {
        if (event.min === undefined || event.max === undefined || !pNavigateState.chartData) {
            return false;
        }

        const calcList = computeSeriesCalcList(pNavigateState.chartData, pTagSet, event.min, event.max);
        if (isEmpty(calcList)) {
            Toast.error('There is no data in the selected area.');
            return false;
        }

        setDragSelectState({
            isOpen: true,
            startTime: Math.floor(event.min),
            endTime: Math.ceil(event.max),
            minMaxList: calcList,
            menuPosition: getSelectionMenuPosition(pChartRefs.areaChart.current?.getBoundingClientRect()),
        });
        pOnDragSelectStateChange(true, true);
        return false;
    };

    /**
     * Clears the current drag selection and closes the summary popup.
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
                <div className="chart-body" ref={pChartRefs.areaChart}>
                    <PanelChart
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
            <PanelFftModal
                pTagSet={pTagSet}
                pIsOpen={pPanelState.isFFTModal}
                pSetIsOpen={pSetIsFFTModal}
                pMinMaxList={dragSelectState.minMaxList}
                pStartTime={dragSelectState.startTime}
                pEndTime={dragSelectState.endTime}
            />
            <Popover isOpen={dragSelectState.isOpen} position={dragSelectState.menuPosition} onClose={handleCloseDragSelect}>
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button size="sm" variant="ghost" onClick={handleCloseDragSelect} icon={<Close size={16} />} />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(dragSelectState.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(dragSelectState.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>{'( ' + getDuration(dragSelectState.startTime, dragSelectState.endTime) + ' )'}</Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>name</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>min</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>max</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>avg</Page.DpRow>
                    </Page.DpRow>
                    {dragSelectState.minMaxList.map((aItem, aIndex) => {
                        return (
                            <Page.DpRow key={aItem.name + aIndex}>
                                <Page.ContentText pContent={aItem?.name ?? ''} style={{ flex: 1 }} />
                                <Page.ContentText pContent={aItem?.min ?? ''} style={{ flex: 1 }} />
                                <Page.ContentText pContent={aItem?.max ?? ''} style={{ flex: 1 }} />
                                <Page.ContentText pContent={aItem?.avg ?? ''} style={{ flex: 1 }} />
                            </Page.DpRow>
                        );
                    })}
                </Page>
            </Popover>
        </>
    );
};
export default PanelBody;
