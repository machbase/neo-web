import './header.scss';
import { VARIABLE_ITEM_TYPE, VARIABLE_TYPE } from '.';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { postFileList } from '@/api/repository/api';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useEffect, useState } from 'react';

export const VariableHeader = ({
    pBoardInfo,
    pSelectVariable,
    pViewMode = false,
    callback = undefined,
}: {
    pBoardInfo: any;
    pSelectVariable: string;
    pViewMode?: boolean;
    callback?: (item: VARIABLE_TYPE[]) => void;
}) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sUpdateVarList, setUpdateVarList] = useState<VARIABLE_TYPE[]>(pBoardInfo?.dashboard?.variables ?? []);

    const updateVariableCode = () => {
        if (pViewMode) {
            callback && callback(sUpdateVarList);
        } else {
            let sSaveTarget = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);

            if (sSaveTarget?.path !== '') {
                const sTabList = sBoardList.map((aItem) => {
                    if (aItem.id === pBoardInfo.id) {
                        const sTmpDashboard = {
                            ...aItem.dashboard,
                            variables: sUpdateVarList,
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
                            variables: sUpdateVarList,
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
            callback && callback(sUpdateVarList);
        }
    };
    const handleValueUse = (variable: VARIABLE_TYPE, item: VARIABLE_ITEM_TYPE) => {
        const tmpVarList = pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
            if (variable.id === varInfo.id) {
                varInfo;
                return { ...varInfo, use: item };
            } else return varInfo;
        });
        setUpdateVarList(tmpVarList);
    };

    useEffect(() => {
        setUpdateVarList(pBoardInfo?.dashboard?.variables ?? []);
    }, [pBoardInfo?.dashboard?.variables]);

    return (
        <div className="board-header-variable-wrap">
            <div className="board-header-variable-overflow">
                <div className="board-header-variable">
                    {sUpdateVarList &&
                        sUpdateVarList.map((variable: VARIABLE_TYPE, idx: number) => {
                            if (pSelectVariable === 'ALL' || variable.id === pSelectVariable)
                                return (
                                    <div className="board-header-variable-item" key={'board-variable-item-' + variable.id + idx.toString()}>
                                        <label className="board-header-variable-item-label">{variable.label}</label>
                                        <ExtensionTab>
                                            <ExtensionTab.Selector
                                                pList={variable.valueList.map((value) => {
                                                    return { name: value.value, data: value };
                                                })}
                                                pSelectedItem={variable.use.value}
                                                pCallback={(item: VARIABLE_ITEM_TYPE) => handleValueUse(variable, item)}
                                                capitalize={false}
                                            />
                                        </ExtensionTab>
                                    </div>
                                );
                            else return null;
                        })}
                </div>
            </div>
            <div className="board-header-variable-action">
                <ExtensionTab>
                    <ExtensionTab.TextButton pText={'Apply'} pType={'CREATE'} pCallback={updateVariableCode} pWidth="120px" />
                </ExtensionTab>
            </div>
        </div>
    );
};
