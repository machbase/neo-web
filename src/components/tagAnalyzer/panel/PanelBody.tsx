import NewEChart from './NewEChart';
import { VscChevronLeft, VscChevronRight, Close } from '@/assets/icons/Icon';
import { FFTModal } from '@/components/modal/FFTModal';
import { Popover } from '@/design-system/components/Popover';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';

const PanelBody = ({
    pAreaChart,
    pChartRef,
    pPanelInfo,
    pIsRaw,
    pSetExtremes,
    pSetNavigatorExtremes,
    pNavigatorData,
    pChartData,
    pPanelRange,
    pNavigatorRange,
    pViewMinMaxPopup,
    pIsUpdate,
    pMinMaxList,
    pMoveTimRange,
    pIsFFTModal,
    pSetIsFFTModal,
    pFFTMinTime,
    pFFTMaxTime,
    pIsMinMaxMenu,
    pMenuPosition,
    pCtrMinMaxPopupModal,
    pGetDuration,
}: any) => {
    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={() => pMoveTimRange('l')}
                />
                <div className="chart-body" ref={pAreaChart}>
                    <NewEChart
                        pAreaChart={pAreaChart}
                        pChartWrap={pChartRef}
                        pPanelInfo={pPanelInfo}
                        pIsRaw={pIsRaw}
                        pSetExtremes={pSetExtremes}
                        pSetNavigatorExtremes={pSetNavigatorExtremes}
                        pNavigatorData={pNavigatorData}
                        pChartData={pChartData}
                        pPanelRange={pPanelRange}
                        pNavigatorRange={pNavigatorRange}
                        pViewMinMaxPopup={pViewMinMaxPopup}
                        pIsUpdate={pIsUpdate}
                        pMinMaxList={pMinMaxList}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={() => pMoveTimRange('r')}
                />
            </div>
            {pIsFFTModal ? (
                <FFTModal
                    pInfo={pMinMaxList}
                    setIsOpen={pSetIsFFTModal}
                    pStartTime={pFFTMinTime}
                    pEndTime={pFFTMaxTime}
                    pTagColInfo={pPanelInfo.tag_set}
                />
            ) : null}
            <Popover isOpen={pIsMinMaxMenu} position={pMenuPosition} onClose={pCtrMinMaxPopupModal}>
                <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                    <Page.DpRow style={{ justifyContent: 'end' }}>
                        <Button size="sm" variant="ghost" onClick={pCtrMinMaxPopupModal} icon={<Close size={16} />} />
                    </Page.DpRow>
                    <Page.ContentDesc>
                        {moment(pFFTMinTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                        {moment(pFFTMaxTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                    </Page.ContentDesc>
                    <Page.DpRow style={{ justifyContent: 'center' }}>
                        <Page.ContentDesc>{'( ' + pGetDuration(pFFTMinTime, pFFTMaxTime) + ' )'}</Page.ContentDesc>
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>name</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>min</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>max</Page.DpRow>
                        <Page.DpRow style={{ flex: 1 }}>avg</Page.DpRow>
                    </Page.DpRow>
                    {pMinMaxList.map((aItem: any, aIndex: number) => {
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
