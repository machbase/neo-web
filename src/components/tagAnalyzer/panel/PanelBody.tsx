import NewEChart from './NewEChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import { FFTModal } from '@/components/modal/FFTModal';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';
import type { TagAnalyzerPanelBodyProps } from './TagAnalyzerPanelTypes';

// Combines the chart view with the local popup UI around it.
// It renders the graph, range move buttons, FFT modal, and the min/max/avg selection summary.
const PanelBody = ({
    pChartRefs,
    pChartModel,
    pChartActions,
    pBodyActions,
    pPopupState,
}: TagAnalyzerPanelBodyProps) => {
    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={() => pBodyActions.onMoveTimeRange('l')}
                />
                <div className="chart-body" ref={pChartRefs.areaChart as any}>
                    <NewEChart
                        pChartRefs={pChartRefs}
                        pChartModel={pChartModel}
                        pChartActions={pChartActions}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={() => pBodyActions.onMoveTimeRange('r')}
                />
            </div>
            {pPopupState.isFFTModal ? (
                <FFTModal
                    pInfo={pPopupState.minMaxList}
                    setIsOpen={pPopupState.setIsFFTModal}
                    pStartTime={pPopupState.fftMinTime}
                    pEndTime={pPopupState.fftMaxTime}
                    pTagColInfo={pPopupState.tagSet}
                />
            ) : null}
            <Popover isOpen={pPopupState.isMinMaxMenu} position={pPopupState.menuPosition} onClose={pBodyActions.onCloseMinMaxPopup}>
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button size="sm" variant="ghost" onClick={pBodyActions.onCloseMinMaxPopup} icon={<Close size={16} />} />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(pPopupState.fftMinTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(pPopupState.fftMaxTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>{'( ' + pBodyActions.getDuration(pPopupState.fftMinTime, pPopupState.fftMaxTime) + ' )'}</Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>name</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>min</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>max</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>avg</Page.DpRow>
                    </Page.DpRow>
                    {pPopupState.minMaxList.map((aItem: any, aIndex: number) => {
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
