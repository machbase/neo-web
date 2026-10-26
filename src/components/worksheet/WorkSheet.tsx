import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkSheetEditor } from './WorkSheetEditor';
import { useSetRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId, isEmpty } from '@/utils';
import { Save, SaveAs, IoPlayForwardSharp } from '@/assets/icons/Icon';
import { FaStop } from 'react-icons/fa';
import { Button, ErrorBoundary, ErrorCard, Page } from '@/design-system/components';
import { getWorksheetCellLoadError } from './worksheetCell';
import { RiTimeZoneLine } from 'react-icons/ri';
import { TimeZoneModal } from '../modal/TimeZoneModal';
import { ConfirmModal } from '../modal/ConfirmModal';
import { TargetDatabaseChip, useTabTargetDatabase } from '@/components/database/targetDatabase';
import { touchRecentDatabase } from '@/utils/targetDatabaseStore';

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
    const setBoardList = useSetRecoilState(gBoardList);
    const [sWorkSheets, setWorkSheets] = useState<any>([]);
    const [sAllRunCodeStatus, setAllRunCodeStatus] = useState<boolean>(false);
    const [sAllRunCodeList, setAllRunCodeList] = useState<boolean[]>([]);
    const [sRunCodeTarget, setRunCodeTarget] = useState<number | undefined>(undefined);
    // Cells showing an error card. Run all waits for each cell to report back, and one that cannot
    // render never will — so the run stops when it reaches one, whenever that cell broke.
    const [sFailedCellIds, setFailedCellIds] = useState<string[]>([]);
    // By position: a cell saved broken (e.g. `null`) has no id to delete it by.
    const [sDeleteCellIndex, setDeleteCellIndex] = useState<number | undefined>(undefined);
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
    /**
     * One target database for the whole worksheet, applied from the header to every SQL cell —
     * the same shape as the time format and zone beside it, and it travels the same prop path.
     * Never written into the `.wrk` file: the saved cell payload is a fixed whitelist, and this
     * value is not part of it.
     */
    const {
        targetDatabase: sTargetDb,
        setTargetDatabase: setTargetDb,
        databases: sDatabaseList,
        sessionDatabase: sSessionDb,
        reload: reloadDatabases,
    } = useTabTargetDatabase();

    const handleChangeTargetDb = (aDatabase: string | null) => {
        setTargetDb(aDatabase);
        if (aDatabase) touchRecentDatabase(aDatabase);
    };
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
                return handleUpdateSheet(sWorkSheets.filter((aSheet: any) => aSheet?.id !== aData.id));
        }
    };
    const moveSheet = (aSheetId: string, aDirection: number) => {
        const loc = sWorkSheets.findIndex((aSheet: any) => aSheet?.id === aSheetId);
        if (loc === 0 && aDirection === -1) return;
        if (loc + 1 === sWorkSheets.length && aDirection === 0) return;
        const copySheet = JSON.parse(JSON.stringify(sWorkSheets));
        const sTarget = copySheet.filter((aSheet: any) => aSheet?.id === aSheetId);
        const sResult = copySheet.filter((aSheet: any) => aSheet?.id !== aSheetId);
        sResult.splice(loc + aDirection, 0, ...sTarget);
        handleUpdateSheet(sResult);
    };
    const addSheet = (aSheetId: string, aDirection: number) => {
        const copySheet = JSON.parse(JSON.stringify(sWorkSheets));
        copySheet.splice(sWorkSheets.findIndex((aSheet: any) => aSheet?.id === aSheetId) + aDirection, 0, sNewWrkDefaultData);
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
    useEffect(() => {
        if (!sAllRunCodeStatus || sRunCodeTarget === undefined) return;
        const sTarget = sWorkSheets[sRunCodeTarget];
        if (getWorksheetCellLoadError(sTarget) || sFailedCellIds.includes(sTarget?.id)) handleAllRunCode(false, sRunCodeTarget);
    }, [sAllRunCodeStatus, sRunCodeTarget, sFailedCellIds]);
    // One console line per cell that cannot be read — not one per render.
    const sReportedCellsRef = useRef(new Set<string>());
    useEffect(() => {
        sWorkSheets?.forEach((aCell: any, aIdx: number) => {
            const sError = getWorksheetCellLoadError(aCell);
            const sKey = `${aCell?.id ?? aIdx}:${sError}`;
            if (!sError || sReportedCellsRef.current.has(sKey)) return;
            sReportedCellsRef.current.add(sKey);
            console.error('[WorksheetLoad]', `cell ${aIdx + 1} kept as saved: ${sError}`);
        });
    }, [sWorkSheets]);
    const handleUpdateSheet = (aSheet: any) => {
        setWorkSheets(aSheet);
        setBoardList((boards) =>
            boards.map((aItem) => {
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
    }, []);

    return (
        <>
            <Page data-testid="worksheet">
                <Page.Header>
                    <Button
                        size="sm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={checkSectionState() ? 'Stop code' : 'Run code'}
                        data-testid={checkSectionState() ? 'stop-all' : 'run-all'}
                        icon={checkSectionState() ? <FaStop /> : <IoPlayForwardSharp />}
                        onClick={checkSectionState() ? handleInterrupt : handleAllRun}
                    />
                    <div className="editor-header-actions">
                        <Button.Group>
                            {/* Only where there is a choice to make — an empty catalogue is every pre-v8.7 server. */}
                            {sDatabaseList.length > 1 ? (
                                <TargetDatabaseChip
                                    sessionDatabase={sSessionDb}
                                    databases={sDatabaseList}
                                    value={sTargetDb}
                                    onChange={handleChangeTargetDb}
                                    onOpen={reloadDatabases}
                                />
                            ) : null}
                            <Button
                                size="sm"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Time format / Time zone"
                                icon={<RiTimeZoneLine size={18} />}
                                onClick={() => setIsTimeZoneModal(!sIsTimeZoneModal)}
                            />
                        </Button.Group>
                        <span className="editor-header-divider" />
                        <Button.Group>
                            <Button size="sm" variant="ghost" isToolTip toolTipContent="Save" data-testid="save" icon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                            <Button size="sm" variant="ghost" isToolTip toolTipContent="Save as" data-testid="save-as" icon={<SaveAs size={18} />} onClick={() => setIsSaveModal(true)} />
                        </Button.Group>
                    </div>
                </Page.Header>
                <Page.Body ref={worksheetBodyRef} scrollButtons style={{ padding: '12px 24px 12px 16px' }}>
                    <Page.ContentBlock pHoverNone style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {sWorkSheets &&
                            sWorkSheets.length !== 0 &&
                            sWorkSheets.map((aSheetItem: any, aIdx: number) => {
                                const sKey = 'sheet-' + (aSheetItem?.id ?? `index-${aIdx}`);
                                const sName = `wrk-cell:${aSheetItem?.id ?? aIdx}`;
                                // As wide as a cell's editor: the cell keeps a 54px column on its right
                                // (24px gap + the 30px collapse button) that the card would otherwise cover.
                                const sCardStyle = { width: 'calc(100% - 54px)' };
                                const sActions = sWorkSheets.length > 1 ? [{ label: 'Delete cell', testId: 'delete-cell', onClick: () => setDeleteCellIndex(aIdx) }] : [];
                                const sLoadError = getWorksheetCellLoadError(aSheetItem);
                                return sLoadError ? (
                                    <ErrorCard
                                        key={sKey}
                                        name={sName}
                                        variant="unit"
                                        title="Can't load this cell."
                                        message={`Its saved content can't be read, so it can't be shown or edited here. Delete it, or fix it in the file. (${sLoadError})`}
                                        actions={sActions}
                                        fallbackStyle={sCardStyle}
                                    />
                                ) : (
                                    <ErrorBoundary
                                        key={sKey}
                                        name={sName}
                                        variant="unit"
                                        fallbackStyle={sCardStyle}
                                        actions={sActions}
                                        onError={() => setFailedCellIds((aPrev) => [...aPrev, aSheetItem?.id])}
                                        onReset={() => setFailedCellIds((aPrev) => aPrev.filter((aId) => aId !== aSheetItem?.id))}
                                    >
                                            <WorkSheetEditor
                                                pTimeRange={sTimeRange}
                                                pTimeZone={sTimeZone}
                                                pTargetDb={sTargetDb}
                                                pIsActiveTab={pIsActiveTab}
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
                                    </ErrorBoundary>
                                );
                            })}
                    </Page.ContentBlock>
                </Page.Body>
            </Page>
            {sDeleteCellIndex !== undefined && (
                <ConfirmModal
                    pIsDarkMode
                    data-testid="worksheet-delete-cell-dialog"
                    setIsOpen={() => setDeleteCellIndex(undefined)}
                    pCallback={() => {
                        handleUpdateSheet(sWorkSheets.filter((_: any, aIdx: number) => aIdx !== sDeleteCellIndex));
                        setDeleteCellIndex(undefined);
                    }}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                />
            )}
            <TimeZoneModal isOpen={sIsTimeZoneModal} formatInitValue={sTimeRange} zoneInitValue={sTimeZone} onClose={handleTimeZone} />
        </>
    );
};
