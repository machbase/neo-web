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
            const sContentResult: any = await getTutorial(pValue.address);
            if (pValue.type === 'wrk') {
                const sAlreadyExist = sBoardList.filter((aBoard: any) => aBoard._CHEAT_SHEET && aBoard.name === pValue.title);

                if (sAlreadyExist.length > 0) {
                    setSelectedTab(sAlreadyExist[0].id);
                } else {
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
                }
                return;
            } else if (isImage(pValue.title + '.' + pValue.type)) {
                const base64 = binaryCodeEncodeBase64(sContentResult);
                const updateBoard = {
                    ...sTmpBoard,
                    code: base64,
                    savedCode: base64,
                    type: pValue.type,
                };

                sTmpBoard = updateBoard;

                setBoardList([...sBoardList, sTmpBoard]);
            } else {
                setBoardList([
                    ...sBoardList,
                    { id: sId, type: pValue.type, name: pValue.title, code: sContentResult, path: '', panels: [], sheet: [], savedCode: false, range_bgn: '', range_end: '' },
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
