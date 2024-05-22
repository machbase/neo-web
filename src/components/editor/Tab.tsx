import { gActiveKey, gActiveTimer, gActiveShellManage, gBoardList, gActiveBridge } from '@/recoil/recoil';
import { deepEqual, getId, isValidJSON } from '@/utils';
import icons from '@/utils/icons';
import { useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SaveCricle } from '@/assets/icons/Icon';
import './Tab.scss';

const Tab = ({ pBoard, pSelectedTab, pSetSelectedTab, pIdx, pTabDragInfo, pSetTabDragInfo }: any) => {
    const [sHover, setHover] = useState(false);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sIsSaved, setIsSaved] = useState<boolean>(false);
    const [sDragOver, setDragOver] = useState<NodeJS.Timeout | any>(null);
    const setActiveTimer = useSetRecoilState<any>(gActiveTimer);
    const setActiveShellName = useSetRecoilState<any>(gActiveShellManage);
    const setActiveKeyName = useSetRecoilState<any>(gActiveKey);
    const setActiveBridge = useSetRecoilState(gActiveBridge);

    useEffect(() => {
        compareValue(pBoard);
    }, [pBoard]);

    const addFile = () => {
        const sNewTab = { id: getId(), type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false };
        setBoardList([sNewTab]);
        pSetSelectedTab(sNewTab.id);
    };

    const closeTab = (aEvent: any) => {
        aEvent.stopPropagation();

        const sArray = JSON.parse(JSON.stringify(sBoardList));

        if (sBoardList[pIdx].id === pSelectedTab) {
            if (sBoardList.length === 1) {
                // return;
            } else if (pSelectedTab === sBoardList[sBoardList.length - 1].id) {
                pSetSelectedTab(sBoardList[sBoardList.length - 2].id);
            } else {
                sBoardList[pIdx + 1] && pSetSelectedTab(sBoardList[pIdx + 1].id);
            }
        }

        const sEtc = sArray.splice(pIdx, 1);

        if (sEtc[0].type === 'timer') setActiveTimer(undefined);
        if (sEtc[0].type === 'shell-manage') setActiveShellName(undefined);
        if (sEtc[0].type === 'key') setActiveKeyName(undefined);
        if (sEtc[0].type === 'bridge') setActiveBridge(undefined);
        setBoardList(sArray);

        if (sArray.length === 0) {
            addFile();
        }
    };

    const handleHover = (aValue: boolean) => {
        setHover(aValue);
    };

    const compareValue = (aBoard: any) => {
        switch (aBoard.type) {
            case 'sql':
            case 'tql':
            case 'json':
            case 'csv':
            case 'md':
            case 'html':
            case 'txt':
            case 'css':
            case 'js':
                setIsSaved(aBoard.code === pBoard.savedCode);
                break;
            case 'wrk':
                if (JSON.parse(pBoard.savedCode).data) {
                    setIsSaved(`{"data":${JSON.stringify(aBoard.sheet)}}` === pBoard.savedCode);
                    break;
                } else {
                    setIsSaved(JSON.stringify(aBoard.sheet) === pBoard.savedCode);
                }
                break;
            case 'dsh':
                if (aBoard.savedCode && typeof aBoard.savedCode === 'string' && isValidJSON(aBoard.savedCode)) {
                    if (JSON.stringify(pBoard.dashboard) === aBoard.savedCode) {
                        setIsSaved(true);
                    } else {
                        setIsSaved(false);
                    }
                } else {
                    setIsSaved(false);
                }
                break;
            case 'taz':
                if (aBoard.savedCode && typeof aBoard.savedCode === 'string' && isValidJSON(aBoard.savedCode)) {
                    if (deepEqual(pBoard.panels, JSON.parse(aBoard.savedCode))) {
                        setIsSaved(true);
                    } else {
                        setIsSaved(false);
                    }
                } else {
                    setIsSaved(false);
                }
                break;
            case 'new':
            case 'term':
                setIsSaved(aBoard.savedCode === pBoard.savedCode);
                break;
            case 'key':
                setIsSaved(pBoard.savedCode);
                break;
            case 'timer':
                if (aBoard.code && pBoard.savedCode) {
                    setIsSaved(
                        JSON.stringify(
                            Object.keys(aBoard.code)
                                .sort()
                                .reduce((obj: any, key) => {
                                    obj[key] = aBoard.code[key];
                                    return obj;
                                }, {})
                        ) ===
                            JSON.stringify(
                                Object.keys(pBoard.savedCode)
                                    .sort()
                                    .reduce((obj: any, key) => {
                                        obj[key] = pBoard.savedCode[key];
                                        return obj;
                                    }, {})
                            )
                    );
                } else setIsSaved(false);

                break;
            case 'shell-manage':
                setIsSaved(JSON.stringify(aBoard.code) === JSON.stringify(pBoard.savedCode));
                break;
            case 'bridge':
                setIsSaved(pBoard.savedCode);
                break;
            default:
                setIsSaved(aBoard.code === pBoard.savedCode);
                break;
        }
        return;
    };
    const handleDragStart = () => {
        pSetSelectedTab(pBoard.id);
        pSetTabDragInfo({ ...pTabDragInfo, start: pIdx });
    };
    const handleDragEnter = () => {
        pSetTabDragInfo({ ...pTabDragInfo, enter: pIdx });
    };
    const handleDragEnd = (e: any) => {
        e.stopPropagation();
        pSetTabDragInfo({ ...pTabDragInfo, end: true });
    };

    const handleDragOver = (e: any) => {
        e.stopPropagation();
        if (sDragOver) clearTimeout(sDragOver);
        setDragOver(
            setTimeout(() => {
                pSetTabDragInfo({ ...pTabDragInfo, over: pIdx });
            }, 10)
        );
    };

    const handleDragLeave = (e: any) => {
        e.stopPropagation();
        clearTimeout(sDragOver);
    };

    return (
        <button
            onClick={() => pSetSelectedTab(pBoard.id)}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            className={
                pSelectedTab === pBoard.id
                    ? 'tab_button tab_select'
                    : `tab_button tab_none_select ${pTabDragInfo.over === pIdx && pTabDragInfo.start !== pIdx ? 'tab_none_select_drag_over' : ''}`
            }
        >
            <div className="round_right_wrap">
                <div className="round_right"></div>
            </div>
            <div
                // add event
                draggable
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="tab-inner"
            >
                <span className="tab-name">
                    <div style={{ display: 'flex', alignItems: 'center', width: '19px' }}>{icons(pBoard.type === 'term' ? pBoard.shell.icon : pBoard.type)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0 !important' }}>
                        <span className="tab-text">{pBoard.name}</span>
                    </div>
                </span>
                {sHover ? (
                    <span className="tab_close" onClick={closeTab}>
                        {icons('close')}
                    </span>
                ) : sIsSaved ? (
                    <span className="default-form"></span>
                ) : (
                    <span className="off-saved">
                        <SaveCricle />
                    </span>
                )}
            </div>

            <div className="round_left_wrap">
                <div className="round_left"></div>
            </div>
        </button>
    );
};
export default Tab;
