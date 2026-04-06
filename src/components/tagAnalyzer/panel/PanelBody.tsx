import NewEChart from './NewEChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import { FFTModal } from '@/components/modal/FFTModal';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';
import type { PanelChartHandlers, PanelChartRefs, PanelChartState, PanelDisplayHandlers, PanelSelectionState } from './TagAnalyzerPanelTypes';

// Combines the chart view with the local popup UI around it.
// It renders the graph, range move buttons, FFT modal, and the min/max/avg selection summary.
const PanelBody = ({
    pChartRefs,
    pChartState,
    pChartHandlers,
    pDisplayHandlers,
    pSelectionState,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pChartHandlers: PanelChartHandlers;
    pDisplayHandlers: PanelDisplayHandlers;
    pSelectionState: PanelSelectionState;
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
                    onClick={() => pDisplayHandlers.onMoveTimeRange('l')}
                />
                <div className="chart-body" ref={pChartRefs.areaChart as any}>
                    <NewEChart
                        pChartRefs={pChartRefs}
                        pChartState={pChartState}
                        pChartHandlers={pChartHandlers}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={() => pDisplayHandlers.onMoveTimeRange('r')}
                />
            </div>
            {pSelectionState.isFFTModal ? (
                <FFTModal
                    pInfo={pSelectionState.minMaxList}
                    setIsOpen={pSelectionState.setIsFFTModal}
                    pStartTime={pSelectionState.fftMinTime}
                    pEndTime={pSelectionState.fftMaxTime}
                    pTagColInfo={pSelectionState.tagSet}
                />
            ) : null}
            <Popover isOpen={pSelectionState.isMinMaxMenu} position={pSelectionState.menuPosition} onClose={pDisplayHandlers.onCloseMinMaxPopup}>
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button size="sm" variant="ghost" onClick={pDisplayHandlers.onCloseMinMaxPopup} icon={<Close size={16} />} />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(pSelectionState.fftMinTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(pSelectionState.fftMaxTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>{'( ' + pDisplayHandlers.getDuration(pSelectionState.fftMinTime, pSelectionState.fftMaxTime) + ' )'}</Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>name</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>min</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>max</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>avg</Page.DpRow>
                    </Page.DpRow>
                    {pSelectionState.minMaxList.map((aItem: any, aIndex: number) => {
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
