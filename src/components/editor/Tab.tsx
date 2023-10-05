import { gBoardList } from '@/recoil/recoil';
import { getId } from '@/utils';
import icons from '@/utils/icons';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { SaveCricle } from '@/assets/icons/Icon';
import './Tab.scss';

const Tab = ({ pBoard, pSelectedTab, pSetSelectedTab, pIdx, pTabDragInfo, pSetTabDragInfo }: any) => {
    const [sHover, setHover] = useState(false);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sIsSaved, setIsSaved] = useState<boolean>(false);

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
        sArray.splice(pIdx, 1);

        setBoardList(sArray);

        if (sArray.length === 0) {
            addFile();
        }
    };

    const handleHover = (aValue: boolean) => {
        setHover(aValue);
    };

    const compareValue = (aBoard: any) => {
        if (pSelectedTab === aBoard.id) {
            switch (aBoard.type) {
                case 'sql':
                case 'tql':
                case 'json':
                case 'csv':
                case 'md':
                case 'txt':
                    setIsSaved(aBoard.code === pBoard.savedCode);
                    break;
                case 'wrk':
                    if (JSON.parse(pBoard.savedCode).data) {
                        setIsSaved(`{"data":${JSON.stringify(aBoard.sheet)}}` === pBoard.savedCode);
                        break;
                    } else {
                        setIsSaved(JSON.stringify(aBoard.sheet) === pBoard.savedCode);
                        break;
                    }
                case 'taz':
                case 'new':
                case 'term':
                    setIsSaved(aBoard.savedCode === pBoard.savedCode);
                    break;
                default:
                    setIsSaved(aBoard.code === pBoard.savedCode);
                    break;
            }
        }
        return;
    };
    const handleDragStart = () => {
        pSetTabDragInfo({ ...pTabDragInfo, start: pIdx });
    };
    const handleDragEnter = (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        pSetTabDragInfo({ ...pTabDragInfo, enter: pIdx });
    };
    const handleDragEnd = (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        pSetTabDragInfo({ ...pTabDragInfo, end: true });
    };
    // const handleDragLeave = (e: any) => {};
    // const handleDragOver = (e: any) => {};

    return (
        <button
            onClick={() => pSetSelectedTab(pBoard.id)}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            className={pSelectedTab === pBoard.id ? 'tab_button tab_select' : 'tab_button tab_none_select'}
        >
            <div className="round_right_wrap">
                <div className="round_right"></div>
            </div>
            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
                //
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
                    <span className="off-saved" style={{ padding: '0 !important' }}>
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
