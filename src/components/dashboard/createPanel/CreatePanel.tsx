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

const CreatePanel = ({ pSetCreateModal, pDraged, pInfo, pAddItem }: { pSetCreateModal: (aValue: boolean) => void; pDraged: boolean; pInfo: any; pAddItem: () => void }) => {
    const [sSideSizes, setSideSizes] = useState<any>(['75%', '25%']);
    const [sBottomSizes, setBottomSizes] = useState<any>(['70%', '30%']);
    const [sInsetDraging, setInsetDraging] = useState(false);
    const [sChartOption, setChartOption] = useState<any>({});
    const [sChangedChartOption, setChangedChartOption] = useState<any>({});
    const [sTableList, setTableList] = useState<string[]>([]);

    const addPanel = () => {
        pAddItem();
        pSetCreateModal(false);
    };

    const getTables = async () => {
        const sResult: any = await fetchTablesData();
        if (sResult.success) {
            const sIdx = sResult.data.columns.findIndex((aItem: any) => aItem === 'NAME');

            const newTable = sResult.data.rows.filter((aItem: any) => aItem[4] === 'Tag Table' || aItem[4] === 'Log Table');

            const tagTableList = newTable.map((aItem: any) => aItem[sIdx]);
            setTableList(tagTableList);
        }
    };

    const init = async () => {
        getTables();
    };

    useEffect(() => {
        init();
        console.log(pInfo);
        setChartOption(pInfo);
        setChangedChartOption(pInfo);
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
                        pHeight={28}
                        pWidth={55}
                        pBorderRadius={2}
                        pIsDisabled={false}
                        onClick={() => addPanel()}
                        pBorderColor="#D3D5D5"
                        pFontColor="#121212"
                        pText="Save"
                        pBackgroundColor="#D3D5D5"
                    />
                    <TextButton
                        pBorderColor="#4199ff"
                        pHeight={28}
                        pWidth={65}
                        pBorderRadius={2}
                        pIsDisabled={false}
                        onClick={() => pSetCreateModal(false)}
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
                    <Pane>
                        <SplitPane
                            onDragEnd={() => setInsetDraging(false)}
                            onDragStart={() => setInsetDraging(true)}
                            className="split-bottom"
                            sashRender={() => <></>}
                            split="horizontal"
                            sizes={sBottomSizes}
                            onChange={setBottomSizes}
                        >
                            <Pane>{sChartOption.id && <CreatePanelBody pInsetDraging={sInsetDraging} pValue={pInfo} pDraged={pDraged}></CreatePanelBody>}</Pane>
                            <Pane>
                                {sTableList.length !== 0 && (
                                    <CreatePanelFotter
                                        pGetTables={getTables}
                                        pTableList={sTableList}
                                        pChangedChartOption={sChangedChartOption}
                                        pSetChangedChartOption={setChangedChartOption}
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
