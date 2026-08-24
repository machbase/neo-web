import { SaveCricle } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { getId } from '@/utils';
import { useClosePkgView } from '@/components/side/AppStore/pkgViews';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import icons from '@/utils/icons';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { Button, Side } from '@/design-system/components';

const OpenFile = ({ pBoard, pSetSelectedTab, pIdx }: any) => {
    const [sIsSaved, setIsSaved] = useState<boolean>(true);
    const [sBoardList, setBoardList] = useRecoilState<any>(gBoardList);
    const [sHover, setHover] = useState(false);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    // Closing an `APP:` tab here ends the package's session, exactly as closing it
    // from the tab strip does — see MainContent.resetActiveStateForClosedBoard.
    const closePkgView = useClosePkgView();

    useEffect(() => {
        compareValue(pBoard);
    }, [pBoard]);

    const compareValue = (aBoard: any) => {
        if (sSelectedTab === aBoard.id) {
            setIsSaved(isBoardSaved(aBoard));
        }
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
        const closedBoard = sArray[pIdx];
        sArray.splice(pIdx, 1);

        if (closedBoard?.type === 'appView' && closedBoard.code?.appName) closePkgView(closedBoard.code.appName);

        setBoardList(sArray);

        if (sArray.length === 0) {
            addFile();
        }
    };

    return (
        <Side.Item onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} active={sSelectedTab === pBoard.id} onClick={() => pSetSelectedTab(pBoard.id)}>
            <Side.ItemContent>
                <Side.ItemIcon>{icons(pBoard.type)}</Side.ItemIcon>
                <Side.ItemText>{pBoard.name}</Side.ItemText>
            </Side.ItemContent>
            <Side.ItemAction>
                {sHover ? (
                    <span onClick={closeTab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icons('close')}
                    </span>
                ) : sIsSaved ? (
                    <span style={{ width: '16px', height: '16px' }} />
                ) : (
                    <Button size="fit" variant="none" icon={<SaveCricle size={10} style={{ paddingLeft: '1px' }} />} />
                )}
            </Side.ItemAction>
        </Side.Item>
    );
};

export default OpenFile;
