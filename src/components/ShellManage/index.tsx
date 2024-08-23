import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { getLogin as getShellList } from '@/api/repository/login';
import { gActiveShellManage, gBoardList, gSelectedTab, gShellList, gShowShellList } from '@/recoil/recoil';
import { Pane, SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import { copyShell, postShell, removeShell } from '@/api/repository/api';
import icons from '@/utils/icons';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { ConfirmModal } from '../modal/ConfirmModal';

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
    const sIconList = ['console-network-outline', 'monitor-small', 'console-line', 'powershell', 'laptop', 'database', 'database-outline'];
    const sThemeList = ['default', 'white', 'dark', 'indigo', 'gray', 'galaxy'];
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);

    /** delete shell */
    const deleteShell = async () => {
        const sRes: any = await removeShell(sPayload.id);
        if (sRes.success) {
            await shellList();
            const sShellList = getShowShellList.filter((aShellInfo: any) => aShellInfo.id !== sPayload.id);
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
                const aLastBoard = sBoardList.filter((aBoard: any) => aBoard.type !== 'shell-manage').at(-1);
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
            const sTermTypeList = sResShellList.shells.filter((aShell: any) => aShell.type === 'term');
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
        setBoardList((curBoardList: any) => {
            return curBoardList.map((aBoard: any) => {
                if (aBoard.type === 'shell-manage') {
                    return { ...aBoard, code: sTempPayload };
                } else return aBoard;
            });
        });
    };
    /** Handle create shell */
    const handleCreateShell = async () => {
        const sTempTarget = pCode;
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
                <ExtensionTab>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header />
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>name</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>Display name</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Input
                                        pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('label', event)}
                                        pValue={sPayload.label}
                                        pAutoFocus
                                    />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>command</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>Any executable command in full path with arguments</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Input
                                        pCallback={(event: React.FormEvent<HTMLInputElement>) => handlePayload('command', event)}
                                        pValue={sPayload.command}
                                        pWidth={'400px'}
                                    />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>theme</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>Terminal color theme</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Selector
                                        pList={sThemeList}
                                        pSelectedItem={sPayload.theme || 'default'}
                                        pCallback={(eTarget: string) => handlePayload('theme', { target: { value: eTarget } } as any)}
                                    />
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>icon</ExtensionTab.ContentTitle>
                                    <ExtensionTab.DpRow>
                                        {sIconList.map((aItem: any, aIdx: number) => {
                                            return (
                                                <ExtensionTab.IconBtn
                                                    key={aIdx}
                                                    pActive={sPayload.icon === aItem}
                                                    pCallback={() => {
                                                        handlePayload('icon', { target: { value: aItem } } as any);
                                                    }}
                                                >
                                                    {icons(aItem)}
                                                </ExtensionTab.IconBtn>
                                            );
                                        })}
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.TextButton pText="Delete" pType="DELETE" pCallback={handleDelete} />
                                            <ExtensionTab.TextButton pText="Save" pType="CREATE" pCallback={editShell} />
                                            {sResMessage && <ExtensionTab.TextResErr pText={sResMessage} />}
                                        </ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton pText="Make a copy" pType="COPY" pCallback={handleCreateShell} pWidth={'120px'} />
                                    </div>
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        </Pane>
                        <Pane minSize={0}>
                            <ExtensionTab.Header />
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
            )}
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteShell}
                    pContents={<div className="body-content">{`Do you want to delete this shell?`}</div>}
                />
            )}
        </>
    );
};
