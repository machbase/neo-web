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
import { DefaultChartOption, ChartSeriesOption } from '@/utils/eChartHelper';

const CreatePanel = ({ pPanelId, pSetCreateModal, pType, pBoardInfo }: { pPanelId: string; pType: string; pSetCreateModal: (aValue: boolean) => void; pBoardInfo: any }) => {
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

        pSetCreateModal(false);
    };

    const editPanel = () => {
        setBoardList((aPrev: any) => {
            return aPrev.map((aItem: any) => {
                return aItem.id === pBoardInfo.id
                    ? {
                          ...aItem,
                          dashboard: {
                              ...aItem.dashboard,
                              panels: aItem.dashboard.panels.map((bItem: any) => {
                                  return bItem.id === pPanelId ? sPanelOption : bItem;
                              }),
                          },
                      }
                    : aItem;
            });
        });
        pSetCreateModal(false);
    };

    const applyPanel = () => {
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
            if (isValidJSON(JSON.stringify(sPanelOption))) {
                const sTempOption = JSON.parse(JSON.stringify({ ...sPanelOption, timeRange: { ...sPanelOption.timeRange, start: sStart, end: sEnd } }));
                setAppliedPanelOption(sTempOption);
            }
        } else {
            if (isValidJSON(JSON.stringify(sPanelOption))) {
                setAppliedPanelOption(JSON.parse(JSON.stringify(sPanelOption)));
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
                        sOption = {
                            ...sOption,
                            id: generateUUID(),
                            tagTableInfo: createDefaultTagTableOption(decodeJwt(sToken).sub, newTable[0]),
                            chartInfo: ChartSeriesOption,
                        };
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
                    <IconButton pWidth={20} pHeight={32} pIcon={<IoArrowBackOutline></IoArrowBackOutline>} onClick={() => pSetCreateModal(false)}></IconButton>
                    <span>Create Panel</span>
                </div>

                <div className="right">
                    <TextButton
                        pHeight={28}
                        pWidth={75}
                        pIsDisabled={false}
                        onClick={() => pSetCreateModal(false)}
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
                                {sAppliedPanelOption.id && <CreatePanelBody pBoardInfo={pBoardInfo} pType={pType} pInsetDraging={sInsetDraging} pPanelInfo={sAppliedPanelOption} />}
                            </Pane>
                            <Pane>
                                {sPanelOption.id && (
                                    <CreatePanelFooter
                                        pType={pType}
                                        pGetTables={getTables}
                                        pTableList={sTableList}
                                        pPanelOption={sPanelOption}
                                        pSetPanelOption={setPanelOption}
                                    ></CreatePanelFooter>
                                )}
                            </Pane>
                        </SplitPane>
                    </Pane>
                    <Pane>{sPanelOption.id && <CreatePanelRight pPanelOption={sPanelOption} pSetPanelOption={setPanelOption}></CreatePanelRight>}</Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default CreatePanel;
