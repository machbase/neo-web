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

const EditPanel = ({ pPanelInfo, pBoardInfo, pSetEditPanel }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sGlobalSelectedTab] = useRecoilState<any>(gSelectedTab);

    const [sSelectedTab, setSelectedTab] = useState('General');
    const [sPanelInfo, setPanelInfo] = useState<any>({});
    const [sCopyPanelInfo, setCopyPanelInfo] = useState<any>({});

    const [sLoading] = useState<boolean>(false);

    useEffect(() => {
        setPanelInfo(pPanelInfo);
        setCopyPanelInfo(pPanelInfo);
    }, []);

    const apply = () => {
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
        pSetEditPanel(false);
    };

    const [sData] = useState<any>(['General', 'Data', 'Axes', 'Display', 'TimeRange']);
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
                <div className="chart">{sPanelInfo.index_key && !sLoading && <Panel pBoardInfo={pBoardInfo} pPanelInfo={sPanelInfo} pIsEdit={true}></Panel>}</div>
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
                            {sCopyPanelInfo.index_key && <TimeRange pPanelInfo={sCopyPanelInfo} pSetCopyPanelInfo={setCopyPanelInfo}></TimeRange>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button className="apply" onClick={() => apply()}>
                    Apply
                </button>
                <button className="ok" onClick={() => save()}>
                    OK
                </button>
                <button className="cancel" onClick={() => pSetEditPanel(false)}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default EditPanel;