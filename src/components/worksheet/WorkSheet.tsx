import { useState, useEffect } from 'react';
import './WorkSheet.scss';
import { WorkSheetEditor } from './WorkSheetEditor';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedBoard } from '@/recoil/recoil';
import { getId } from '@/utils';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { Save, SaveAs, FolderOpen, IoPlayForwardSharp } from '@/assets/icons/Icon';

type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
interface WorkSheetProps {
    pHandleSaveModalOpen: () => void;
    setIsSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
    setIsOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WorkSheet = (props: WorkSheetProps) => {
    const { setIsOpenModal, pHandleSaveModalOpen, setIsSaveModal } = props;
    const setSaveWorkSheet = useSetRecoilState(gSaveWorkSheets);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sWorkSheets, setWorkSheets] = useState<any>([]);
    const [sSelectedBoard] = useState<any>(useRecoilValue<any>(gSelectedBoard));
    const [sAllRunCode, setAllRunCode] = useState<number>(0);
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
                return aItem.id === sSelectedBoard.id ? { ...aItem, sheet: sWorkSheets } : aItem;
            })
        );
    }, [sWorkSheets]);

    useEffect(() => {
        if (!sSelectedBoard) return;
        if (sSelectedBoard.sheet && sSelectedBoard.sheet.length === 0) setWorkSheets([sNewWrkDefaultData]);
        else setWorkSheets(sSelectedBoard.sheet);
    }, [sSelectedBoard]);

    return (
        <div className="worksheet-wrapper">
            <div className="worksheet-header">
                <div className="btn-cover" onClick={() => setAllRunCode(sAllRunCode + 1)}>
                    <IoPlayForwardSharp />
                </div>
                <div className="divider"></div>
                <div className="btn-cover" onClick={pHandleSaveModalOpen}>
                    <Save />
                </div>
                <div className="btn-cover" onClick={() => setIsSaveModal(true)}>
                    <SaveAs />
                </div>
                <div className="btn-cover" onClick={() => setIsOpenModal(true)}>
                    <FolderOpen />
                </div>
            </div>
            <div className="worksheet-body">
                <div className="worksheet">
                    {sWorkSheets &&
                        sWorkSheets.map((aSheetItem: any, aIdx: number) => {
                            return (
                                <WorkSheetEditor
                                    key={'sheet-' + aSheetItem.id}
                                    pData={aSheetItem}
                                    pIdx={aIdx}
                                    pWorkSheets={sWorkSheets}
                                    setSheet={setWorkSheets}
                                    pAllRunCode={sAllRunCode}
                                    pCallback={handleCallback}
                                />
                            );
                        })}
                </div>
            </div>
        </div>
    );
};