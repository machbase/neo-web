import { useEffect, useState } from 'react';
import './PanelHeader.scss';
import { changeUtcToText } from '@/utils/helpers/date';
import EditPanel from './edit/EditPanel';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Refresh, GearFill, Delete, MdRawOn, MdFlagCircle, PiSelectionPlusBold, LineChart, LuTimerReset, Download } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';

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
}: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sPanelRange, setPanelRage] = useState<any>({ startTime: 0, endTime: 0 });
    const [sEditPanel, setEditPanel] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);

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
            <IconButton
                pWidth={'auto'}
                pHeight={25}
                pIsToopTip={!pIsEdit}
                pToolTipContent={pSelectedChart ? 'Disable overlap mode' : 'Enable overlap mode'}
                pToolTipId={'overlap-data-range-taz-panel-' + JSON.stringify(pIsEdit)}
                // pIsActive={pIsUpdate}
                pIcon={
                    <div className="title">
                        {pPanelsInfo && pPanelsInfo.length > 0 && pPanelsInfo[0].board.index_key === pPanelInfo.index_key && <MdFlagCircle style={{ color: '#fdb532' }} />}
                        {pPanelInfo.chart_title}
                    </div>
                }
                onClick={() => pPanelInfo.tag_set.length === 1 && clickHeader()}
            />
            <div className="time">
                {sPanelRange.startTime} ~ {sPanelRange.endTime}
                <span> {!pIsRaw && ` ( interval : ${pRangeOption.IntervalValue}${pRangeOption.IntervalType} )`}</span>
            </div>
            <div className="options">
                <div className="raw" style={{ display: 'flex' }}>
                    <IconButton
                        pWidth={32}
                        pHeight={25}
                        pIsToopTip
                        pToolTipContent={!pIsRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                        pToolTipId={'raw-data-taz-panel' + JSON.stringify(pIsEdit)}
                        pIcon={
                            <div style={{ height: '15px', display: 'flex' }}>
                                <MdRawOn style={{ color: pIsRaw ? '#fdb532 ' : '', height: '32px', width: '32px', marginTop: '-7px' }} />
                            </div>
                        }
                        onClick={pSetIsRaw}
                    />
                </div>
                {!pIsEdit ? (
                    <>
                        <div className="divider" />
                        <IconButton
                            pWidth={25}
                            pHeight={25}
                            pIsToopTip
                            pToolTipContent={'Drag data range'}
                            pToolTipId={'drag-data-range-taz-panel-' + JSON.stringify(pIsEdit)}
                            pIsActive={pIsUpdate}
                            pIcon={<PiSelectionPlusBold style={{ color: pIsUpdate ? '#f8f8f8' : '' }} />}
                            onClick={pCtrMinMaxPopupModal}
                        />
                        <div style={{ display: pIsMinMaxMenuOpen && pIsUpdate ? 'initial' : 'none' }}>
                            <IconButton
                                pWidth={25}
                                pHeight={25}
                                pIsToopTip
                                pToolTipContent={'FFT chart'}
                                pToolTipId={'fft-taz-panel-' + JSON.stringify(pIsEdit)}
                                pIcon={<LineChart />}
                                onClick={() => pSetIsFFTModal(true)}
                            />
                        </div>
                    </>
                ) : null}
                <div className="divider" />
                <IconButton
                    pWidth={25}
                    pHeight={25}
                    pIsToopTip
                    pToolTipContent={'Refresh data'}
                    pToolTipId={'refresh-taz-panel-data-' + JSON.stringify(pIsEdit)}
                    pIcon={<Refresh />}
                    onClick={() => pFetchPanelData(pPanelRange)}
                />
                <IconButton
                    pWidth={25}
                    pHeight={25}
                    pIsToopTip
                    pToolTipContent={'Refresh time'}
                    pToolTipId={'refresh-taz-panel-time-' + JSON.stringify(pIsEdit)}
                    pIcon={<LuTimerReset />}
                    onClick={handleRefreshTime}
                />
                {!pIsEdit && (
                    <IconButton
                        pWidth={25}
                        pHeight={25}
                        pIsToopTip
                        pToolTipContent={'Edit'}
                        pToolTipId={'edit-taz-panel-' + JSON.stringify(pIsEdit)}
                        pIcon={<GearFill />}
                        onClick={() => setEditPanel(true)}
                    />
                )}
                {/* Saved to local */}
                {!pIsEdit && localStorage.getItem('experimentMode') === 'true' && (
                    <IconButton
                        pWidth={25}
                        pHeight={25}
                        pIsToopTip
                        pToolTipContent={'Saved to local'}
                        pToolTipId={'saved-to-local-taz-panel-' + JSON.stringify(pIsEdit)}
                        pIcon={<Download size={18} />}
                        onClick={handleSavedToLocal}
                    />
                )}
                {!pIsEdit && (
                    <IconButton
                        pWidth={25}
                        pHeight={25}
                        pIsToopTip
                        pToolTipContent={'Delete'}
                        pToolTipId={'delete-taz-panel-' + JSON.stringify(pIsEdit)}
                        pIcon={<Delete size={18} />}
                        onClick={handleDelete}
                    />
                )}
            </div>
            {sEditPanel && (
                <EditPanel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pSetEditPanel={setEditPanel} pNavigatorRange={pNavigatorRange} pSetSaveEditedInfo={pSetSaveEditedInfo} />
            )}
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
