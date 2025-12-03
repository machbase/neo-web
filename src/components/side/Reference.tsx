import './Reference.scss';
import { getTutorial, postFileList } from '@/api/repository/api';
import { gBoardList, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import { binaryCodeEncodeBase64, getId, isImage } from '@/utils';
import icons from '@/utils/icons';
import { useState, useRef, useEffect } from 'react';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { VscCloudDownload } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { Loader } from '../loader';
import { gFileTree } from '@/recoil/fileTree';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { Error, Success } from '../toast/Toast';

type REFERENCE_ITEM = {
    title: string;
    address: string;
    type: string;
    target?: string;
};
const SUPPORT_QUICK_INSTALL_LIST = ['Tutorials', 'Demo web app', 'Education'];

const Reference = ({ pValue }: any) => {
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
                Success(`Creating in ${aFileNm} folder`);
            }
        } catch (error) {
            Error(`Quick install failed: ${error}`);
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
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">{pValue.label}</span>
                </div>
            </div>
            <div className="scrollbar-dark" style={{ overflow: 'auto' }}>
                {sCollapseTree &&
                    pValue.items.map((aItem: REFERENCE_ITEM, aIdx: number) => {
                        return (
                            <div key={aIdx} onClick={() => openReference(aItem)} className="file-wrap">
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons">{icons(aItem?.type)}</span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem?.title}</span>
                                </div>
                                {checkQuickInstall(aItem?.title) ? <QuickInstall pItem={aItem} pIsProcessing={checkProcessing(aItem)} pQuickInstall={handleQuickInstall} /> : null}
                            </div>
                        );
                    })}
            </div>
        </>
    );
};
export default Reference;

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
        <div className="res-side-quick-install-wrap">
            <IconButton
                pIsToopTip
                pToolTipContent="Quick install"
                pToolTipId="ref-side-quick-install"
                pIcon={pIsProcessing ? <Loader width="14px" height="14px" /> : <VscCloudDownload />}
                pWidth={18}
                pHeight={20}
                onClick={(e) => handleQuickInstall(e, pItem)}
            />
        </div>
    );
};
