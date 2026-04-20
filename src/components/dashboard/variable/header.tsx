import { VARIABLE_ITEM_TYPE, VARIABLE_TYPE } from '.';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { postFileList } from '@/api/repository/api';
import { Page, Dropdown, Button } from '@/design-system/components';
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
        <Page.Body fullHeight style={{ padding: 0 }}>
            {sUpdateVarList &&
                sUpdateVarList.map((variable: VARIABLE_TYPE, idx: number) => {
                    if (pSelectVariable === 'ALL' || variable.id === pSelectVariable)
                        return (
                            <Page.ContentBlock pHoverNone key={'board-variable-item-' + variable.id + idx.toString()} style={{ padding: '8px 0', gap: '4px' }}>
                                <Dropdown.Root
                                    options={variable.valueList.map((value) => ({
                                        label: value.value,
                                        value: value.value,
                                    }))}
                                    value={variable.use.value}
                                    onChange={(value) => {
                                        const selectedItem = variable.valueList.find((v) => v.value === value);
                                        if (selectedItem) handleValueUse(variable, selectedItem);
                                    }}
                                    label={variable.label}
                                    labelPosition="left"
                                >
                                    <Dropdown.Trigger />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </Page.ContentBlock>
                        );
                    else return null;
                })}
            <Page.ContentBlock pHoverNone style={{ padding: '12px 0 0 0' }}>
                <Button variant="primary" onClick={updateVariableCode} style={{ width: '100%' }}>
                    Apply
                </Button>
            </Page.ContentBlock>
        </Page.Body>
    );
};
