import { getLogin as getShellList } from '@/api/repository/login';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';

import { gActiveShellManage, gBoardList, gSelectedTab, gShellList, gShowShellList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { resMessage } from '@/utils/resMessage';
import { useOpenShellCreate } from './useOpenShellCreate';
import { GoPlus } from 'react-icons/go';
import icons from '@/utils/icons';
import { Button, Side, Toast } from '@/design-system/components';

export const ShellSide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const getShowShellList = useRecoilValue<any>(gShowShellList);
    const setShellList = useSetRecoilState<any>(gShellList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [, setActiveShellName] = useRecoilState<any>(gActiveShellManage);

    /** Set key list */
    const shellList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sResShellList: any = await getShellList();
        // keep the current list on failure — blanking it reads as "every shell was deleted"
        if (sResShellList.success) {
            const sTermTypeList = sResShellList.shells.filter((aShell: any) => aShell.type === 'term');
            setShellList(sTermTypeList);
        } else Toast.error(resMessage(sResShellList, 'Failed to load shells'), { id: 'shell-list' });
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
    const openShellCreate = useOpenShellCreate();
    /** Handle create shell — opens the create form (see useOpenShellCreate). */
    const handleCreateShell = (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        openShellCreate();
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
