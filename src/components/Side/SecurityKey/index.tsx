import { KeyItemType, getKeyList } from '@/api/repository/key';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { gActiveKey, gBoardList, gKeyList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { getId } from '@/utils';
import { GoPlus } from 'react-icons/go';
import icons from '@/utils/icons';
import { Button, Side } from '@/design-system/components';

export const SecurityKeySide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [, setActiveKeyName] = useRecoilState<any>(gActiveKey);
    const [sSecurityKeyList, setSecurityKeyList] = useRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sCollapseTree, setCollapseTree] = useState(true);

    /** Set key list */
    const keyList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sKeyList = await getKeyList();
        if (sKeyList.success) setSecurityKeyList(sKeyList.data);
        else setSecurityKeyList(undefined);
    };
    /** Update global tab list & board list */
    const openSecurityKey = async (aValue: any) => {
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'key';
        }, false);
        setActiveKeyName(aValue.id);
        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'key');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `KEY: ${aValue.id}`,
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
            const sId = getId();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: 'key',
                    name: `KEY: ${aValue.id}`,
                    code: aValue,
                    savedCode: aValue,
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    /** Handle key mode (info, create) */
    const handleKeyMode = (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'key';
        }, false);
        setActiveKeyName('');
        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'key');
            const sId = getId();
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            id: sId,
                            type: 'key',
                            name: `KEY: create`,
                            code: undefined,
                            savedCode: false,
                            path: '',
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(sId);
            return;
        } else {
            const sId = getId();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: 'key',
                    name: `KEY: create`,
                    code: undefined,
                    savedCode: false,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };

    /** init key list */
    useEffect(() => {
        keyList();
    }, []);

    return (
        <Side.Container>
            <Side.Section>
                <Side.Collapse pCallback={() => setCollapseTree(!sCollapseTree)} pCollapseState={sCollapseTree}>
                    <span>SECURITY KEY</span>
                    <Button.Group>
                        <Button
                            size="side"
                            variant="ghost"
                            isToolTip
                            toolTipContent="New security key"
                            icon={<GoPlus size={16} />}
                            onClick={(aEvent: MouseEvent) => handleKeyMode(aEvent)}
                        />
                        <Button size="side" variant="ghost" isToolTip toolTipContent="Refresh" icon={<MdRefresh size={16} />} onClick={(aEvent: MouseEvent) => keyList(aEvent)} />
                    </Button.Group>
                </Side.Collapse>

                {sCollapseTree && (
                    <Side.List>
                        {sSecurityKeyList &&
                            sSecurityKeyList.length !== 0 &&
                            sSecurityKeyList.map((aKey, aIdx: number) => {
                                return (
                                    <Side.Item key={aIdx} onClick={() => openSecurityKey(aKey)}>
                                        <Side.ItemContent>
                                            <Side.ItemIcon>{icons('key')}</Side.ItemIcon>
                                            <Side.ItemText>{aKey.id}</Side.ItemText>
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
