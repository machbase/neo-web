import { getTutorial, postFileList } from '@/api/repository/api';
import { gBoardList, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import { binaryCodeEncodeBase64, getId, isImage } from '@/utils';
import icons from '@/utils/icons';
import { useState, useRef, useEffect } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { VscCloudDownload } from 'react-icons/vsc';
import { Loader } from '../../loader';
import { gFileTree } from '@/recoil/fileTree';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';
import { Toast } from '@/design-system/components';
import { Button, Side } from '@/design-system/components';

type REFERENCE_ITEM = {
    title: string;
    address: string;
    type: string;
    target?: string;
};
const SUPPORT_QUICK_INSTALL_LIST = ['Tutorials', 'Demo web app', 'Education'];

const RefList = ({ pValue }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const [sProcessingList, setProcessingList] = useState<string[]>([]);
    const quickInstallQueueRef = useRef<Promise<void>>(Promise.resolve());
    const fileTreeRef = useRef(sFileTree);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const setSelectedExtension = useSetRecoilState<string>(gSelectedExtension);

    useEffect(() => {
        fileTreeRef.current = sFileTree;
    }, [sFileTree]);

    const openReference = async (pValue: any) => {
        const sId = getId();
        let sTmpBoard: any = { id: sId, name: pValue.title, type: pValue.type, path: '', savedCode: false, code: '' };
        if (pValue.type === 'url') {
            window.open(pValue.address, pValue.target);
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
    const checkQuickInstall = (aName?: string): boolean => {
        let sResult = false;
        SUPPORT_QUICK_INSTALL_LIST.forEach((supItem: string) => {
            if (supItem?.toUpperCase() === aName?.toUpperCase()) sResult = true;
        });
        return sResult;
    };

    const FetchQuickInstall = async (aFileNm: string, aPayload: { url: string; command: string }) => {
        try {
            const sResult: any = await postFileList(aPayload, `/${aFileNm}`, '');
            if (sResult && sResult?.success) {
                quickInstallQueueRef.current = quickInstallQueueRef.current.then(async () => {
                    const currentFileTree = fileTreeRef.current;
                    const sDrillRes = await TreeFetchDrilling(currentFileTree, `/${aFileNm}`);
                    if (sDrillRes?.tree) {
                        setFileTree(sDrillRes.tree);
                        fileTreeRef.current = sDrillRes.tree;
                    }
                });
                await quickInstallQueueRef.current;
                setSelectedExtension('EXPLORER');
                Toast.success(`Creating in ${aFileNm} folder`);
            }
        } catch (error) {
            Toast.error(`Quick install failed: ${error}`);
        } finally {
            setProcessingList((prev) => prev.filter((item) => item !== aFileNm));
        }
    };
    const handleQuickInstall = async (aFileNm: string, aPayload: { url: string; command: string }) => {
        setProcessingList((prev) => [...prev, aFileNm]);
        await FetchQuickInstall(aFileNm, aPayload);
    };
    const checkProcessing = (aItem: REFERENCE_ITEM): boolean => {
        return sProcessingList?.some((item) => item === aItem?.address?.substring(aItem?.address?.lastIndexOf('/') + 1));
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
                                {checkQuickInstall(aItem?.title) ? (
                                    <Side.ItemAction>
                                        <QuickInstall pItem={aItem} pIsProcessing={checkProcessing(aItem)} pQuickInstall={handleQuickInstall} />
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

const QuickInstall = ({
    pItem,
    pIsProcessing,
    pQuickInstall,
}: {
    pItem: REFERENCE_ITEM;
    pIsProcessing: boolean;
    pQuickInstall: (aFileNm: string, aPayload: { url: string; command: string }) => Promise<void>;
}) => {
    const handleQuickInstall = async (e: React.MouseEvent<HTMLDivElement>, aItem: REFERENCE_ITEM) => {
        if (pIsProcessing) return;
        e.stopPropagation();
        const lastPath = aItem?.address?.substring(aItem?.address?.lastIndexOf('/') + 1);
        const sPaylod = { url: aItem?.address, command: 'clone' };
        await pQuickInstall(lastPath, sPaylod);
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
