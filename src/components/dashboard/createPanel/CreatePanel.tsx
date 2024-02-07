import './CreatePanel.scss';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { TextButton } from '@/components/buttons/TextButton';
import SplitPane, { Pane } from 'split-pane-react';
import { useEffect, useState } from 'react';
import CreatePanelBody from './CreatePanelBody';
import CreatePanelFooter from './CreatePanelFooter';
import CreatePanelRight from './CreatePanelRight';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { createDefaultTagTableOption, getTableType } from '@/utils/dashboardUtil';
import { getTableList } from '@/api/repository/api';
import moment from 'moment';
import { decodeJwt, generateUUID, isValidJSON } from '@/utils';
import { DefaultChartOption, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { fetchTags } from '@/api/repository/machiot';

const CreatePanel = ({
    pLoopMode,
    pPanelId,
    pSetCreateModal,
    pType,
    pBoardInfo,
    pSetType,
    pModifyState,
    pSetModifyState,
}: {
    pLoopMode: boolean;
    pPanelId: string;
    pType: 'create' | 'edit' | undefined;
    pSetCreateModal: (aValue: boolean) => void;
    pBoardInfo: any;
    pSetType: any;
    pModifyState: { id: string; state: boolean };
    pSetModifyState: any;
}) => {
    const [sSideSizes, setSideSizes] = useState<any>(['75%', '25%']);
    const [sBottomSizes, setBottomSizes] = useState<any>(['50%', '50%']);
    const [sInsetDraging, setInsetDraging] = useState(false);
    const [sPanelOption, setPanelOption] = useState<any>({});
    const [sAppliedPanelOption, setAppliedPanelOption] = useState<any>({});
    const [sTableList, setTableList] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const addPanel = () => {
        if (sPanelOption.useCustomTime) {
            let sStart: any;
            let sEnd: any;
            if (typeof sPanelOption.timeRange.start === 'string' && sPanelOption.timeRange.start.includes('now')) {
                sStart = sPanelOption.timeRange.start;
            } else {
                sStart = moment(sPanelOption.timeRange.start).unix() * 1000;
                if (sStart < 0 || isNaN(sStart)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (typeof sPanelOption.timeRange.end === 'string' && sPanelOption.timeRange.end.includes('now')) {
                sEnd = sPanelOption.timeRange.end;
            } else {
                sEnd = moment(sPanelOption.timeRange.end).unix() * 1000;
                if (sEnd < 0 || isNaN(sEnd)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
        }
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === pBoardInfo.id ? { ...aItem, dashboard: { ...aItem.dashboard, panels: [...aItem.dashboard.panels, sPanelOption] } } : aItem;
            })
        );
        pSetModifyState({ id: sPanelOption.id, state: true });
        handleClose();
    };

    const editPanel = () => {
        const sNewPanelId = generateUUID();
        setBoardList((aPrev: any) => {
            return aPrev.map((aItem: any) => {
                return aItem.id === pBoardInfo.id
                    ? {
                          ...aItem,
                          dashboard: {
                              ...aItem.dashboard,
                              panels: aItem.dashboard.panels.map((bItem: any) => {
                                  return bItem.id === pPanelId ? { ...sPanelOption, id: sNewPanelId } : bItem;
                              }),
                          },
                      }
                    : aItem;
            });
        });
        pSetModifyState({ id: sNewPanelId, state: true });
        handleClose();
    };

    const applyPanel = () => {
        const sTmpPanelOption = JSON.parse(JSON.stringify(sPanelOption));

        if (sTmpPanelOption.useCustomTime) {
            let sStart: any;
            let sEnd: any;
            if (typeof sTmpPanelOption.timeRange.start === 'string' && sTmpPanelOption.timeRange.start.includes('now')) {
                sStart = sTmpPanelOption.timeRange.start;
            } else {
                sStart = moment(sTmpPanelOption.timeRange.start).unix() * 1000;
                if (sStart < 0 || isNaN(sStart)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (typeof sTmpPanelOption.timeRange.end === 'string' && sTmpPanelOption.timeRange.end.includes('now')) {
                sEnd = sTmpPanelOption.timeRange.end;
            } else {
                sEnd = moment(sTmpPanelOption.timeRange.end).unix() * 1000;
                if (sEnd < 0 || isNaN(sEnd)) {
                    Error('Please check the entered time.');
                    return;
                }
            }
            if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                const sTempOption = { ...sTmpPanelOption, timeRange: { ...sTmpPanelOption.timeRange, start: sStart, end: sEnd } };
                setAppliedPanelOption(sTempOption);
                pSetModifyState({ id: sTempOption.id, state: true });
            }
        } else {
            if (isValidJSON(JSON.stringify(sTmpPanelOption))) {
                setAppliedPanelOption(sTmpPanelOption);
                pSetModifyState({ id: sTmpPanelOption.id, state: true });
            }
        }
    };

    const getTables = async (aStatus: boolean) => {
        const sResult: any = await getTableList();
        if (sResult.success) {
            // TODO 만약 나중에 다른 테이블 추가하면 설정해줘야함
            const newTable = sResult.data.rows.filter((aItem: any) => getTableType(aItem[4]) === 'log' || getTableType(aItem[4]) === 'tag');
            setTableList(newTable);
            if (aStatus) {
                if (pType === 'create') {
                    const sToken = localStorage.getItem('accessToken');
                    if (sToken) {
                        let sOption = DefaultChartOption;
                        const sTableType = getTableType(newTable[0][4]);
                        let sData: any = null;
                        let sTag: string = '';
                        if (sTableType === 'tag') sData = await fetchTags(newTable[0][3]);
                        if (sData && sData.success && sData.data && sData.data.rows && sData.data.rows.length > 0) sTag = sData.data.rows[0][1];
                        sOption = {
                            ...sOption,
                            id: generateUUID(),
                            blockList: createDefaultTagTableOption(decodeJwt(sToken).sub, newTable[0], sTableType, sTag),
                        };
                        sOption.chartOptions = getDefaultSeriesOption(sOption.type);
                        setPanelOption(sOption);
                        setAppliedPanelOption(JSON.parse(JSON.stringify(sOption)));
                    }
                } else {
                    setPanelOption(pBoardInfo.dashboard.panels.find((aItem: any) => aItem.id === pPanelId));
                    setAppliedPanelOption(JSON.parse(JSON.stringify(pBoardInfo.dashboard.panels.find((aItem: any) => aItem.id === pPanelId))));
                }
            }
        }
    };

    const handleClose = () => {
        pSetType(undefined);
        pSetCreateModal(false);
    };

    const init = async () => {
        getTables(true);
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="create-panel-form">
            <div className="header">
                <div className="left">
                    <IconButton pWidth={20} pHeight={32} pIcon={<IoArrowBackOutline />} onClick={handleClose} />
                    <span>Create panel</span>
                </div>

                <div className="right">
                    <TextButton
                        pHeight={28}
                        pWidth={75}
                        pIsDisabled={false}
                        onClick={handleClose}
                        pFontColor="rgb(231 65 131)"
                        pText="Discard"
                        pBorderColor="rgb(231 65 131)"
                        pBorderRadius={2}
                        pBackgroundColor="transparent"
                    />
                    <TextButton
                        pBorderColor="#4199ff"
                        pHeight={28}
                        pWidth={65}
                        pFontColor="#4199ff"
                        pBorderRadius={2}
                        pIsDisabled={JSON.stringify(sPanelOption) === JSON.stringify(sAppliedPanelOption)}
                        onClick={() => applyPanel()}
                        pText="Apply"
                        pBackgroundColor="transparent"
                    />
                    <TextButton
                        pBorderColor="#4199ff"
                        pHeight={28}
                        pWidth={65}
                        pBorderRadius={2}
                        pIsDisabled={false}
                        onClick={pType === 'create' ? () => addPanel() : () => editPanel()}
                        pText="Save"
                        pBackgroundColor="#4199ff"
                    />
                </div>
            </div>

            <div className="body">
                <SplitPane
                    className="split-side"
                    sashRender={() => <></>}
                    split="vertical"
                    onDragEnd={() => setInsetDraging(false)}
                    onDragStart={() => setInsetDraging(true)}
                    sizes={sSideSizes}
                    onChange={setSideSizes}
                >
                    <Pane maxSize="95%">
                        <SplitPane
                            onDragEnd={() => setInsetDraging(false)}
                            onDragStart={() => setInsetDraging(true)}
                            className="split-bottom"
                            sashRender={() => <></>}
                            split="horizontal"
                            sizes={sBottomSizes}
                            onChange={setBottomSizes}
                        >
                            <Pane maxSize="90%">
                                {sAppliedPanelOption.id && (
                                    <CreatePanelBody
                                        pLoopMode={pLoopMode}
                                        pBoardInfo={pBoardInfo}
                                        pType={pType}
                                        pInsetDraging={sInsetDraging}
                                        pPanelInfo={sAppliedPanelOption}
                                        pModifyState={pModifyState}
                                        pSetModifyState={pSetModifyState}
                                    />
                                )}
                            </Pane>
                            <Pane>
                                {sPanelOption.id && (
                                    <CreatePanelFooter pType={pType} pGetTables={getTables} pTableList={sTableList} pPanelOption={sPanelOption} pSetPanelOption={setPanelOption} />
                                )}
                            </Pane>
                        </SplitPane>
                    </Pane>
                    <Pane>{sPanelOption.id && <CreatePanelRight pType={pType} pPanelOption={sPanelOption} pSetPanelOption={setPanelOption} />}</Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default CreatePanel;
