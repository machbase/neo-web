import { KeyItemType, getKeyList } from '@/api/repository/key';
import { MouseEvent, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { gActiveKey, gBoardList, gKeyList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { getId } from '@/utils';
import { GoPlus } from 'react-icons/go';
import icons from '@/utils/icons';

export const SecurityKey = ({ pServer }: any) => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sActiveKeyName, setActiveKeyName] = useRecoilState<any>(gActiveKey);
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
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">SECURITY KEY</span>
                    <span className="sub-title-navi">
                        {/* Create key */}
                        <IconButton pWidth={20} pHeight={20} pIcon={<GoPlus size={15} />} onClick={(aEvent: MouseEvent) => handleKeyMode(aEvent)} />
                        {/* GET key list */}
                        <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={(aEvent: MouseEvent) => keyList(aEvent)} />
                    </span>
                </div>
            </div>
            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sCollapseTree &&
                    sSecurityKeyList &&
                    sSecurityKeyList.length !== 0 &&
                    sSecurityKeyList.map((aKey, aIdx: number) => {
                        return (
                            <div key={aIdx} className={aKey.id === sActiveKeyName ? 'file-wrap file-wrap-active' : 'file-wrap'} onClick={() => openSecurityKey(aKey)}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons">{icons('key')}</span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aKey.id}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
