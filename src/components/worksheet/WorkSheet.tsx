import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkSheetEditor } from './WorkSheetEditor';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId, isEmpty } from '@/utils';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { Save, SaveAs, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { FaStop } from 'react-icons/fa';
import { Button, Page } from '@/design-system/components';
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
    const userScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();
    const SCROLL_GAP = 10;
    const LAST_CHILD_DELAY = 1000; // 1s
    const USER_SCROLL_DELAY = 1000; // 1s

    const checkSectionState = useCallback(() => {
        return sStopState?.some((state) => state) ?? false;
    }, [sStopState]);

    const handleScrollToElement = useCallback(
        (targetScrollTop: number, isLastChild: boolean = false, forceScroll: boolean = false) => {
            if (!worksheetBodyRef?.current) return;
            // Skip auto-scroll if user is manually scrolling
            if (userScrollingRef.current) return;
            // Skip scroll if target is above current position, unless forceScroll is true
            if (!forceScroll && targetScrollTop <= sCurrentScrollTop) return;

            const executeScroll = () => {
                if (worksheetBodyRef.current) {
                    const newScrollTop = isLastChild ? targetScrollTop * 2 : targetScrollTop - SCROLL_GAP;

                    if (isLastChild) {
                        setTimeout(() => {
                            worksheetBodyRef?.current?.scrollTo({
                                top: newScrollTop,
                                behavior: 'smooth',
                            });
                        }, LAST_CHILD_DELAY);
                    } else {
                        worksheetBodyRef.current.scrollTo({
                            top: newScrollTop,
                            behavior: 'smooth',
                        });
                    }
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

    // Detect user manual scroll and pause auto-scroll
    useEffect(() => {
        const element = worksheetBodyRef.current;
        if (!element) return;

        // Reset user scrolling state when all run code ends
        if (!sAllRunCodeStatus) {
            userScrollingRef.current = false;
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = undefined;
            }
            return;
        }

        const handleUserInput = () => {
            userScrollingRef.current = true;

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                userScrollingRef.current = false;
            }, USER_SCROLL_DELAY);
        };

        element.addEventListener('wheel', handleUserInput, { passive: true });
        element.addEventListener('touchmove', handleUserInput, { passive: true });

        return () => {
            element.removeEventListener('wheel', handleUserInput);
            element.removeEventListener('touchmove', handleUserInput);
        };
    }, [sAllRunCodeStatus]);

    // Disable browser scroll restoration to prevent auto-scroll on initial load
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            const originalScrollRestoration = window.history.scrollRestoration;
            window.history.scrollRestoration = 'manual';

            return () => {
                window.history.scrollRestoration = originalScrollRestoration;
            };
        }
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
            setCurrentScrollTop(0);
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
        <>
            <Page>
                <Page.Header>
                    <Button
                        size="sm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={checkSectionState() ? 'Stop code' : 'Run code'}
                        icon={checkSectionState() ? <FaStop /> : <IoPlayForwardSharp />}
                        onClick={checkSectionState() ? handleInterrupt : handleAllRun}
                    />
                    <Button.Group>
                        <Button
                            size="sm"
                            variant="ghost"
                            isToolTip
                            toolTipContent="Time format / Time zone"
                            icon={<RiTimeZoneLine size={18} />}
                            onClick={() => setIsTimeZoneModal(!sIsTimeZoneModal)}
                        />
                        <Button size="sm" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                        <Button size="sm" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={18} />} onClick={() => setIsSaveModal(true)} />
                    </Button.Group>
                </Page.Header>
                <Page.Body ref={worksheetBodyRef} scrollButtons style={{ padding: '12px 24px 12px 16px' }}>
                    <Page.ContentBlock pHoverNone>
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
                                        pScrollContainerRef={worksheetBodyRef}
                                    />
                                );
                            })}
                    </Page.ContentBlock>
                </Page.Body>
            </Page>
            <TimeZoneModal isOpen={sIsTimeZoneModal} formatInitValue={sTimeRange} zoneInitValue={sTimeZone} onClose={handleTimeZone} />
        </>
    );
};
