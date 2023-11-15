import { getTutorial } from '@/api/repository/api';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { binaryCodeEncodeBase64, getId, isImage } from '@/utils';
import icons from '@/utils/icons';
import { useState } from 'react';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import './Reference.scss';

const Reference = ({ pValue }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);

    const openReference = async (pValue: any) => {
        const sId = getId();
        let sTmpBoard: any = { id: sId, name: pValue.title, type: pValue.type, path: '', savedCode: false, code: '' };
        if (pValue.type === 'url') {
            window.open(pValue.address, pValue.target);
            return;
        } else {
            const sContentResult: any = await getTutorial(pValue.address);
            if (pValue.type === 'wrk') {
                setBoardList([
                    ...sBoardList,
                    {
                        id: sId,
                        type: pValue.type,
                        name: pValue.title,
                        code: '',
                        panels: [],
                        path: '',
                        sheet: sContentResult.data,
                        savedCode: false,
                        range_bgn: '',
                        range_end: '',
                    },
                ]);
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
    return (
        <>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>

                <div className="files-open-option">
                    <span className="title-text">{pValue.label}</span>
                </div>
            </div>
            <div style={{ overflow: 'auto' }}>
                {sCollapseTree &&
                    pValue.items.map((aItem: any, aIdx: number) => {
                        return (
                            <div key={aIdx} onClick={() => openReference(aItem)} className="file-wrap">
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                    <span className="icons">{icons(aItem.type)}</span>
                                    <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{aItem.title}</span>
                                </div>
                                <div></div>
                            </div>
                        );
                    })}
            </div>
        </>
    );
};
export default Reference;
