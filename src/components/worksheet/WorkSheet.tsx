import './WorkSheet.scss';
import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkSheetEditor } from './WorkSheetEditor';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId, isEmpty } from '@/utils';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { Save, SaveAs, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';
import { FaStop } from 'react-icons/fa';
import { Button } from '@/design-system/components';
import { RiTimeZoneLine } from 'react-icons/ri';
import { TimeZoneModal } from '../modal/TimeZoneModal';

type CallbackEventType = 'LocUp' | 'LocDown' | 'AddTop' | 'AddBottom' | 'Delete';
interface WorkSheetProps {
    pIsActiveTab: boolean;
    pId: string;
    pSheet: any;
    pHandleSaveModalOpen: () => void;
    setIsSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WorkSheet = (props: WorkSheetProps) => {
    const { pIsActiveTab, pId, pSheet, pHandleSaveModalOpen, setIsSaveModal } = props;
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
    const [sTimeRange, setTimeRange] = useState('2006-01-02 15:04:05');
    const [sTimeZone, setTimeZone] = useState('LOCAL');
    const [sIsTimeZoneModal, setIsTimeZoneModal] = useState<boolean>(false);
    const [sStopState, setStopState] = useState<boolean[]>(Array.from({ length: sWorkSheets?.length ?? 1 }, () => false));
    const [sCurrentScrollTop, setCurrentScrollTop] = useState<number>(0);
    const worksheetBodyRef = useRef<HTMLDivElement>(null);
    const SCROLL_GAP = 10;
    const LAST_CHILD_DELAY = 1000; // 1s

    const checkSectionState = useCallback(() => {
        return sStopState?.some((state) => state) ?? false;
    }, [sStopState]);

    const handleScrollToElement = useCallback(
        (targetScrollTop: number, isLastChild: boolean = false) => {
            if (!worksheetBodyRef?.current || targetScrollTop <= sCurrentScrollTop) return;
            const executeScroll = () => {
                if (worksheetBodyRef.current) {
                    if (isLastChild) setTimeout(() => ((worksheetBodyRef?.current as any).scrollTop = targetScrollTop * 2), LAST_CHILD_DELAY);
                    else worksheetBodyRef.current.scrollTop = targetScrollTop - SCROLL_GAP;
                    setCurrentScrollTop(targetScrollTop);
                }
            };
            executeScroll();
        },
        [sCurrentScrollTop]
    );

    // Track scroll position
    useEffect(() => {
        const element = worksheetBodyRef.current;
        if (!element) return;

        const handleScroll = () => {
            setCurrentScrollTop(element.scrollTop);
        };

        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
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
                return handleUpdateSheet(sWorkSheets.filter((aSheet: any) => aSheet.id !== aData.id));
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
        handleUpdateSheet(sResult);
    };
    const addSheet = (aSheetId: string, aDirection: number) => {
        const copySheet = JSON.parse(JSON.stringify(sWorkSheets));
        copySheet.splice(sWorkSheets.findIndex((aSheet: any) => aSheet.id === aSheetId) + aDirection, 0, sNewWrkDefaultData);
        handleUpdateSheet(copySheet);
    };
    const handleAllRunCode = (aStatus: boolean, aIdx: number) => {
        if (!aStatus || sAllRunCodeList.length === aIdx + 1) {
            setRunCodeTarget(undefined);
            setAllRunCodeList([]);
            setAllRunCodeStatus(false);
            return;
        }
        const sTmp = JSON.parse(JSON.stringify(sAllRunCodeList));
        sTmp.splice(aIdx + 1, 1, aStatus);
        setRunCodeTarget((sRunCodeTarget as number) + 1);
        setAllRunCodeList(sTmp);
    };
    const handleUpdateSheet = (aSheet: any) => {
        setSaveWorkSheet(aSheet);
        setWorkSheets(aSheet);
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === pId ? { ...aItem, sheet: aSheet } : aItem;
            })
        );
    };
    const handleStopState = (aState: boolean) => {
        setStopState(() => Array.from({ length: sWorkSheets?.length }, () => aState));
    };
    const handleInterrupt = () => {
        setAllRunCodeStatus(false);
        if (!sAllRunCodeStatus) {
            setRunCodeTarget(undefined);
            setAllRunCodeList([]);
        }
    };
    const handleTimeZone = (time: { timeFormat: string; timeZone: string }) => {
        setTimeRange(time.timeFormat);
        setTimeZone(time.timeZone);
        setIsTimeZoneModal(false);
    };
    const handleAllRun = () => {
        const element = worksheetBodyRef.current;
        if (element) {
            element.scrollTop = 0;
        }

        setAllRunCodeStatus(!sAllRunCodeStatus);
    };

    useEffect(() => {
        if (sAllRunCodeStatus) {
            handleStopState(true);
            const sTmp = new Array(sWorkSheets.length).fill(false);
            sTmp.splice(0, 1, true);
            setRunCodeTarget(0);
            setAllRunCodeList(sTmp);
        } else {
            handleStopState(false);
            setRunCodeTarget(undefined);
            setAllRunCodeList([]);
        }
    }, [sAllRunCodeStatus]);
    useEffect(() => {
        setWorkSheets(!isEmpty(pSheet) ? pSheet : [sNewWrkDefaultData]);
        return () => {
            setSaveWorkSheet([]);
        };
    }, []);

    return (
        <div className="worksheet-wrapper">
            <div className="worksheet-header">
                <IconButton
                    pPlace="bottom-start"
                    pIsToopTip
                    pToolTipId="wrk-tab-run-code"
                    onClick={checkSectionState() ? handleInterrupt : handleAllRun}
                    pToolTipContent={checkSectionState() ? 'Stop code' : 'Run code'}
                    pIcon={checkSectionState() ? <FaStop /> : <IoPlayForwardSharp />}
                />
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <Button
                        size="icon"
                        variant="none"
                        isToolTip
                        toolTipContent="Time format / Time zone"
                        icon={<RiTimeZoneLine size={18} />}
                        onClick={() => setIsTimeZoneModal(!sIsTimeZoneModal)}
                    />
                    <div className="divider" />
                    <IconButton pPlace="bottom-start" pIsToopTip pToolTipContent="Save" pToolTipId="wrk-tab-save" pIcon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                    <IconButton
                        pPlace="bottom-start"
                        pIsToopTip
                        pToolTipContent="Save as"
                        pToolTipId="wrk-tab-save-as"
                        pIcon={<SaveAs size={18} />}
                        onClick={() => setIsSaveModal(true)}
                    />
                </div>
            </div>
            <div ref={worksheetBodyRef} className="worksheet-body scrollbar-dark-border">
                <div className="worksheet">
                    {sWorkSheets &&
                        sWorkSheets.length !== 0 &&
                        sWorkSheets.map((aSheetItem: any, aIdx: number) => {
                            return (
                                <WorkSheetEditor
                                    pTimeRange={sTimeRange}
                                    pTimeZone={sTimeZone}
                                    pIsActiveTab={pIsActiveTab}
                                    key={'sheet-' + aSheetItem.id}
                                    pData={aSheetItem}
                                    pWrkId={pId}
                                    pIdx={aIdx}
                                    pAllRunCodeTargetIdx={sRunCodeTarget}
                                    pAllRunCodeStatus={sAllRunCodeStatus}
                                    pAllRunCodeList={sAllRunCodeList}
                                    pAllRunCodeCallback={(aStatus: boolean) => handleAllRunCode(aStatus, aIdx)}
                                    pStopState={sStopState}
                                    pSetStopState={setStopState}
                                    pWorkSheets={sWorkSheets}
                                    setSheet={handleUpdateSheet}
                                    pCallback={handleCallback}
                                    pScrollToElement={handleScrollToElement}
                                />
                            );
                        })}
                </div>
            </div>
            <TimeZoneModal isOpen={sIsTimeZoneModal} formatInitValue={sTimeRange} zoneInitValue={sTimeZone} onClose={handleTimeZone} />
        </div>
    );
};
