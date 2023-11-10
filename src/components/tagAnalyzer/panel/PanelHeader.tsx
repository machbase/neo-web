import { useEffect, useState } from 'react';
import './PanelHeader.scss';
import { changeUtcToText } from '@/utils/helpers/date';
import EditPanel from './edit/EditPanel';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { Refresh, GearFill, Delete, MdRawOn, MdFlagCircle, PiSelectionPlusBold, LineChart } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';

const PanelHeader = ({
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
    pIsMinMaxPopup,
    pSetIsMinMaxPopup,
    pSetIsFFTModal,
    pIsUpdate,
    pSetIsUpdate,
}: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sPanelRange, setPanelRage] = useState<any>({ startTime: 0, endTime: 0 });
    const [sEditPanel, setEditPanel] = useState<boolean>(false);

    useEffect(() => {
        pPanelRange.startTime && setPanelRage({ startTime: changeUtcToText(pPanelRange.startTime), endTime: changeUtcToText(pPanelRange.endTime) });
    }, [pPanelRange]);

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

    const handleSelection = () => {
        pSetIsMinMaxPopup(!pIsMinMaxPopup);
        if (!pIsMinMaxPopup === false) {
            pSetIsUpdate(false);
        }
    };

    return (
        <div className="panel-header">
            <div onClick={() => pPanelInfo.tag_set.length === 1 && clickHeader()} className="title">
                {pPanelsInfo && pPanelsInfo.length > 0 && pPanelsInfo[0].board.index_key === pPanelInfo.index_key && <MdFlagCircle></MdFlagCircle>}
                {pPanelInfo.chart_title}
            </div>
            <div className="time">
                {sPanelRange.startTime} ~ {sPanelRange.endTime}
                <span> {!pIsRaw && ` ( interval : ${pRangeOption.IntervalValue}${pRangeOption.IntervalType} )`}</span>
            </div>
            <div className="options">
                <div className="raw">
                    <IconButton pWidth={38} pHeight={32} pIcon={<MdRawOn style={{ color: pIsRaw ? '#fdb532 ' : '' }} />} onClick={() => pSetIsRaw(!pIsRaw)} />
                </div>
                <div className="divider" />
                <IconButton pWidth={25} pHeight={25} pIcon={<PiSelectionPlusBold style={{ color: pIsMinMaxPopup ? '#f8f8f8' : '' }} />} onClick={() => handleSelection()} />
                <div style={{ display: pIsMinMaxPopup && pIsUpdate ? 'initial' : 'none' }}>
                    <IconButton pWidth={25} pHeight={25} pIcon={<LineChart />} onClick={() => pSetIsFFTModal(true)} />
                </div>
                <div className="divider" />
                <IconButton pWidth={25} pIcon={<Refresh />} onClick={() => pFetchPanelData()} />
                {!pIsEdit && <IconButton pWidth={25} pIcon={<GearFill />} onClick={() => setEditPanel(true)} />}
                {!pIsEdit && <IconButton pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />}
            </div>
            {sEditPanel && <EditPanel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pSetEditPanel={setEditPanel}></EditPanel>}
        </div>
    );
};
export default PanelHeader;
