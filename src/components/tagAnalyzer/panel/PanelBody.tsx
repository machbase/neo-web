import NewEChart from './NewEChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import PanelFFTModal from './PanelFFTModal';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelNavigationHandlers,
    PanelState,
} from './TagAnalyzerPanelTypes';
import type { TagAnalyzerTagItem } from './TagAnalyzerPanelModelTypes';

// Combines the chart view with the local popup UI around it.
// It renders the graph, range move buttons, FFT modal, and the min/max/avg selection summary.
const PanelBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pNavigationHandlers,
    pTagSet,
    pSetIsFFTModal,
    pOnCloseSelection,
    pGetDuration,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pNavigationHandlers: PanelNavigationHandlers;
    pTagSet: TagAnalyzerTagItem[];
    pSetIsFFTModal: (aValue: boolean | ((aPrev: boolean) => boolean)) => void;
    pOnCloseSelection: () => void;
    pGetDuration: (aStartTime: number, aEndTime: number) => string;
}) => {
    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={() => pNavigationHandlers.onShiftPanelRange('left')}
                />
                <div className="chart-body" ref={pChartRefs.areaChart as any}>
                    <NewEChart
                        pChartRefs={pChartRefs}
                        pChartState={pChartState}
                        pPanelState={pPanelState}
                        pNavigateState={pNavigateState}
                        pChartHandlers={pChartHandlers}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={() => pNavigationHandlers.onShiftPanelRange('right')}
                />
            </div>
            <PanelFFTModal
                pTagSet={pTagSet}
                pIsOpen={pPanelState.isFFTModal}
                pSetIsOpen={pSetIsFFTModal}
                pMinMaxList={pPanelState.minMaxList}
                pStartTime={pPanelState.fftMinTime}
                pEndTime={pPanelState.fftMaxTime}
            />
            <Popover isOpen={pPanelState.isSelectionMenuOpen} position={pPanelState.menuPosition} onClose={pOnCloseSelection}>
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button size="sm" variant="ghost" onClick={pOnCloseSelection} icon={<Close size={16} />} />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(pPanelState.fftMinTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(pPanelState.fftMaxTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>{'( ' + pGetDuration(pPanelState.fftMinTime, pPanelState.fftMaxTime) + ' )'}</Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>name</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>min</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>max</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>avg</Page.DpRow>
                    </Page.DpRow>
                    {pPanelState.minMaxList.map((aItem: any, aIndex: number) => {
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
