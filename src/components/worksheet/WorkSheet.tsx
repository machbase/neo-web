import { useState, useEffect } from 'react';
import './WorkSheet.scss';
import { WorkSheetEditor } from './WorkSheetEditor';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId, isEmpty } from '@/utils';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { Save, SaveAs, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';

type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
interface WorkSheetProps {
    pId: string;
    pSheet: any;
    pHandleSaveModalOpen: () => void;
    setIsSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
    setIsOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WorkSheet = (props: WorkSheetProps) => {
    const { pId, pSheet, pHandleSaveModalOpen, setIsSaveModal } = props;
    const setSaveWorkSheet = useSetRecoilState(gSaveWorkSheets);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sWorkSheets, setWorkSheets] = useState<any>([]);
    const [sAllRunCodeStatus, setAllRunCodeStatus] = useState<boolean>(false);
    const [sAllRunCodeList, setAllRunCodeList] = useState<boolean[]>([]);
    const [sRunCodeTarget, setRunCodeTarget] = useState<number | undefined>(undefined);
    const sNewWrkDefaultData = {
        contents: '',
        height: 200,
        id: getId(),
        lang: [
            ['markdown', 'Markdown'],
            ['SQL', 'SQL'],
            ['javascript', 'TQL'],
        ],
        minimal: false,
        result: '',
        status: true,
        type: 'mrk',
    };

    useEffect(() => {
        if (!isEmpty(pSheet)) {
            setWorkSheets(pSheet);
        } else setWorkSheets([sNewWrkDefaultData]);
        return () => {
            setSaveWorkSheet([]);
        };
    }, []);

    const handleCallback = (aData: { id: string; event: CallbackEventType }) => {
        switch (aData.event) {
            case 'LocUp':
                return moveSheet(aData.id, -1);
            case 'LocDown':
                return moveSheet(aData.id, 1);
            case 'AddTop':
                return addSheet(aData.id, 0);
            case 'AddBottom':
                return addSheet(aData.id, 1);
            case 'Delete':
                return setWorkSheets(sWorkSheets.filter((aSheet: any) => aSheet.id !== aData.id));
        }
    };

    const moveSheet = (aSheetId: string, aDirection: number) => {
        const loc = sWorkSheets.findIndex((aSheet: any) => aSheet.id === aSheetId);
        if (loc === 0 && aDirection === -1) return;
        if (loc + 1 === sWorkSheets.length && aDirection === 0) return;

        const copySheet = JSON.parse(JSON.stringify(sWorkSheets));
        const sTarget = copySheet.filter((aSheet: any) => aSheet.id === aSheetId);
        const sResult = copySheet.filter((aSheet: any) => aSheet.id !== aSheetId);
        sResult.splice(loc + aDirection, 0, ...sTarget);
        setWorkSheets(sResult);
    };

    const addSheet = (aSheetId: string, aDirection: number) => {
        const copySheet = JSON.parse(JSON.stringify(sWorkSheets));
        copySheet.splice(sWorkSheets.findIndex((aSheet: any) => aSheet.id === aSheetId) + aDirection, 0, sNewWrkDefaultData);
        setWorkSheets(copySheet);
    };

    useEffect(() => {
        setSaveWorkSheet(sWorkSheets);
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === pId ? { ...aItem, sheet: sWorkSheets } : aItem;
            })
        );
    }, [sWorkSheets]);

    const handleAllRunCode = (aStatus: boolean, aIdx: number) => {
        if (!aStatus || sAllRunCodeList.length === aIdx + 1) {
            setRunCodeTarget(undefined);
            setAllRunCodeList([]);
            setAllRunCodeStatus(false);
        }
        const sTmp = JSON.parse(JSON.stringify(sAllRunCodeList));
        sTmp.splice(aIdx + 1, 1, aStatus);
        setRunCodeTarget((sRunCodeTarget as number) + 1);
        setAllRunCodeList(sTmp);
    };

    useEffect(() => {
        if (sAllRunCodeStatus) {
            sWorkSheets.length;
            const sTmp = new Array(sWorkSheets.length).fill(false);
            sTmp.splice(0, 1, true);
            setRunCodeTarget(0);
            setAllRunCodeList(sTmp);
        }
    }, [sAllRunCodeStatus]);

    return (
        <div className="worksheet-wrapper">
            <div className="worksheet-header">
                <IconButton pIcon={<IoPlayForwardSharp />} onClick={() => setAllRunCodeStatus(true)} />
                <div className="divider"></div>
                <IconButton pIcon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                <IconButton pIcon={<SaveAs size={18} />} onClick={() => setIsSaveModal(true)} />
            </div>
            <div className="worksheet-body">
                <div className="worksheet">
                    {sWorkSheets &&
                        sWorkSheets.length !== 0 &&
                        sWorkSheets.map((aSheetItem: any, aIdx: number) => {
                            return (
                                <WorkSheetEditor
                                    key={'sheet-' + aSheetItem.id}
                                    pData={aSheetItem}
                                    pIdx={aIdx}
                                    pAllRunCodeTargetIdx={sRunCodeTarget}
                                    pAllRunCodeStatus={sAllRunCodeStatus}
                                    pAllRunCodeList={sAllRunCodeList}
                                    pAllRunCodeCallback={(aStatus: boolean) => handleAllRunCode(aStatus, aIdx)}
                                    pWorkSheets={sWorkSheets}
                                    setSheet={setWorkSheets}
                                    pCallback={handleCallback}
                                />
                            );
                        })}
                </div>
            </div>
        </div>
    );
};
