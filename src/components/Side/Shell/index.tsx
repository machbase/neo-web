import { getLogin as getShellList } from '@/api/repository/login';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';

import { gActiveShellManage, gBoardList, gSelectedTab, gShellList, gShowShellList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { copyShell } from '@/api/repository/api';
import { GoPlus } from 'react-icons/go';
import icons from '@/utils/icons';
import { Button, Side } from '@/design-system/components';

export const ShellSide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const getShowShellList = useRecoilValue<any>(gShowShellList);
    const [sShellList, setShellList] = useRecoilState<any>(gShellList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sActiveShellName, setActiveShellName] = useRecoilState<any>(gActiveShellManage);

    /** Set key list */
    const shellList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sResShellList: any = await getShellList();
        if (sResShellList.success) {
            const sTermTypeList = sResShellList.shells.filter((aShell: any) => aShell.type === 'term');
            setShellList(sTermTypeList);
        } else setShellList(undefined);
    };
    /** Update global tab list & board list */
    const openShell = async (aValue: any) => {
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'shell-manage';
        }, false);

        setActiveShellName(aValue.id);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `SHELL: ${aValue.label}`,
                            code: aValue,
                            savedCode: aValue,
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
            return;
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: 'shell-manage',
                    name: `SHELL: ${aValue.label}`,
                    code: aValue,
                    savedCode: aValue,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    /** Handle create shell */
    const handleCreateShell = async (aEvent?: MouseEvent, aShell?: any) => {
        if (aEvent) aEvent.stopPropagation();
        const sTempTarget = aShell || sShellList.find((aShell: any) => aShell.id === 'SHELL');
        const sCopyRes: any = await copyShell(sTempTarget.id);

        if (sCopyRes.success) {
            const sTargetItem = sCopyRes.data;
            sTargetItem.id = sTargetItem.id.toUpperCase();
            sTargetItem.icon = sTempTarget.icon === 'console' ? 'console-network-outline' : sTempTarget.icon;
            await shellList();

            const sExistShellManageTab = sBoardList.reduce((prev: boolean, cur: any) => {
                return prev || cur.type === 'shell-manage';
            }, false);

            if (sExistShellManageTab) {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                id: sTargetItem.id,
                                type: 'shell-manage',
                                name: `SHELL: ${sTargetItem.label}`,
                                code: sTargetItem,
                                savedCode: sTargetItem,
                                path: '',
                            };
                        }
                        return aBoard;
                    });
                });
            } else {
                setBoardList([
                    ...sBoardList,
                    {
                        id: sTargetItem.id,
                        type: 'shell-manage',
                        name: `SHELL: ${sTargetItem.label}`,
                        code: sTargetItem,
                        savedCode: sTargetItem,
                        path: '',
                    },
                ]);
            }
            setSelectedTab(sTargetItem.id);
            setActiveShellName(sTargetItem.id);
            return;
        } else {
            setActiveShellName(undefined);
        }
    };

    /** init key list */
    useEffect(() => {
        shellList();
    }, []);

    return (
        <Side.Container>
            <Side.Section>
                <Side.Collapse pCallback={() => setCollapseTree(!sCollapseTree)} pCollapseState={sCollapseTree}>
                    <span>SHELL</span>
                    <Button.Group>
                        <Button
                            size="side"
                            variant="ghost"
                            icon={<GoPlus size={16} />}
                            isToolTip
                            toolTipContent="New shell"
                            onClick={(aEvent: MouseEvent) => handleCreateShell(aEvent)}
                        />
                        <Button size="side" variant="ghost" icon={<MdRefresh size={16} />} isToolTip toolTipContent="Refresh" onClick={(aEvent: MouseEvent) => shellList(aEvent)} />
                    </Button.Group>
                </Side.Collapse>

                {sCollapseTree && (
                    <Side.List>
                        {getShowShellList &&
                            getShowShellList.length !== 0 &&
                            getShowShellList.map((aShell: any, aIdx: number) => {
                                return (
                                    <Side.Item key={aIdx} onClick={() => openShell(aShell)}>
                                        <Side.ItemContent>
                                            <Side.ItemIcon>{icons(aShell.icon)}</Side.ItemIcon>
                                            <Side.ItemText>{aShell.label}</Side.ItemText>
                                        </Side.ItemContent>
                                    </Side.Item>
                                );
                            })}
                    </Side.List>
                )}
            </Side.Section>
        </Side.Container>
    );
};
