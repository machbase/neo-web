import './index.scss';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import SplitPane, { Pane, SashContent } from 'split-pane-react';
import { LuFlipVertical } from 'react-icons/lu';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useRef, useState } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { generateUUID } from '@/utils';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { postFileList } from '@/api/repository/api';

export interface VARIABLE_TYPE {
    id: string;
    label: string;
    key: string;
    type: 'SELECT' | 'QUERY';
    use: VARIABLE_ITEM_TYPE;
    valueList: VARIABLE_ITEM_TYPE[];
}
export interface VARIABLE_ITEM_TYPE {
    id: string;
    type: string;
    value: string;
}
type MODE_TYPE = 'CREATE' | 'EDIT';

export const Variable = ({ pBoardInfo, pSetModal }: { pBoardInfo: any; pSetModal: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sBodyRef: any = useRef(null);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sUpdateVariable, setUpdateVariable] = useState<{ open: boolean; mode: MODE_TYPE; data: VARIABLE_TYPE }>({
        open: false,
        mode: 'CREATE',
        data: {
            id: '',
            label: '',
            key: '',
            type: 'SELECT',
            use: {
                id: '',
                type: 'CSV',
                value: '',
            },
            valueList: [
                {
                    id: '',
                    type: 'CSV',
                    value: '',
                },
            ],
        },
    });

    const updateVariableCode = (updateVarList: VARIABLE_TYPE[]) => {
        let sSaveTarget = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);

        if (sSaveTarget?.path !== '') {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        variables: updateVarList,
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                        savedCode: JSON.stringify(sTmpDashboard),
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
            postFileList(sSaveTarget, sSaveTarget?.path, sSaveTarget?.name);
        } else {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        variables: updateVarList,
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
        }
    };

    const handleUpdateVarOrigin = () => {
        let tmpVarList;
        if (sUpdateVariable.mode === 'EDIT') {
            tmpVarList = pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
                if (sUpdateVariable.data.id === varInfo.id) {
                    return { ...sUpdateVariable.data, id: generateUUID() };
                } else return varInfo;
            });
        }
        if (sUpdateVariable.mode === 'CREATE') {
            tmpVarList = pBoardInfo?.dashboard?.variables?.concat({ ...sUpdateVariable.data, id: generateUUID() });
        }
        updateVariableCode(tmpVarList ?? []);
        handleResetUpdateVariable();
    };
    const handleResetUpdateVariable = () => {
        setUpdateVariable((prev) => {
            return {
                open: !prev.open,
                mode: 'CREATE',
                data: {
                    id: '',
                    label: '',
                    type: 'SELECT',
                    key: '',
                    use: {
                        id: '',
                        type: 'CSV',
                        value: '',
                    },
                    valueList: [
                        {
                            id: '',
                            type: 'CSV',
                            value: '',
                        },
                    ],
                },
            };
        });
    };
    const handleVariableDelete = (item: any[]) => {
        const tmpVarList = pBoardInfo?.dashboard?.variables?.filter((varInfo: VARIABLE_TYPE) => item.at(-1).id !== varInfo.id);
        updateVariableCode(tmpVarList ?? []);
        setUpdateVariable(() => {
            return {
                open: false,
                mode: 'CREATE',
                data: {
                    id: '',
                    label: '',
                    type: 'SELECT',
                    key: '',
                    use: {
                        id: '',
                        type: 'CSV',
                        value: '',
                    },
                    valueList: [
                        {
                            id: '',
                            type: 'CSV',
                            value: '',
                        },
                    ],
                },
            };
        });
    };
    const handleVariableRowSelect = (item: any[]) => {
        setUpdateVariable({
            open: true,
            mode: 'EDIT',
            data: {
                id: item.at(-1).id,
                label: item.at(-1).label,
                type: 'SELECT',
                key: item.at(-1).key,
                use: item.at(-1).valueList[0],
                valueList: item.at(-1).valueList,
            },
        });
    };
    const tableFormatVariableList = (): any[][] => {
        const result: any[][] = [];

        pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
            const child =
                varInfo.valueList?.length > 0
                    ? varInfo.valueList.map((valueInfo: VARIABLE_ITEM_TYPE) => {
                          return valueInfo.value;
                      })
                    : [];
            result.push([varInfo.label, varInfo.type, varInfo.key, child?.join(', '), varInfo]);
        });

        return result;
    };
    const handleVarOpt = (key: string, item: React.FormEvent<HTMLInputElement>) => {
        if (key === 'value') {
            sUpdateVariable.data.valueList[0].value;
            setUpdateVariable((prev) => {
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        use: {
                            ...prev.data.use,
                            value: (item.target as HTMLInputElement).value,
                        },
                        valueList: [{ ...prev.data.valueList[0], value: (item.target as HTMLInputElement).value }],
                    },
                };
            });
        } else {
            setUpdateVariable((prev) => {
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        use: {
                            ...prev.data.use,
                            [key]: (item.target as HTMLInputElement).value,
                        },
                        [key]: (item.target as HTMLInputElement).value,
                    },
                };
            });
        }
    };
    const handleClose = () => {
        pSetModal(false);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);

    return (
        <div className="dashboard-variable-wrap">
            <ExtensionTab pRef={sBodyRef}>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    {/* VARIABLES */}
                    <Pane minSize={400}>
                        <ExtensionTab.Header>
                            <IconButton pWidth={20} pHeight={32} pIcon={<IoArrowBackOutline />} onClick={handleClose} />
                        </ExtensionTab.Header>
                        <ExtensionTab.Body>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.SubTitle>Variables</ExtensionTab.SubTitle>
                                <ExtensionTab.ContentDesc>Variables can make your dashboard more dynamic.</ExtensionTab.ContentDesc>
                            </ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentBlock>
                                <div className="board-preview-variable">
                                    {pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                                        return (
                                            <div className="board-preview-variable-item" key={'board-variable-item-' + idx.toString()}>
                                                <label className="board-preview-variable-item-label">{variable.label}</label>
                                                <div className="board-preview-variable-item-key">{variable.key}</div>
                                                <div className="board-preview-variable-item-value">{variable.use.value}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ExtensionTab.ContentBlock>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.Table
                                    activeRow
                                    pList={{
                                        columns: ['NAME', 'TYPE', 'KEY', 'VALUE'],
                                        rows: tableFormatVariableList(),
                                    }}
                                    rowSelectCallback={handleVariableRowSelect}
                                    rowDeleteCallback={handleVariableDelete}
                                />
                            </ExtensionTab.ContentBlock>
                            {!sUpdateVariable.open && (
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextButton pText={'+ New variable'} pType={'CREATE'} pCallback={handleResetUpdateVariable} pWidth="120px" />
                                </ExtensionTab.ContentBlock>
                            )}
                            {sUpdateVariable.open && (
                                <>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Type</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Variable type</ExtensionTab.ContentDesc>
                                        sBoardList
                                        <ExtensionTab.Selector disable pList={['SELECT', 'QUERY']} pSelectedItem={sUpdateVariable.data.type} pCallback={() => {}} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Name</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Name desc</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Input pValue={sUpdateVariable.data.label} pCallback={(item) => handleVarOpt('label', item)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Key</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Key desc</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Input pValue={sUpdateVariable.data.key} pCallback={(item) => handleVarOpt('key', item)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Value</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Value desc</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Input pValue={sUpdateVariable.data.valueList[0].value} pCallback={(item) => handleVarOpt('value', item)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.TextButton pText={'Cancel'} pType="DELETE" pCallback={handleResetUpdateVariable} pWidth="80px" />
                                            <ExtensionTab.TextButton pText={'Save'} pType="CREATE" pCallback={handleUpdateVarOrigin} pWidth="80px" />
                                        </ExtensionTab.DpRow>
                                    </ExtensionTab.ContentBlock>
                                </>
                            )}
                        </ExtensionTab.Body>
                    </Pane>
                    {/* VALUES */}
                    <Pane>
                        <ExtensionTab.Header>
                            <div />
                            <div style={{ display: 'flex' }}>
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="bridge-tab-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="bridge-tab-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </div>
                        </ExtensionTab.Header>
                    </Pane>
                </SplitPane>
            </ExtensionTab>
        </div>
    );
};
