import { useEffect, useState } from 'react';
import './EditPanel.scss';
import Panel from '../Panel';
import Axes from './Axes';
import Data from './Data';
import Display from './Display';
import TimeRange from './TimeRange';
import General from './General';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { GearFill, Close } from '@/assets/icons/Icon';
import { TextButton } from '@/components/buttons/TextButton';
import { deepEqual } from '@/utils/index';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { convertTimeToFullDate } from '@/utils/helpers/date';
import { fetchVirtualStatTable } from '@/api/repository/machiot';

const EditPanel = ({ pPanelInfo, pBoardInfo, pSetEditPanel, pSetSaveEditedInfo, pNavigatorRange }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sGlobalSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<any>(undefined);
    const [sSelectedTab, setSelectedTab] = useState('General');
    const [sPanelInfo, setPanelInfo] = useState<any>({});
    const [sCopyPanelInfo, setCopyPanelInfo] = useState<any>({});
    const [sIsConfirmModal, setIsConfirmModal] = useState<boolean>(false);
    const [sLoading] = useState<boolean>(false);
    const [sData] = useState<any>(['General', 'Data', 'Axes', 'Display', 'TimeRange']);

    const timeConverter = async (aTargetTime: any) => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        // Set last
        if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('last')) {
            const sLastRange = await getBgnEndTimeRange(aTargetTime.tag_set, { bgn: aTargetTime.range_bgn, end: aTargetTime.range_end }, { bgn: '', end: '' });
            sData = {
                bgn_min: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                bgn_max: subtractTime(sLastRange.end_max as number, aTargetTime.range_bgn),
                end_min: (sLastRange.end_max as number) / 1000000,
                end_max: (sLastRange.end_max as number) / 1000000,
            };
        }
        // Set now
        if (typeof aTargetTime.range_bgn === 'string' && aTargetTime.range_bgn.includes('now')) {
            const sNowTimeBgn = convertTimeToFullDate(aTargetTime.range_bgn);
            const sNowTimeEnd = convertTimeToFullDate(aTargetTime.range_end);
            sData = { bgn_min: sNowTimeBgn, bgn_max: sNowTimeBgn, end_min: sNowTimeEnd, end_max: sNowTimeEnd };
        }
        // Set range
        if (typeof aTargetTime.range_bgn === 'number') {
            sData = { bgn_min: aTargetTime.range_bgn, bgn_max: aTargetTime.range_bgn, end_min: aTargetTime.range_end, end_max: aTargetTime.range_end };
        }
        // Set defulat ('')
        if (aTargetTime.range_bgn === '' || aTargetTime.range_end === '') {
            sData = {
                bgn_min: pNavigatorRange.startTime,
                bgn_max: pNavigatorRange.startTime,
                end_min: pNavigatorRange.endTime,
                end_max: pNavigatorRange.endTime,
            };
        }
        return sData;
    };
    const apply = async () => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (sCopyPanelInfo.range_bgn !== '') sData = await timeConverter(sCopyPanelInfo);
        else if (pBoardInfo.range_bgn !== '')
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].tag_set });
        else {
            const sVirtualStatInfo = await fetchVirtualStatTable(sCopyPanelInfo.tag_set[0].table, [sCopyPanelInfo.tag_set[0].tagName]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setBgnEndTimeRange(() => sData);
        setPanelInfo(sCopyPanelInfo);
    };
    const save = () => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sGlobalSelectedTab
                    ? {
                          ...aItem,
                          panels: aItem.panels.map((bItem: any) => {
                              return bItem.index_key === pPanelInfo.index_key ? sPanelInfo : bItem;
                          }),
                      }
                    : aItem;
            })
        );
        pSetSaveEditedInfo(true);
        pSetEditPanel(false);
    };
    const checkSameWithConfirmModal = () => {
        const sIsSame = deepEqual(sPanelInfo, sCopyPanelInfo);
        if (!sIsSame) {
            setIsConfirmModal(true);
            return;
        } else {
            save();
            return;
        }
    };
    const setInit = async () => {
        let sData: any = { bgn_min: 0, bgn_max: 0, end_min: 0, end_max: 0 };
        if (pPanelInfo.range_bgn !== '') sData = await timeConverter(pPanelInfo);
        else if (pBoardInfo.range_bgn !== '') {
            sData = await timeConverter({ range_end: pBoardInfo.range_end, range_bgn: pBoardInfo.range_bgn, tag_set: pBoardInfo.panels[0].tag_set });
        } else {
            const sVirtualStatInfo = await fetchVirtualStatTable(pPanelInfo.tag_set[0].table, [pPanelInfo.tag_set[0].tagName]);
            sData = {
                bgn_min: sVirtualStatInfo[0][0] / 1000000,
                bgn_max: sVirtualStatInfo[0][0] / 1000000,
                end_min: sVirtualStatInfo[0][1] / 1000000,
                end_max: sVirtualStatInfo[0][1] / 1000000,
            };
        }
        setBgnEndTimeRange(() => sData);
        setPanelInfo(pPanelInfo);
        setCopyPanelInfo(pPanelInfo);
    };

    useEffect(() => {
        setInit();
    }, []);

    return (
        <div className="edit-modal">
            <div className="modal-header">
                <div className="modal-title">
                    <GearFill></GearFill>
                    Edit Chart
                </div>
                <Close onClick={() => pSetEditPanel(false)} color="#f8f8f8"></Close>
            </div>
            <div className="modal-body">
                <div className="chart">
                    {sPanelInfo.index_key && !sLoading && (
                        <Panel pBgnEndTimeRange={sBgnEndTimeRange} pNavigatorRange={pNavigatorRange} pBoardInfo={pBoardInfo} pPanelInfo={sCopyPanelInfo} pIsEdit={true} />
                    )}
                </div>
                <div className="edit-form">
                    <div className="edit-form-tabs">
                        {sData.map((aItem: string) => {
                            return (
                                <div key={aItem}>
                                    <button
                                        style={
                                            aItem === sSelectedTab
                                                ? { color: '#fdb532', boxShadow: 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.16)', background: 'rgba(247, 247, 248, 0.08)' }
                                                : {}
                                        }
                                        onClick={() => setSelectedTab(aItem)}
                                    >
                                        {aItem}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ height: 'calc(100% - 60px)' }}>
                        <div style={sSelectedTab === 'General' ? { height: '100%' } : { display: 'none' }}>
                            {sCopyPanelInfo.index_key && <General pSetCopyPanelInfo={setCopyPanelInfo} pPanelInfo={sCopyPanelInfo}></General>}
                        </div>
                        <div style={sSelectedTab === 'Data' ? { height: '100%' } : { display: 'none' }}>
                            {sCopyPanelInfo.index_key && <Data pSetCopyPanelInfo={setCopyPanelInfo} pPanelInfo={sCopyPanelInfo}></Data>}
                        </div>
                        <div style={sSelectedTab === 'Axes' ? { height: '100%' } : { display: 'none' }}>
                            {sCopyPanelInfo.index_key && <Axes pSetCopyPanelInfo={setCopyPanelInfo} pPanelInfo={sCopyPanelInfo}></Axes>}
                        </div>
                        <div style={sSelectedTab === 'Display' ? { height: '100%' } : { display: 'none' }}>
                            {sCopyPanelInfo.index_key && <Display pSetCopyPanelInfo={setCopyPanelInfo} pPanelInfo={sCopyPanelInfo}></Display>}
                        </div>
                        <div style={sSelectedTab === 'TimeRange' ? { height: '100%' } : { display: 'none' }}>
                            {sCopyPanelInfo.index_key && <TimeRange pPanelInfo={sCopyPanelInfo} pSetCopyPanelInfo={setCopyPanelInfo} />}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <TextButton pWidth={100} pHeight={30} pText="Apply" pBackgroundColor="#fdb532" onClick={apply} />
                <TextButton pWidth={100} pHeight={30} pText="OK" pBackgroundColor="#4199ff" onClick={checkSameWithConfirmModal} />
                <TextButton pWidth={100} pHeight={30} pText="Cancel" pBackgroundColor="#666979" onClick={() => pSetEditPanel(false)} />
            </div>
            {sIsConfirmModal ? <ConfirmModal pIsDarkMode setIsOpen={setIsConfirmModal} pCallback={save} /> : null}
        </div>
    );
};

export default EditPanel;
