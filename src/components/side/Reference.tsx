import './Reference.scss';
import { getTutorial, postFileList } from '@/api/repository/api';
import { gBoardList, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import { binaryCodeEncodeBase64, getId, isImage } from '@/utils';
import icons from '@/utils/icons';
import { Dispatch, SetStateAction, useState } from 'react';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { VscCloudDownload } from 'react-icons/vsc';
import { IconButton } from '../buttons/IconButton';
import { Loader } from '../loader';
import { gFileTree } from '@/recoil/fileTree';
import { TreeFetchDrilling } from '@/utils/UpdateTree';

type REFERENCE_ITEM = {
    title: string;
    address: string;
    type: string;
    target?: string;
};
const SUPPORT_QUICK_INSTALL_LIST = ['Tutorials', 'Demo web app'];

const Reference = ({ pValue }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const setSelectedExtension = useSetRecoilState<string>(gSelectedExtension);

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

    return (
        <>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">{pValue.label}</span>
                </div>
            </div>
            <div style={{ overflow: 'auto' }}>
                {sCollapseTree &&
                    pValue.items.map((aItem: REFERENCE_ITEM, aIdx: number) => {
                        return (
                            <div key={aIdx} onClick={() => openReference(aItem)} className="file-wrap">
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons">{icons(aItem?.type)}</span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem?.title}</span>
                                </div>
                                {checkQuickInstall(aItem?.title) ? <QuickInstall pItem={aItem} pSetExtensionTab={setSelectedExtension} /> : null}
                            </div>
                        );
                    })}
            </div>
        </>
    );
};
export default Reference;

const QuickInstall = ({ pItem, pSetExtensionTab }: { pItem: REFERENCE_ITEM; pSetExtensionTab: Dispatch<SetStateAction<any>> }) => {
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const [sIsProcessing, setIsProcessing] = useState<boolean>(false);

    const handleQuickInstall = (e: React.MouseEvent<HTMLDivElement>, aItem: REFERENCE_ITEM) => {
        if (sIsProcessing) return;
        setIsProcessing(true);
        e.stopPropagation();
        const sPaylod = { url: aItem?.address, command: 'clone' };
        FetchQuickInstall(aItem?.title, sPaylod);
    };
    const FetchQuickInstall = async (aFileNm: string, aPayload: { url: string; command: string }) => {
        const sResult: any = await postFileList(aPayload, `/${aFileNm}`, '');
        setIsProcessing(false);
        if (sResult && sResult?.success) {
            const sDrillRes = await TreeFetchDrilling(sFileTree, `/${aFileNm}`);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            pSetExtensionTab('EXPLORER');
        }
    };
    return (
        <div className="res-side-quick-install-wrap">
            <IconButton
                pIsToopTip
                pToolTipContent="Quick install"
                pToolTipId="ref-side-quick-install"
                pIcon={sIsProcessing ? <Loader width="14px" height="14px" /> : <VscCloudDownload />}
                pWidth={18}
                pHeight={20}
                onClick={(e) => handleQuickInstall(e, pItem)}
            />
        </div>
    );
};
