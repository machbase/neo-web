import { SaveCricle } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { getId } from '@/utils';
import icons from '@/utils/icons';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';

const OpenFile = ({ pBoard, pSetSelectedTab, pIdx }: any) => {
    const [sIsSaved, setIsSaved] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sHover, setHover] = useState(false);
    const [sSelectedTab] = useRecoilState(gSelectedTab);

    useEffect(() => {
        compareValue(pBoard);
    }, [pBoard]);

    const compareValue = (aBoard: any) => {
        if (sSelectedTab === aBoard.id) {
            switch (aBoard.type) {
                case 'sql':
                case 'tql':
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
                    setIsSaved(true);
                    break;
                default:
                    setIsSaved(aBoard.code === pBoard.savedCode);
                    break;
            }
        }
        return;
    };
    const addFile = () => {
        const sNewTab = { id: getId(), type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false };
        setBoardList([sNewTab]);
        pSetSelectedTab(sNewTab.id);
    };
    const closeTab = (aEvent: any) => {
        aEvent.stopPropagation();

        const sArray = JSON.parse(JSON.stringify(sBoardList));

        if (sBoardList[pIdx].id === sSelectedTab) {
            if (sBoardList.length === 1) {
                // return;
            } else if (sSelectedTab === sBoardList[sBoardList.length - 1].id) {
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
    return (
        <span
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            key={pBoard.id}
            className="editors-list"
            onClick={() => pSetSelectedTab(pBoard.id)}
            style={
                sSelectedTab === pBoard.id
                    ? {
                          background: '#242424',
                      }
                    : {}
            }
        >
            <span className="item-title">
                <div className="editors-icon">{icons(pBoard.type)}</div>
                <span>{pBoard.name}</span>
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
        </span>
    );
};
export default OpenFile;
