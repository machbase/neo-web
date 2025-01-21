import './header.scss';
import { VARIABLE_ITEM_TYPE, VARIABLE_TYPE } from '.';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { postFileList } from '@/api/repository/api';
import { ExtensionTab } from '@/components/extension/ExtensionTab';

export const VariableHeader = ({ pBoardInfo, pViewMode = false, callback = undefined }: { pBoardInfo: any; pViewMode?: boolean; callback?: (item: VARIABLE_TYPE[]) => void }) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const updateVariableCode = (updateVarList: VARIABLE_TYPE[]) => {
        if (pViewMode) {
            callback && callback(updateVarList);
        } else {
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
            callback && callback(updateVarList);
        }
    };
    const handleValueUse = (variable: VARIABLE_TYPE, item: VARIABLE_ITEM_TYPE) => {
        const tmpVarList = pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
            if (variable.id === varInfo.id) {
                varInfo;
                return { ...varInfo, use: item };
            } else return varInfo;
        });
        updateVariableCode(tmpVarList ?? []);
    };
    return (
        <div className="board-header-variable-wrap">
            <div className="board-header-variable">
                {pBoardInfo &&
                    pBoardInfo?.dashboard &&
                    pBoardInfo?.dashboard?.variables &&
                    pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                        return (
                            <div className="board-header-variable-item" key={'board-variable-item-' + idx.toString()}>
                                <label className="board-header-variable-item-label">{variable.label}</label>
                                <div className="board-header-variable-item-key">{variable.key}</div>
                                <ExtensionTab>
                                    <ExtensionTab.Selector
                                        pList={variable.valueList.map((value) => {
                                            return { name: value.value, data: value };
                                        })}
                                        pSelectedItem={variable.use.value}
                                        pCallback={(item: VARIABLE_ITEM_TYPE) => handleValueUse(variable, item)}
                                    />
                                </ExtensionTab>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
