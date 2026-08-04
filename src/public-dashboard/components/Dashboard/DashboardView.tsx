import Panel from '../panels/Panel';
import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { useParams, useSearchParams } from 'react-router-dom';
import moment from 'moment';
import { MdRefresh } from '../../assets/icons/Icon';
import { calcRefreshTime, setUnitTime } from '../../utils/dashboardUtil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '../../utils/constants';
import { getId, isMobile } from '../../utils';
import TimeRangeModal from '../../components/modal/TimeRangeModal';
import AutoRefreshControl from '@/components/dashboard/AutoRefreshControl';
import RangeChips from '@/components/dashboard/RangeChips';
import DistanceRangeModal from '../modal/DistanceRangeModal';
import { fetchBlockBaseMinMax } from '../../utils/dashboardBaseMinMax';
import { isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { isDistanceAnchorEdge, isDistanceEdgeSet, resolveDistanceEdge } from '@/utils/distanceRange';
import { timeMinMaxConverter } from '../../utils/bgnEndTimeRange';
import { executeQuery, fetchMountTimeMinMax, fetchTimeMinMax } from '../../api/repository/machiot';
import { getTimeMinMaxFetchTarget, pickBoardTimeMinMaxPanel, shouldFetchBlockTimeMinMax } from '@/utils/dashboardTimeMinMax';
import { convertDashboardMinMaxRows } from '@/utils/dashboardBlockColumns';
import { CheckDataCompatibility } from '../../utils/CheckDataCompatibility';
import { VariableHeader } from '../variable/VariableHeader';
import { VARIABLE_TYPE } from '../variable';
import { IoMdOptions } from 'react-icons/io';
import { VariablePreview } from '../variable/VariablePreview';
import Footer from '../Footer/Footer';
import { Button } from '../../../design-system/components/Button';
import { Page } from '../../../design-system/components/Page';
import { Drawer } from '../../../design-system/components/Drawer';
import { Share } from '../../assets/icons/Icon';
import ShareModal from '../../components/modal/ShareModal';

const DashboardView = () => {
    const sParams = useParams();
    const [sSearchParams] = useSearchParams();
    const sBodyRef = useRef<HTMLDivElement>(null);
    const [sBoardInformation, setBoardInformation] = useState<{ dashboard: any; name: string; id: string; panelHeader: boolean }>();
    const [sNotfound, setNotFound] = useState<boolean>(false);
    const [sIsTimeRangeModal, setIsTimeRangeModal] = useState<boolean>(false);
    const sIsMobile = isMobile();
    const [sBoardTimeMinMax, setBoardTimeMinMax] = useState<any>(undefined);
    const sBoardRef = useRef<any>(undefined);
    // Bumped on every refresh tick so the countdown ring restarts with the fetch rather than free-running.
    const [sRingCycleId, setRingCycleId] = useState<number>(0);
    const [sVariableCollapse, setVariableCollapse] = useState<boolean>(false);
    const [sSelectVariable, setSelectVariable] = useState<string>('ALL');
    const [sChartVariableId, setChartVariableId] = useState<string>('');
    const variableRef = useRef<HTMLDivElement>(null);
    const [sShouldShowFooter, setShouldShowFooter] = useState<boolean>(false);
    const [sIsShareModal, setIsShareModal] = useState<boolean>(false);
    const [sIsDistanceModal, setIsDistanceModal] = useState<boolean>(false);

    const getDshFile = async (aFileName: string | undefined) => {
        if (!aFileName) return;
        try {
            const cleanFileName = aFileName.replace('board/', '');
            const response = await fetch(`/db/tql/${cleanFileName}.dsh`);
            if (response.ok) {
                const sResult = await response.text();
                const sParsedRes = CheckDataCompatibility(sResult, 'dsh');
                await handleDashboardTimeRange(sParsedRes.dashboard.timeRange.start, sParsedRes.dashboard.timeRange.end, sParsedRes);

                // Filter panels by video query parameter
                const videoId = sSearchParams.get('video');
                if (videoId) {
                    const videoPanel = sParsedRes.dashboard.panels.find((p: any) => p.id === videoId && p.type === 'Video');
                    if (videoPanel) {
                        const dependentPanelIds: string[] = videoPanel.chartOptions?.dependent?.panels ?? [];
                        sParsedRes.dashboard.panels = sParsedRes.dashboard.panels.filter((p: any) => p.id === videoId || dependentPanelIds.includes(p.id));
                    }
                }

                setBoardInformation(sParsedRes);
                setNotFound(false);
            } else {
                setNotFound(true);
            }
        } catch (error) {
            setNotFound(true);
        }
    };

    const variableButtonRef = useRef<HTMLDivElement>(null);
    const handleUpdateVariable = (updateVarList: VARIABLE_TYPE[]) => {
        const updateBoardInfo = {
            ...sBoardInformation,
            dashboard: { ...sBoardInformation?.dashboard, variables: updateVarList },
        };
        setBoardInformation(updateBoardInfo as any);
        handleRefresh();
        setVariableCollapse(false);
    };
    const handleDashboardTimeRange = async (sStart: any, sEnd: any, aBoardInfo?: any, aIsAutoRefresh?: boolean) => {
        const sBoard: any = aBoardInfo ?? sBoardInformation;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax(sBoard);
        // timeMinMaxConverter returns undefined for a mixed time range (only one side is now/last).
        // Without the same fallback the main dashboard has, every consumer downstream throws.
        const sTimeMinMax = timeMinMaxConverter(sStart, sEnd, sSvrRes) ?? { min: setUnitTime(sStart), max: setUnitTime(sEnd) };
        // Tell panels this is an auto-refresh tick: markdown/text/csv sink TQL panels ignore it.
        setBoardTimeMinMax(() => (aIsAutoRefresh ? { ...sTimeMinMax, autoRefresh: true } : sTimeMinMax));
        return;
    };
    const defaultMinMax = () => {
        const sNowTime = moment().unix() * 1000;
        const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
        return sNowTimeMinMax;
    };
    const fetchTableTimeMinMax = async (aBoardInfo: any): Promise<{ min: number; max: number }> => {
        // Source the board time min/max from a TIME (non-distance) panel — distance panels self-resolve.
        const sTargetPanel = pickBoardTimeMinMaxPanel(aBoardInfo.dashboard.panels);
        // No usable candidate (e.g. a TQL/Video-only board). Without this guard the TypeError below
        // stops handleRefresh before GenChartVariableId(), leaving Refresh silently dead.
        if (!sTargetPanel?.blockList?.length) return defaultMinMax();
        const sTargetTag = sTargetPanel.blockList[0];
        const sCustomTag = sTargetTag.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;
        if (shouldFetchBlockTimeMinMax(sTargetTag, sCustomTag)) {
            if (sTargetTag.customTable) return defaultMinMax();
            let sSvrResult: any = undefined;
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = await fetchTimeMinMax(getTimeMinMaxFetchTarget(sTargetTag, sCustomTag));
            }
            const sResult = convertDashboardMinMaxRows(sSvrResult, sTargetTag);
            if (!sResult) return defaultMinMax();
            return sResult;
        } else return defaultMinMax();
    };
    // A panel's own refresh interval, changed from the panel itself. Local to this view — there is
    // nothing to save here — but it drives the same per-panel timer the editor's setting does.
    const changePanelRefresh = (aPanelId: string, aRefresh: string) => {
        setBoardInformation((aPrev: any) =>
            aPrev
                ? {
                      ...aPrev,
                      dashboard: {
                          ...aPrev.dashboard,
                          panels: aPrev.dashboard.panels.map((aPanel: any) =>
                              aPanel.id === aPanelId ? { ...aPanel, timeRange: { ...aPanel.timeRange, refresh: aRefresh } } : aPanel
                          ),
                      },
                  }
                : aPrev
        );
    };
    // The board's distance window lives beside the time one and is read by every distance panel.
    const applyDistanceRange = (aRange: { start: number | string; end: number | string }) => {
        setBoardInformation((aPrev: any) => (aPrev ? { ...aPrev, dashboard: { ...aPrev.dashboard, distanceRange: aRange } } : aPrev));
    };
    // Shift only the distance axis by half its span — the same gesture the time chevrons make, and the
    // same resolution rule: an anchored edge is measured first, then written out as coordinates.
    const moveDistanceRange = async (aDir: 'l' | 'r') => {
        const sDR = sBoardInformation?.dashboard?.distanceRange ?? {};
        const sDistancePanel = sBoardInformation?.dashboard?.panels?.find((aPanel: any) => aPanel.type !== 'Tql chart' && isNumericBaseTimeBlock(aPanel.blockList?.[0]));
        const sAnchored = isDistanceAnchorEdge(sDR.start) || isDistanceAnchorEdge(sDR.end);
        let sFrom = Number(sDR.start);
        let sTo = Number(sDR.end);
        if (sAnchored || !isDistanceEdgeSet(sDR.start) || !isDistanceEdgeSet(sDR.end) || !Number.isFinite(sFrom) || !Number.isFinite(sTo)) {
            const sBounds = await fetchBlockBaseMinMax(sDistancePanel?.blockList?.[0]);
            if (!sBounds) return;
            sFrom = resolveDistanceEdge(sDR.start, sBounds) ?? sBounds.min;
            sTo = resolveDistanceEdge(sDR.end, sBounds) ?? sBounds.max;
        }
        const sShift = ((sTo - sFrom) / 2) * (aDir === 'l' ? -1 : 1);
        applyDistanceRange({ start: Math.round(sFrom + sShift), end: Math.round(sTo + sShift) });
    };
    const moveTimeRange = (aItem: string) => {
        let sStartTimeBeforeStart = sBoardInformation?.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = sBoardInformation?.dashboard.timeRange.end;

        if (String(sStartTimeBeforeStart).includes('now') || String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }
        if (String(sStartTimeBeforeStart).includes('last') || String(sStartTimeBeforeEnd).includes('last')) {
            sStartTimeBeforeStart = setUnitTime(sBoardTimeMinMax.min);
            sStartTimeBeforeEnd = setUnitTime(sBoardTimeMinMax.max);
        }
        if (String(sStartTimeBeforeStart) === '' || String(sStartTimeBeforeEnd) === '') {
            sStartTimeBeforeStart = sBoardTimeMinMax.min;
            sStartTimeBeforeEnd = sBoardTimeMinMax.max;
        }

        const sCalcTime = (Number(sStartTimeBeforeEnd) - Number(sStartTimeBeforeStart)) / 2;
        const sStartTime = aItem === 'l' ? Math.round(sStartTimeBeforeStart - sCalcTime) : Math.round(sStartTimeBeforeStart + sCalcTime);
        const sEndTime = aItem === 'l' ? Math.round(sStartTimeBeforeEnd - sCalcTime) : Math.round(sStartTimeBeforeEnd + sCalcTime);

        setBoardInformation((aPrev: any) => {
            return {
                ...aPrev,
                dashboard: {
                    ...aPrev.dashboard,
                    timeRange: {
                        ...aPrev.dashboard.timeRange,
                        start: sStartTime,
                        end: sEndTime,
                    },
                },
            };
        });

        handleDashboardTimeRange(sStartTime, sEndTime);
    };
    const handleRefresh = async () => {
        const sTimeRange = sBoardInformation?.dashboard.timeRange;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax(sBoardInformation);
        // Without the fallback, a mixed time range makes timeMinMaxConverter return undefined and the
        // .min below throws, so GenChartVariableId() never runs and the Refresh button goes silently dead.
        const sTimeMinMax = timeMinMaxConverter(sTimeRange.start, sTimeRange.end, sSvrRes) ?? {
            min: setUnitTime(sTimeRange.start),
            max: setUnitTime(sTimeRange.end),
        };
        setBoardTimeMinMax(() => {
            return { min: sTimeMinMax.min, max: sTimeMinMax.max, refresh: true };
        });
        GenChartVariableId();
        return;
    };
    // Board-wide auto refresh — updating timeRange.refresh re-runs the interval effect below ([sBoardInformation]).
    const changeAutoRefresh = (aRefresh: string) => {
        setBoardInformation((aPrev: any) =>
            aPrev ? { ...aPrev, dashboard: { ...aPrev.dashboard, timeRange: { ...aPrev.dashboard.timeRange, refresh: aRefresh } } } : aPrev
        );
    };
    const setIntervalTime = (aTimeRange: any): number => {
        return calcRefreshTime(aTimeRange.refresh);
    };
    const ctrBoardInterval = (aTimeRange: any) => {
        clearInterval(sBoardRef.current);
        sBoardRef.current = setInterval(() => {
            // Restart the header's countdown ring on the tick itself. The animation otherwise runs
            // from whenever the control mounted, which has nothing to do with when this interval
            // was armed, so the ring empties at a moment the data does not arrive.
            setRingCycleId((aId) => aId + 1);
            handleDashboardTimeRange(aTimeRange.start, aTimeRange.end, undefined, true);
        }, setIntervalTime(aTimeRange));
    };
    const handleSplitPaneSize = (varId: string = 'ALL') => {
        setSelectVariable(varId);
        if (varId !== sSelectVariable && sVariableCollapse) return;
        setVariableCollapse(!sVariableCollapse);
    };
    const GenChartVariableId = () => {
        setChartVariableId(getId());
    };

    useEffect(() => {
        if (sBoardInformation && sBoardInformation.dashboard.timeRange && sBoardInformation.dashboard.timeRange.refresh !== 'Off')
            ctrBoardInterval(sBoardInformation.dashboard.timeRange);
        else sBoardRef && clearInterval(sBoardRef.current);
    }, [sBoardInformation]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!sVariableCollapse) return;
            const target = event.target as Element;
            if (!target) return;
            // Ignore clicks inside variable header area
            if (variableRef.current && variableRef.current.contains(target)) return;
            // Ignore clicks on variable button
            if (variableButtonRef.current && variableButtonRef.current.contains(target)) return;
            // Ignore clicks on variable related buttons
            const variablePreview = target.closest('.board-header-variable-collapse');
            const variablePreviewArea = target.closest('[class*="variable-preview"]');
            if (variablePreview || variablePreviewArea) return;
            // Ignore clicks on dropdown menu (portal rendered)
            const dropdownMenu = target.closest('[role="listbox"]');
            const dropdownTrigger = target.closest('[aria-haspopup="listbox"]');
            if (dropdownMenu || dropdownTrigger) return;
            // Close variable panel for all other cases
            setVariableCollapse(false);
        };
        if (sVariableCollapse) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [sVariableCollapse]);

    useEffect(() => {
        let isActive = true;

        const fetchLicenseInfo = async () => {
            const sQuery = 'select * from v$LICENSE_INFO';
            try {
                const sResult: any = await executeQuery(sQuery);

                if (!isActive) return;

                if (!sResult || sResult?.success === false) {
                    setShouldShowFooter(false);
                    return;
                }

                const sColumns = sResult?.data?.columns;
                const sRows = sResult?.data?.rows;

                if (!Array.isArray(sColumns) || !Array.isArray(sRows) || sRows.length === 0) {
                    setShouldShowFooter(false);
                    return;
                }

                const sFirstRow = sRows[0];
                const sInfo = sColumns.reduce((acc: Record<string, any>, column: any, index: number) => {
                    const key = typeof column === 'string' ? column.toLowerCase() : `col_${index}`;
                    acc[key] = sFirstRow[index];
                    return acc;
                }, {} as Record<string, any>);

                const sRawType = sInfo['type'];
                const sType = (sRawType ?? '').toString().toUpperCase();
                const sRawViol = sInfo['violate_status'];

                const sViolNumber = sRawViol !== undefined && sRawViol !== null && sRawViol !== '' ? Number(sRawViol) : 0;
                const sHasViolation = Number.isNaN(sViolNumber) ? sRawViol !== 0 && sRawViol !== '0' : sViolNumber !== 0;

                setShouldShowFooter(sType === 'COMMUNITY' || sHasViolation);
            } catch (error) {
                if (isActive) setShouldShowFooter(false);
            }
        };

        fetchLicenseInfo();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        const sIsLogin = localStorage.getItem('accessToken');
        if (!sIsLogin) localStorage.setItem('view', JSON.stringify({ path: '/view/' + sParams['*'] }));
        getDshFile(sParams['*']);
        GenChartVariableId();
    }, []);

    return sNotfound ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', inset: '16px' }}>
            <span>404 not found file name</span>
        </div>
    ) : (
        <>
            <Page style={{ width: '100vw', height: '100vh' }}>
                <Page.Header>
                    <Button.Group>
                        <Page.DpRow style={{ display: 'flex', flex: 1, textWrap: 'nowrap' }}>
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textWrap: 'nowrap', textOverflow: 'ellipsis' }}>{sBoardInformation?.dashboard?.title || ''}</span>
                        </Page.DpRow>
                        {sBoardInformation && sBoardInformation?.dashboard && sBoardInformation?.dashboard?.variables && sBoardInformation?.dashboard?.variables?.length > 0 && (
                            <>
                                <div ref={variableButtonRef}>
                                    <Button size="sm" variant="ghost" isToolTip toolTipContent="Variables" icon={<IoMdOptions size={16} />} onClick={() => handleSplitPaneSize()} />
                                </div>
                                {!sIsMobile && <VariablePreview pBoardInfo={sBoardInformation} callback={(selectVarId) => handleSplitPaneSize(selectVarId)} />}
                            </>
                        )}
                    </Button.Group>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button variant="ghost" size="icon" icon={<Share size={16} />} onClick={() => setIsShareModal(true)} isToolTip toolTipContent="Share" />
                        <Button variant="ghost" size="icon" icon={<MdRefresh size={16} />} onClick={handleRefresh} isToolTip toolTipContent="Refresh" />
                        {/* Both axes, as in the dashboard: a distance board could be read here but its
                            window could not be moved or edited, because the header only ever offered
                            the time one. */}
                        <RangeChips
                            pBoardInfo={sBoardInformation}
                            pOnShiftTime={moveTimeRange}
                            pOnShiftDist={moveDistanceRange}
                            pOnEditTime={() => setIsTimeRangeModal(true)}
                            pOnEditDist={() => setIsDistanceModal(true)}
                        />
                        <span style={{ width: '1px', height: '18px', margin: '0 6px', background: 'rgba(255, 255, 255, 0.13)' }} />
                        <AutoRefreshControl pValue={sBoardInformation?.dashboard.timeRange.refresh} pOnChange={changeAutoRefresh} pCycleId={sRingCycleId} />
                    </div>
                </Page.Header>
                <Page.Body ref={sBodyRef} footer>
                    <GridLayout
                        className="layout"
                        useCSSTransforms={false}
                        layout={sBoardInformation && sBoardInformation.dashboard.panels}
                        cols={GRID_LAYOUT_COLS}
                        autoSize={true}
                        rowHeight={GRID_LAYOUT_ROW_HEIGHT}
                        width={sBodyRef.current?.clientWidth}
                        isResizable={false}
                        isDraggable={false}
                    >
                        {sBoardInformation &&
                            sBoardInformation.dashboard &&
                            sBoardInformation.dashboard.panels &&
                            sBoardInformation.dashboard.panels.map((aItem: any) => {
                                return (
                                    <div
                                        key={aItem.id}
                                        data-grid={{
                                            x: sIsMobile ? 0 : aItem.x,
                                            y: aItem.y,
                                            w: sIsMobile ? sBodyRef.current?.clientWidth : aItem.w,
                                            h: aItem.h,
                                        }}
                                    >
                                        <Panel
                                            pBoardInfo={sBoardInformation}
                                            pPanelInfo={aItem}
                                            pParentWidth={!sIsMobile && sBodyRef?.current?.clientWidth ? sBodyRef.current.clientWidth : aItem.w}
                                            pChartVariableId={sChartVariableId}
                                            pIsHeader={false}
                                            pLoopMode={sBoardInformation?.dashboard.timeRange.refresh !== 'Off' || aItem?.timeRange?.refresh !== 'Off' ? true : false}
                                            pBoardTimeMinMax={sBoardTimeMinMax}
                                            pIsActiveTab={true}
                                            pOnChangePanelRefresh={changePanelRefresh}
                                        />
                                    </div>
                                );
                            })}
                    </GridLayout>

                    <Drawer.Root isOpen={sVariableCollapse} onClose={() => setVariableCollapse(false)} position="left" width={300} overlay={false} usePortal={false}>
                        <Drawer.Header>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Variables</span>
                            <Drawer.Close onClick={() => setVariableCollapse(false)} />
                        </Drawer.Header>
                        <Drawer.Body>
                            <div ref={variableRef}>
                                <VariableHeader pBoardInfo={sBoardInformation} callback={handleUpdateVariable} pSelectVariable={sSelectVariable} />
                            </div>
                        </Drawer.Body>
                    </Drawer.Root>
                </Page.Body>
                {sShouldShowFooter ? (
                    <Page.Footer>
                        <Footer />
                    </Page.Footer>
                ) : null}
            </Page>

            {sIsTimeRangeModal && (
                <TimeRangeModal
                    pSetTimeRangeModal={setIsTimeRangeModal}
                    pStartTime={sBoardInformation?.dashboard.timeRange.start}
                    pEndTime={sBoardInformation?.dashboard.timeRange.end}
                    pSetTime={setBoardInformation}
                    pRefresh={sBoardInformation?.dashboard.timeRange.refresh}
                    pSaveCallback={handleDashboardTimeRange}
                />
            )}

            {sIsDistanceModal && <DistanceRangeModal pBoardInfo={sBoardInformation} pOnApply={applyDistanceRange} pOnClose={() => setIsDistanceModal(false)} />}

            {sIsShareModal && <ShareModal isOpen={sIsShareModal} onClose={() => setIsShareModal(false)} />}
        </>
    );
};

export default DashboardView;
