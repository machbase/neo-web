import './PanelHeader.scss';
import { useEffect, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Refresh, GearFill, Delete, MdRawOn, MdFlagCircle, PiSelectionPlusBold, LineChart, LuTimerReset, Download, TbTimezone } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Page } from '@/design-system/components';

const PanelHeader = ({
    pResetData,
    pPanelInfo,
    pPanelsInfo,
    pSelectedChart,
    pRangeOption,
    pSetSelectedChart,
    pGetChartInfo,
    pBoardInfo,
    pPanelRange,
    pSetIsRaw,
    pIsRaw,
    pFetchPanelData,
    pIsEdit,
    pCtrMinMaxPopupModal,
    pSetIsFFTModal,
    pIsUpdate,
    pSetSaveEditedInfo,
    pNavigatorRange,
    pIsMinMaxMenuOpen,
    pChartData,
    pChartRef,
    pSetGlobalTimeRange,
    pOnEditRequest,
}: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sPanelRange, setPanelRage] = useState<any>({ startTime: 0, endTime: 0 });
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);
    const { getExperiment } = useExperiment();

    const clickHeader = () => {
        pGetChartInfo(pPanelRange.startTime, pPanelRange.endTime, pPanelInfo, pIsRaw);
        pSetSelectedChart(!pSelectedChart);
    };
    const removePanel = () => {
        pGetChartInfo(pPanelRange.startTime, pPanelRange.endTime, pPanelInfo, pIsRaw, 'delete');
        pSetSelectedChart(!pSelectedChart);
        setBoardList(
            sBoardList.map((aItem: any) => {
                if (aItem.id === sSelectedTab) {
                    return { ...aItem, panels: aItem.panels.filter((bItem: any) => bItem.index_key !== pPanelInfo.index_key) };
                } else {
                    return aItem;
                }
            })
        );
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const handleRefreshTime = async () => {
        pResetData();
    };
    const handleSavedToLocal = () => {
        setIsSavedToLocalModal(true);
    };

    useEffect(() => {
        pPanelRange.startTime && setPanelRage({ startTime: changeUtcToText(pPanelRange.startTime), endTime: changeUtcToText(pPanelRange.endTime) });
    }, [pPanelRange]);

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip={!pIsEdit}
                toolTipContent={pSelectedChart ? 'Disable overlap mode' : 'Enable overlap mode'}
                icon={
                    <div className="title">
                        {pPanelsInfo && pPanelsInfo.length > 0 && pPanelsInfo[0].board.index_key === pPanelInfo.index_key && (
                            <MdFlagCircle size={16} style={{ color: '#fdb532' }} />
                        )}
                        {pPanelInfo.chart_title}
                    </div>
                }
                onClick={() => pPanelInfo.tag_set.length === 1 && clickHeader()}
            />
            <div className="time">
                {sPanelRange.startTime} ~ {sPanelRange.endTime}
                <span> {!pIsRaw && ` ( interval : ${pRangeOption.IntervalValue}${pRangeOption.IntervalType} )`}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={!pIsRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                    icon={<MdRawOn size={16} style={{ color: pIsRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />}
                    onClick={pSetIsRaw}
                    style={{ minWidth: '36px' }}
                />
                {!pIsEdit ? (
                    <>
                        <Page.Divi />
                        <Button
                            size="xsm"
                            variant="ghost"
                            isToolTip
                            toolTipContent={'Drag data range'}
                            active={pIsUpdate}
                            icon={<PiSelectionPlusBold size={16} style={{ color: pIsUpdate ? '#f8f8f8' : '' }} />}
                            onClick={pCtrMinMaxPopupModal}
                        />

                        {pIsMinMaxMenuOpen && pIsUpdate ? (
                            <Button size="xsm" variant="ghost" isToolTip toolTipContent={'FFT chart'} icon={<LineChart size={16} />} onClick={() => pSetIsFFTModal(true)} />
                        ) : null}
                    </>
                ) : null}
                {!pIsEdit ? <Button size="xsm" variant="ghost" isToolTip toolTipContent={'Set global time'} icon={<TbTimezone size={15} />} onClick={pSetGlobalTimeRange} /> : null}
                <Button size="xsm" variant="ghost" isToolTip toolTipContent={'Refresh data'} icon={<Refresh size={14} />} onClick={() => pFetchPanelData(pPanelRange)} />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={handleRefreshTime}
                />
                {!pIsEdit ? (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Edit'}
                        icon={<GearFill size={14} />}
                        onClick={() => pOnEditRequest?.({ pPanelInfo, pBoardInfo, pNavigatorRange, pSetSaveEditedInfo })}
                    />
                ) : null}
                {/* Saved to local */}
                {!pIsEdit && getExperiment() ? (
                    <Button size="xsm" variant="ghost" isToolTip toolTipContent={'Saved to local'} icon={<Download size={16} />} onClick={handleSavedToLocal} />
                ) : null}
                {!pIsEdit && <Button size="xsm" variant="ghost" isToolTip toolTipContent={'Delete'} icon={<Delete size={16} />} onClick={handleDelete} />}
            </Button.Group>
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={removePanel}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                />
            )}
            {sIsSavedToLocalModal && <SavedToLocalModal pPanelInfo={pChartData} pChartRef={pChartRef} pIsDarkMode setIsOpen={setIsSavedToLocalModal} />}
        </div>
    );
};
export default PanelHeader;
