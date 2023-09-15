import './CreatePanel.scss';
import { IoArrowBackOutline } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { TextButton } from '@/components/buttons/TextButton';
import SplitPane, { Pane } from 'split-pane-react';
import { useEffect, useState } from 'react';
import CreatePanelBody from './CreatePanelBody';
import CreatePanelFotter from './CreatePanelFotter';
import CreatePanelRight from './CreatePanelRight';
import { fetchTablesData } from '@/api/repository/machiot';
import { getId } from '@/utils';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { defaultTimeSeriesData, getTableType } from '@/utils/dashboardUtil';
import { getTableList } from '@/api/repository/api';

const CreatePanel = ({ pSetCreateModal, pType, pBoardInfo }: { pType: string; pSetCreateModal: (aValue: boolean) => void; pBoardInfo: any }) => {
    const [sSideSizes, setSideSizes] = useState<any>(['75%', '25%']);
    const [sBottomSizes, setBottomSizes] = useState<any>(['60%', '40%']);
    const [sInsetDraging, setInsetDraging] = useState(false);
    const [sPanelOption, setPanelOption] = useState<any>({});
    const [sTableList, setTableList] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const addPanel = () => {
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === pBoardInfo.id ? { ...aItem, dashboard: { ...aItem.dashboard, panels: [...aItem.dashboard.panels, sPanelOption] } } : aItem;
            })
        );
        pSetCreateModal(false);
    };

    const getTables = async (aStatus: any) => {
        const sResult: any = await getTableList();
        if (sResult.success) {
            const newTable = sResult.data.rows.filter((aItem: any) => getTableType(aItem[4]) === 'log' || getTableType(aItem[4]) === 'tag');

            // const tagTableList = newTable.map((aItem: any) => aItem[sIdx]);
            setTableList(newTable);
            if (aStatus === 'init') {
                setPanelOption(defaultTimeSeriesData(newTable[0]));
            }
        }
    };

    const init = async () => {
        getTables('init');
    };

    useEffect(() => {
        init();

        // setPanelOption(pPanelInfo);
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
                        pBorderRadius={2}
                        pIsDisabled={false}
                        onClick={() => addPanel()}
                        pText="Apply"
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
                            <Pane maxSize="90%">{pBoardInfo.id && <CreatePanelBody pType={pType} pInsetDraging={sInsetDraging} pValue={pBoardInfo}></CreatePanelBody>}</Pane>
                            <Pane>
                                {sTableList.length !== 0 && sPanelOption.i && (
                                    <CreatePanelFotter
                                        pGetTables={getTables}
                                        pTableList={sTableList}
                                        pPanelOption={sPanelOption}
                                        pSetPanelOption={setPanelOption}
                                    ></CreatePanelFotter>
                                )}
                            </Pane>
                        </SplitPane>
                    </Pane>
                    <Pane>
                        <CreatePanelRight></CreatePanelRight>
                    </Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default CreatePanel;
