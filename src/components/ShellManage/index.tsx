import { Page } from '@/design-system/components';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { getLogin as getShellList } from '@/api/repository/login';
import {
    gActiveShellManage,
    gBoardList,
    gSelectedTab,
    gShellList,
    gShowShellList,
} from '@/recoil/recoil';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import { addShell, copyShell, postShell, removeShell } from '@/api/repository/api';
import icons from '@/utils/icons';
import { ConfirmModal } from '../modal/ConfirmModal';
import { SHELL_ICON_LIST } from './constants';

interface ShellAttrType {
    [key: number]: any;
}
interface ShellItemType {
    attributes: ShellAttrType[];
    command: string;
    icon: string;
    id: string;
    label: string;
    theme: string;
    type: string;
}

export const ShellManage = ({ pCode }: { pCode: ShellItemType }) => {
    const setShellList = useSetRecoilState<any>(gShellList);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const getShowShellList = useRecoilValue<any>(gShowShellList);
    const [sActiveShellName, setActiveShellName] = useRecoilState<any>(gActiveShellManage);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sPayload, setPayload] = useState<any>(pCode);
    const [sResMessage, setResMessage] = useState<string | undefined>(undefined);
    // const [sShellList, setaShellList] = useRecoilState<any>(gShellList);
    const sIconList = SHELL_ICON_LIST;
    const sThemeList = ['default', 'white', 'dark', 'indigo', 'gray', 'galaxy'];
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    // create mode: the side panel's + button opens this board with an id-less template
    const sIsCreateMode = !sPayload?.id;

    /** delete shell */
    const deleteShell = async () => {
        const sRes: any = await removeShell(sPayload.id);
        if (sRes.success) {
            await shellList();
            const sShellList = getShowShellList.filter(
                (aShellInfo: any) => aShellInfo.id !== sPayload.id,
            );
            if (sShellList && sShellList.length > 0) {
                setActiveShellName(sShellList[0].id);
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
                setBoardList((aBoardList: any) => {
                    return aBoardList.map((aBoard: any) => {
                        if (aBoard.id === aTarget.id) {
                            return {
                                ...aTarget,
                                name: `SHELL: ${sShellList[0].label}`,
                                code: sShellList[0],
                                savedCode: sShellList[0],
                            };
                        }
                        return aBoard;
                    });
                });
                setSelectedTab(aTarget.id);
            } else {
                const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
                const aLastBoard = sBoardList
                    .filter((aBoard: any) => aBoard.type !== 'shell-manage')
                    .at(-1);
                setBoardList((aBoardList: any) => {
                    return aBoardList.filter((aBoard: any) => aBoard.id !== aTarget.id);
                });
                setSelectedTab(aLastBoard.id);
                setActiveShellName(undefined);
            }

            setResMessage(undefined);
        } else {
            if (sRes?.data && sRes?.data.reason) setResMessage(sRes?.data.reason);
            else setResMessage(sRes.statusText);
        }
        setIsDeleteModal(false);
    };
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    /** edit shell */
    const editShell = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const sResult: any = await postShell(sPayload);

        if (sResult.success) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'shell-manage');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `SHELL: ${sPayload.label}`,
                            code: sPayload,
                            savedCode: sPayload,
                        };
                    }
                    return aBoard;
                });
            });
            shellList();
            setResMessage(undefined);
        } else {
            if (sResult?.data && sResult?.data.reason) setResMessage(sResult?.data.reason);
            else setResMessage(sResult.statusText);
        }
    };
    /** Set key list */
    const shellList = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sResShellList: any = await getShellList();
        if (sResShellList.success) {
            const sTermTypeList = sResShellList.shells.filter(
                (aShell: any) => aShell.type === 'term',
            );
            setShellList(sTermTypeList);
            return sTermTypeList;
        } else {
            setShellList(undefined);
            return [];
        }
    };
    /** handle payload */
    const handlePayload = (aKey: string, aEvent: React.FormEvent<HTMLInputElement>) => {
        const sTarget = aEvent.target as HTMLInputElement;
        const sTempPayload = JSON.parse(JSON.stringify(sPayload));
        sTempPayload[aKey] = sTarget.value;
        setPayload(sTempPayload);
        setBoardList((curBoardList: any) => {
            return curBoardList.map((aBoard: any) => {
                if (aBoard.type === 'shell-manage') {
                    return { ...aBoard, code: sTempPayload };
                } else return aBoard;
            });
        });
    };
    /** create shell — `shell.add(name, command)` first; theme/icon are not part of shell.add, so a
     *  follow-up `shell.update` persists them when set. The create template preselects the first
     *  icon (SHELL_ICON_LIST[0]), so the update effectively always fires — keeping what the form
     *  shows consistent with what the server stores. */
    const createShell = async () => {
        // the server validates command (non-empty) and label length (≤16) but accepts an empty label
        if (!sPayload.label || sPayload.label.trim() === '') {
            setResMessage('name is required');
            return;
        }
        if (!sPayload.command || sPayload.command.trim() === '') {
            setResMessage('command is required');
            return;
        }
        const sAddRes: any = await addShell(sPayload.label, sPayload.command);
        if (!sAddRes.success) {
            if (sAddRes?.data && sAddRes?.data.reason) setResMessage(sAddRes?.data.reason);
            else setResMessage(sAddRes.statusText);
            return;
        }
        const sNewId = String(sAddRes.data ?? '');
        let sTermList = await shellList();
        let sNewShell = sTermList.find(
            (aShell: any) => aShell?.id?.toLowerCase() === sNewId.toLowerCase(),
        );
        const sStyleChanged =
            sPayload.icon !== '' || (sPayload.theme && sPayload.theme !== 'default');
        if (sNewShell && sStyleChanged) {
            const sUpdateRes: any = await postShell({
                ...sNewShell,
                icon: sPayload.icon,
                theme: sPayload.theme,
            });
            if (sUpdateRes.success) {
                sTermList = await shellList();
                sNewShell =
                    sTermList.find(
                        (aShell: any) => aShell?.id?.toLowerCase() === sNewId.toLowerCase(),
                    ) ?? sNewShell;
            }
            // on style-update failure keep going — the shell itself was created; the edit page opens
            // with icon/theme unset and the user can re-apply them with Save
        }
        const sTargetItem = sNewShell ?? {
            ...sPayload,
            id: sNewId,
            type: 'term',
            attributes: [{ removable: true }, { cloneable: true }, { editable: true }],
        };
        // switch this tab to the created shell's edit page (same board shape as the copy flow)
        setBoardList((aBoardList: any) => {
            return aBoardList.map((aBoard: any) => {
                if (aBoard.type === 'shell-manage') {
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
        setSelectedTab(sTargetItem.id);
        setActiveShellName(sTargetItem.id);
        setResMessage(undefined);
    };
    /** Handle create shell */
    const handleCreateShell = async () => {
        const sTempTarget = pCode;
        const sCopyRes: any = await copyShell(sTempTarget.id);

        if (sCopyRes.success) {
            const sTargetItem = sCopyRes.data;
            sTargetItem.id = sTargetItem.id.toUpperCase();
            sTargetItem.icon =
                sTempTarget.icon === 'console' ? 'console-network-outline' : sTempTarget.icon;
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
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };

    useEffect(() => {
        setPayload(pCode);
    }, [pCode]);

    return (
        <>
            {sPayload && sActiveShellName !== '' && (
                <Page>
                    <SplitPane
                        sashRender={() => Resizer()}
                        split={'vertical'}
                        sizes={['50', '50']}
                        onChange={() => {}}
                    >
                        <Pane minSize={400}>
                            <Page.Header />
                            <Page.Body>
                                <Page.ContentBlock>
                                    <Page.DpRow>
                                        <Page.ContentTitle>name</Page.ContentTitle>
                                        {sIsCreateMode && (
                                            <Page.ContentDesc>
                                                <span
                                                    style={{ marginLeft: '4px', color: '#f35b5b' }}
                                                >
                                                    *
                                                </span>
                                            </Page.ContentDesc>
                                        )}
                                    </Page.DpRow>
                                    <Page.ContentDesc>Display name</Page.ContentDesc>
                                    <Page.Input
                                        pCallback={(event: React.FormEvent<HTMLInputElement>) =>
                                            handlePayload('label', event)
                                        }
                                        pValue={sPayload.label}
                                        pMaxLen={16}
                                        pAutoFocus
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.DpRow>
                                        <Page.ContentTitle>command</Page.ContentTitle>
                                        {sIsCreateMode && (
                                            <Page.ContentDesc>
                                                <span
                                                    style={{ marginLeft: '4px', color: '#f35b5b' }}
                                                >
                                                    *
                                                </span>
                                            </Page.ContentDesc>
                                        )}
                                    </Page.DpRow>
                                    <Page.ContentDesc>
                                        Any executable command in full path with arguments
                                    </Page.ContentDesc>
                                    <Page.Input
                                        pCallback={(event: React.FormEvent<HTMLInputElement>) =>
                                            handlePayload('command', event)
                                        }
                                        pValue={sPayload.command}
                                        pWidth={'400px'}
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>theme</Page.ContentTitle>
                                    <Page.ContentDesc>Terminal color theme</Page.ContentDesc>
                                    <Page.Selector
                                        pList={sThemeList.map((theme) => {
                                            return { name: theme, data: theme };
                                        })}
                                        pSelectedItem={sPayload.theme || 'default'}
                                        pCallback={(eTarget: string) =>
                                            handlePayload('theme', {
                                                target: { value: eTarget },
                                            } as any)
                                        }
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>icon</Page.ContentTitle>
                                    <Page.DpRow>
                                        {sIconList.map((aItem: any, aIdx: number) => {
                                            return (
                                                <Page.IconBtn
                                                    key={aIdx}
                                                    pActive={sPayload.icon === aItem}
                                                    pCallback={() => {
                                                        handlePayload('icon', {
                                                            target: { value: aItem },
                                                        } as any);
                                                    }}
                                                >
                                                    {icons(aItem)}
                                                </Page.IconBtn>
                                            );
                                        })}
                                    </Page.DpRow>
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <div>
                                        {sIsCreateMode ? (
                                            <>
                                                <Page.DpRow>
                                                    <Page.TextButton
                                                        pText="Create"
                                                        pType="CREATE"
                                                        pCallback={createShell}
                                                    />
                                                </Page.DpRow>
                                                {sResMessage && (
                                                    <Page.TextResErr pText={sResMessage} />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Page.DpRowBetween>
                                                    <Page.DpRow>
                                                        <Page.TextButton
                                                            pText="Delete"
                                                            pType="DELETE"
                                                            pCallback={handleDelete}
                                                        />
                                                        <Page.TextButton
                                                            pText="Save"
                                                            pType="CREATE"
                                                            pCallback={editShell}
                                                        />
                                                    </Page.DpRow>
                                                    <Page.TextButton
                                                        pText="Make a copy"
                                                        pType="COPY"
                                                        pCallback={handleCreateShell}
                                                        pWidth={'120px'}
                                                    />
                                                </Page.DpRowBetween>
                                                {sResMessage && (
                                                    <Page.TextResErr pText={sResMessage} />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </Page.ContentBlock>
                            </Page.Body>
                        </Pane>
                        <Pane minSize={0}>
                            <Page.Header />
                        </Pane>
                    </SplitPane>
                </Page>
            )}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteShell}
                    pContents={
                        <div className="body-content">{`Do you want to delete this shell?`}</div>
                    }
                />
            )}
        </>
    );
};
