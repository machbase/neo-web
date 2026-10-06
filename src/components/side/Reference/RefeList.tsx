import { getTutorial } from '@/api/repository/api';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { binaryCodeEncodeBase64, getId, isImage } from '@/utils';
import icons from '@/utils/icons';
import { useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { VscCloudDownload } from 'react-icons/vsc';
import { Loader } from '../../loader';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';
import { Toast } from '@/design-system/components';
import { Button, Side } from '@/design-system/components';
import { isQuickInstallable, openReferenceUrl, REFERENCE_ITEM, useQuickInstall } from './referenceActions';

const RefList = ({ pValue }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const { install, isInstalling } = useQuickInstall();

    const openReference = async (pValue: any) => {
        const sId = getId();
        let sTmpBoard: any = { id: sId, name: pValue.title, type: pValue.type, path: '', savedCode: false, code: '' };
        if (pValue.type === 'url') {
            openReferenceUrl(pValue);
            return;
        } else {
            // Every board opened from here is tagged _CHEAT_SHEET, so re-clicking an entry focuses the tab
            // it already opened instead of stacking duplicates. Used to be wrk-only; now that dsh/taz open
            // here too the check is hoisted, which also skips the fetch on a repeat click. A cheat sheet
            // saved through Save As takes the file's name and no longer matches, so it reopens as its own tab.
            const sAlreadyExist = sBoardList.find((aBoard: any) => aBoard._CHEAT_SHEET && aBoard.name === pValue.title);
            if (sAlreadyExist) {
                setSelectedTab(sAlreadyExist.id);
                return;
            }
            const sContentResult: any = await getTutorial(pValue.address);
            // References are served from /web/tutorials, not /web/api/files, so the raw-text
            // transformResponse in api/core does not apply and axios has already JSON.parse'd the body.
            // The .dsh/.taz loaders below are the file explorer's, which take the file as a string.
            const sRawContent = typeof sContentResult === 'string' ? sContentResult : JSON.stringify(sContentResult);
            if (pValue.type === 'wrk') {
                setBoardList([
                    ...sBoardList,
                    {
                        id: sId,
                        type: pValue.type,
                        name: pValue.title,
                        code: '',
                        _CHEAT_SHEET: true,
                        panels: [],
                        path: '',
                        sheet: sContentResult.data,
                        savedCode: JSON.stringify(sContentResult.data),
                        range_bgn: '',
                        range_end: '',
                    },
                ]);
                setSelectedTab(sId);
                return;
            } else if (isImage(pValue.title + '.' + pValue.type)) {
                const base64 = binaryCodeEncodeBase64(sContentResult);
                const updateBoard = {
                    ...sTmpBoard,
                    code: base64,
                    savedCode: base64,
                    type: pValue.type,
                    _CHEAT_SHEET: true,
                };

                sTmpBoard = updateBoard;

                setBoardList([...sBoardList, sTmpBoard]);
            } else if (pValue.type === 'dsh') {
                // A .dsh stores the whole board object, and Dashboard dereferences pInfo.dashboard during
                // render — without the file's `dashboard` the tab throws before it paints. Run the same
                // migration the file explorer runs (variables/distanceRange backfill, panel validate &
                // repair, version stamp), then re-apply the tab's own identity: the file carries its own
                // id/name/path ('NEO_STATZ.dsh', '/'), which would otherwise leave setSelectedTab pointing
                // at a stale id and Save writing back to the file's original path.
                const sTmpData: any = CheckDataCompatibility(sRawContent, 'dsh');
                sTmpBoard = { ...sTmpData, id: sId, type: pValue.type, name: pValue.title, path: '', savedCode: JSON.stringify(JSON.parse(sRawContent).dashboard), _CHEAT_SHEET: true };
                setBoardList([...sBoardList, sTmpBoard]);
            } else if (pValue.type === 'taz') {
                try {
                    sTmpBoard = { ...loadTazBoard(JSON.parse(sRawContent), sId, pValue.title, ''), _CHEAT_SHEET: true };
                } catch (error) {
                    Toast.error(error instanceof Error ? error.message : 'Failed to load TAZ file.');
                    return;
                }
                setBoardList([...sBoardList, sTmpBoard]);
            } else {
                setBoardList([
                    ...sBoardList,
                    { id: sId, type: pValue.type, name: pValue.title, code: sContentResult, path: '', panels: [], sheet: [], savedCode: false, range_bgn: '', range_end: '', _CHEAT_SHEET: true },
                ]);
            }
            setSelectedTab(sId);
        }
    };
    return (
        <>
            <Side.Collapse pCallback={() => setCollapseTree(!sCollapseTree)} pCollapseState={sCollapseTree}>
                <span>{pValue.label}</span>
            </Side.Collapse>
            {sCollapseTree && (
                <Side.List>
                    {pValue.items.map((aItem: REFERENCE_ITEM, aIdx: number) => {
                        return (
                            <Side.Item key={aIdx} onClick={() => openReference(aItem)}>
                                <Side.ItemContent>
                                    <Side.ItemIcon>{icons(aItem?.type)}</Side.ItemIcon>
                                    <Side.ItemText>{aItem?.title}</Side.ItemText>
                                </Side.ItemContent>
                                {isQuickInstallable(aItem?.title) ? (
                                    <Side.ItemAction>
                                        <QuickInstall pItem={aItem} pIsProcessing={isInstalling(aItem)} pQuickInstall={install} />
                                    </Side.ItemAction>
                                ) : null}
                            </Side.Item>
                        );
                    })}
                </Side.List>
            )}
        </>
    );
};
export default RefList;

const QuickInstall = ({ pItem, pIsProcessing, pQuickInstall }: { pItem: REFERENCE_ITEM; pIsProcessing: boolean; pQuickInstall: (aItem: REFERENCE_ITEM) => Promise<void> }) => {
    const handleQuickInstall = async (e: React.MouseEvent<HTMLDivElement>, aItem: REFERENCE_ITEM) => {
        if (pIsProcessing) return;
        e.stopPropagation();
        await pQuickInstall(aItem);
    };

    return (
        <Button
            size="side"
            variant="ghost"
            isToolTip
            toolTipContent="Quick install"
            icon={pIsProcessing ? <Loader width="14px" height="14px" /> : <VscCloudDownload size={16} />}
            onClick={(e: any) => handleQuickInstall(e, pItem)}
        />
    );
};
