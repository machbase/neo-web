import { getLogin as getShellList } from '@/api/repository/login';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { gActiveShellManage, gBoardList, gSelectedTab, gShellList, gShowShellList } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { generateUUID } from '@/utils';
import { copyShell } from '@/api/repository/api';
import { GoPlus } from 'react-icons/go';
import icons from '@/utils/icons';

export const Shell = ({ pServer }: any) => {
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
                            savedCode: true,
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
                    savedCode: true,
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    /** Handle shell mode (info, create) */
    const handleShellMode = async (aEvent?: MouseEvent) => {
        if (aEvent) aEvent.stopPropagation();
        const sTempTarget = sShellList.find((aShell: any) => aShell.id === 'SHELL');
        const sCopyRes: any = await copyShell(sTempTarget.id);

        if (sCopyRes.success) {
            const sTargetItem = sCopyRes.data;
            sTargetItem.id = sTargetItem.id.toUpperCase();
            sTargetItem.icon = 'console-network-outline';
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
                                savedCode: true,
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
                        savedCode: true,
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
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">SHELL</span>
                    <span className="sub-title-navi">
                        {/* Create shell */}
                        <IconButton pWidth={20} pHeight={20} pIcon={<GoPlus size={15} />} onClick={(aEvent: MouseEvent) => handleShellMode(aEvent)} />
                        {/* GET shell list */}
                        <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={(aEvent: MouseEvent) => shellList(aEvent)} />
                    </span>
                </div>
            </div>
            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sCollapseTree &&
                    getShowShellList &&
                    getShowShellList.length !== 0 &&
                    getShowShellList.map((aShell: any, aIdx: number) => {
                        return (
                            <div key={aIdx} className={aShell.id === sActiveShellName ? 'file-wrap file-wrap-active' : 'file-wrap'} onClick={() => openShell(aShell)}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons" style={{ width: '14px' }}>
                                        {icons(aShell.icon)}
                                    </span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aShell.label}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
