import { useEffect, useState } from 'react';
import './PanelHeader.scss';
import { changeUtcToText } from '@/utils/helpers/date';
import EditPanel from './edit/EditPanel';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Refresh, GearFill, Delete, MdRawOn } from '@/assets/icons/Icon';

const PanelHeader = ({ pPanelInfo, pBoardInfo, pPanelRange, pSetIsRaw, pIsRaw, pFetchPanelData, pIsEdit }: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sPanelRange, setPanelRage] = useState<any>({ startTime: 0, endTime: 0 });
    const [sEditPanel, setEditPanel] = useState<boolean>(false);

    useEffect(() => {
        pPanelRange.startTime && setPanelRage({ startTime: changeUtcToText(pPanelRange.startTime), endTime: changeUtcToText(pPanelRange.endTime) });
    }, [pPanelRange]);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem) => {
                if (aItem.id === sSelectedTab) {
                    return { ...aItem, panels: aItem.panels.filter((bItem: any) => bItem.index_key !== pPanelInfo.index_key) };
                } else {
                    return aItem;
                }
            })
        );
    };
    return (
        <div className="panel-header">
            <div className="title">{pPanelInfo.chart_title}</div>
            <div className="time">
                {sPanelRange.startTime} ~ {sPanelRange.endTime}
            </div>
            <div className="options">
                <button className="raw" onClick={() => pSetIsRaw(!pIsRaw)}>
                    {<MdRawOn color={pIsRaw ? '#fdb532 ' : ''}></MdRawOn>}
                </button>
                <button onClick={() => pFetchPanelData()}>
                    <Refresh />
                </button>
                {!pIsEdit && (
                    <button onClick={() => setEditPanel(true)}>
                        <GearFill></GearFill>
                    </button>
                )}
                {!pIsEdit && (
                    <button onClick={() => removePanel()}>
                        <Delete size="18px"/>
                    </button>
                )}
            </div>
            {sEditPanel && <EditPanel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pSetEditPanel={setEditPanel}></EditPanel>}
        </div>
    );
};
export default PanelHeader;
