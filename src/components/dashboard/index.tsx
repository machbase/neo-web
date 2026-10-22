import GridLayout from 'react-grid-layout';
import { useState, useEffect, useRef } from 'react';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import Panel from './panels/Panel';
import CreatePanel from './createPanel/CreatePanel';
import { TbSquarePlus, Save, SaveAs, MdRefresh, Share } from '@/assets/icons/Icon';
import TimeRangeModal from '../modal/TimeRangeModal';
import AutoRefreshControl from './AutoRefreshControl';
import RangeChips from './RangeChips';
import { isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { fetchBlockBaseMinMax } from '@/utils/dashboardBaseMinMax';
import { isDistanceAnchorEdge, isDistanceEdgeSet, resolveDistanceEdge } from '@/utils/distanceRange';
import moment from 'moment';
import { calcRefreshTime, setUnitTime } from '@/utils/dashboardUtil';
import { fetchBlockTimeMinMax, getRollupTableList } from '@/api/repository/machiot';
import { getId, isEmpty } from '@/utils';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { resolvePanelMinSize } from '@/utils/dashboardPanelMinSize';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { pickBlockNameFilterValue, pickBoardTimeMinMaxPanel, shouldFetchBlockTimeMinMax } from '@/utils/dashboardTimeMinMax';
import { convertDashboardMinMaxRows } from '@/utils/dashboardBlockColumns';
import { Toast } from '@/design-system/components';
import { Variable } from './variable';
import { VariableHeader } from './variable/header';
import { VariablePreview } from './variable/preview';
import { SiVectorworks } from 'react-icons/si';
import { IoMdOptions } from 'react-icons/io';
import ShareModal from './ShareModal';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Button, Input, Page, Drawer, ErrorBoundary, ErrorCard } from '@/design-system/components';
import { getGridPanels, toGridLayout, toGridPosition } from '@/utils/dashboardGridPosition';
import { getPanelLoadError } from '@/utils/CheckDataCompatibility';
import { clearBoardVideoStore } from '@/hooks/useVideoSync';

const Dashboard = ({ pDragStat, pInfo, pWidth, pHandleSaveModalOpen, pSetIsSaveModal, pIsSave }: any) => {
    const boardIdRef = useRef<string>(pInfo?.id);
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sInitialRangeTab, setInitialRangeTab] = useState<'time' | 'distance'>('time');
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sLoadedRollupTable, setLoadedRollupTable] = useState<boolean>(false);
    const [sCreateModal, setCreateModal] = useState(false);
    const [sPanelId, setPanelId] = useState('');
    // Delete asked from a panel's error card; confirmed like the panel menu's own Delete.
    const [sDeletePanelId, setDeletePanelId] = useState<string | undefined>(undefined);
    const [sThisPanelStatus, setThisPanelStatus] = useState<'create' | 'edit' | undefined>(undefined);
    const [sModifyState, setModifyState] = useState<any>({ id: '', state: false });
    const [sIsPanelHeader, setIsPanelHeader] = useState<boolean>(true);
    const [sChartVariableId, setChartVariableId] = useState<string>('');
    const [sBoardTimeMinMax, setBoardTimeMinMax] = useState<any>(undefined);
    const sActiveTabId = useRecoilValue<any>(gSelectedTab);
    const [sVariableModal, setVariableModal] = useState<boolean>(false);
    const [sVariableCollapse, setVariableCollapse] = useState<boolean>(false);
    const [sSelectVariable, setSelectVariable] = useState<string>('ALL');
    const [sShareModal, setShareModal] = useState<boolean>(false);
    // Incremented whenever the refresh timer starts a fresh cycle, to realign the header countdown ring
    // (see the sRefreshDelay effect below). Passed to AutoRefreshControl as pCycleId.
    const [sRingCycleId, setRingCycleId] = useState<number>(0);

    const moveTimeRange = (aItem: string) => {
        // A board opened with no panels never loads data bounds; "last" and unset ranges then
        // resolve against the last hour, as the board does elsewhere without data.
        const sMinMax = sBoardTimeMinMax ?? getNowMinMax();
        let sStartTimeBeforeStart = pInfo.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = pInfo.dashboard.timeRange.end;

        if (String(sStartTimeBeforeStart).includes('now') || String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }
        if (String(sStartTimeBeforeStart).includes('last') || String(sStartTimeBeforeEnd).includes('last')) {
            sStartTimeBeforeStart = setUnitTime(sMinMax.min);
            sStartTimeBeforeEnd = setUnitTime(sMinMax.max);
        }
        if (String(sStartTimeBeforeStart) === '' || String(sStartTimeBeforeEnd) === '') {
            sStartTimeBeforeStart = sMinMax.min;
            sStartTimeBeforeEnd = sMinMax.max;
        }

        const sCalcTime = (Number(sStartTimeBeforeEnd) - Number(sStartTimeBeforeStart)) / 2;
        const sStartTime = aItem === 'l' ? Math.round(sStartTimeBeforeStart - sCalcTime) : Math.round(sStartTimeBeforeStart + sCalcTime);
        const sEndTime = aItem === 'l' ? Math.round(sStartTimeBeforeEnd - sCalcTime) : Math.round(sStartTimeBeforeEnd + sCalcTime);
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === pInfo.id
                    ? {
                          ...aItem,
                          dashboard: { ...aItem.dashboard, timeRange: { ...aItem.dashboard.timeRange, start: sStartTime, end: sEndTime } },
                      }
                    : aItem;
            })
        );

        handleDashboardTimeRange(sStartTime, sEndTime);
    };
    // Shift only the distance axis by its current span (default/full range resolves to [first, last] first).
    const moveDistanceRange = async (aDir: 'l' | 'r') => {
        const sDR = pInfo.dashboard.distanceRange ?? {};
        // An anchored edge has to be measured before it can be shifted; shifting then writes plain
        // coordinates, the same way the time arrows turn 'now-3h' into two timestamps.
        const sAnchored = isDistanceAnchorEdge(sDR.start) || isDistanceAnchorEdge(sDR.end);
        let sFrom = Number(sDR.start);
        let sTo = Number(sDR.end);
        if (sAnchored) {
            const sDistancePanel = pInfo.dashboard.panels.find((aPanel: any) => aPanel.type !== 'Tql chart' && isNumericBaseTimeBlock(aPanel.blockList?.[0]));
            const sBounds = await fetchBlockBaseMinMax(sDistancePanel?.blockList?.[0]);
            sFrom = resolveDistanceEdge(sDR.start, sBounds) ?? NaN;
            sTo = resolveDistanceEdge(sDR.end, sBounds) ?? NaN;
        }
        if (!isDistanceEdgeSet(sDR.start) || !isDistanceEdgeSet(sDR.end) || !Number.isFinite(sFrom) || !Number.isFinite(sTo)) {
            const sDistancePanel = pInfo.dashboard.panels.find((aPanel: any) => aPanel.type !== 'Tql chart' && isNumericBaseTimeBlock(aPanel.blockList?.[0]));
            const sBounds = await fetchBlockBaseMinMax(sDistancePanel?.blockList?.[0]);
            if (!sBounds) return;
            sFrom = sBounds.min;
            sTo = sBounds.max;
        }
        const sShift = ((sTo - sFrom) / 2) * (aDir === 'l' ? -1 : 1);
        const sNewFrom = Math.round(sFrom + sShift);
        const sNewTo = Math.round(sTo + sShift);
        setBoardList(
            sBoardList.map((aItem: any) => (aItem.id === pInfo.id ? { ...aItem, dashboard: { ...aItem.dashboard, distanceRange: { start: sNewFrom, end: sNewTo } } } : aItem))
        );
    };
    // Way out of a panel that keeps failing to render: its header (and the delete button in it) is
    // gone along with the rest of the panel, so the error card offers this instead.
    const removePanel = (aPanelId: string) => {
        setBoardList((aPrev: any) =>
            aPrev.map((aItem: any) =>
                aItem.id === pInfo.id ? { ...aItem, dashboard: { ...aItem.dashboard, panels: aItem.dashboard.panels.filter((aPanel: any) => aPanel.id !== aPanelId) } } : aItem
            )
        );
    };
    const showEditPanel = (aType: 'create' | 'edit' | undefined, aId?: string) => {
        setThisPanelStatus(aType);
        if (aId) {
            setPanelId(aId);
        }
        setCreateModal(!sCreateModal);
    };
    // const HandlePanelHeader = () => {
    //     setBoardList(
    //         sBoardList.map((aItem: any) => {
    //             return aItem.id === pInfo.id
    //                 ? {
    //                       ...aItem,
    //                       panelHeader: !sIsPanelHeader,
    //                   }
    //                 : aItem;
    //         })
    //     );
    //     setIsPanelHeader(!sIsPanelHeader);
    // };
    const draging = (aValue: any, aEvent: any) => {
        !aValue && changeLayout(aEvent);
    };
    const changeLayout = (aLayout: any) => {
        const sTempBoardList = sBoardList.map((aItem: any) => {
            return aItem.id === pInfo.id
                ? {
                      ...aItem,
                      dashboard: {
                          ...aItem.dashboard,
                          panels: aItem.dashboard.panels.map((bItem: any) => {
                              const sValue = aLayout.find((cItem: any) => cItem.i === bItem.id);
                              return { ...bItem, h: sValue.h, w: sValue.w, x: sValue.x, y: sValue.y };
                          }),
                      },
                  }
                : aItem;
        });
        setBoardList(sTempBoardList);
    };
    const GetRollupTables = async () => {
        const sResult: any = await getRollupTableList();
        setRollupTabls(sResult);
        setLoadedRollupTable(true);
    };
    const GenChartVariableId = () => {
        setChartVariableId(getId());
    };
    const changeDashboardName = (e: any) => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === pInfo.id
                    ? {
                          ...aItem,
                          dashboard: { ...aItem.dashboard, title: e.target.value },
                      }
                    : aItem;
            })
        );
    };
    // Board-wide auto refresh (relocated out of the Time Range modal). Applies to time + distance axes.
    const changeAutoRefresh = (aRefresh: string) => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === pInfo.id
                    ? {
                          ...aItem,
                          dashboard: { ...aItem.dashboard, timeRange: { ...aItem.dashboard.timeRange, refresh: aRefresh } },
                      }
                    : aItem;
            })
        );
    };
    const HandleRefresh = async (aTimeRange: any) => {
        if (pInfo.dashboard.panels.length < 1) return;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        const sTimeMinMax = timeMinMaxConverter(aTimeRange.start, aTimeRange.end, sSvrRes) ?? { min: setUnitTime(aTimeRange.start), max: setUnitTime(aTimeRange.end) };
        sTimeMinMax.refresh = true;
        setBoardTimeMinMax(() => sTimeMinMax);
        GenChartVariableId();
    };
    const handleDashboardTimeRange = async (sStart: any, sEnd: any, aIsAutoRefresh?: boolean) => {
        // if (pInfo.dashboard.panels.length < 1) return;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        const sTimeMinMax = timeMinMaxConverter(sStart, sEnd, sSvrRes) ?? { min: setUnitTime(sStart), max: setUnitTime(sEnd) };
        // Tell panels this is an auto-refresh tick: markdown/text/csv sink TQL panels ignore it. The
        // Refresh button is unaffected (it bumps chartVariableId), and time-arrows / TimeRangeModal
        // Save carry no flag at all.
        setBoardTimeMinMax(() => (aIsAutoRefresh ? { ...sTimeMinMax, autoRefresh: true } : sTimeMinMax));
    };
    const handleSaveTimeRange = (sStart: any, sEnd: any) => {
        const sChartpanelList = pInfo.dashboard.panels.filter((aPanel: any) => aPanel.type !== 'Tql chart');
        const sTqlChartPanelList = pInfo.dashboard.panels.filter((aPanel: any) => aPanel.type === 'Tql chart');
        if (sChartpanelList.length === 0 && sTqlChartPanelList.length > 0 && ((!Number(sStart) && sStart.includes('last')) || (!Number(sEnd) && sEnd.includes('last'))))
            Toast.info('"Last of data" time range is applied as current time for TQL-only dashboards.');

        handleDashboardTimeRange(sStart, sEnd);
    };
    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        // Board-level time min/max must come from a TIME (non-distance) panel; distance panels self-resolve
        // from distanceRange, so a distance-first mixed board would otherwise leak distance bounds here.
        const sTargetPanel = pickBoardTimeMinMaxPanel(pInfo.dashboard.panels);
        const sTargetTag = sTargetPanel?.blockList?.[0] ?? { tag: '', filter: [] };
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag = sIsTagName && pickBlockNameFilterValue(sTargetTag);

        if (shouldFetchBlockTimeMinMax(sTargetTag, sCustomTag)) {
            if (sTargetTag.customTable) return getNowMinMax();
            const sSvrResult = await fetchBlockTimeMinMax(sTargetTag, sCustomTag);
            // const sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            if (sSvrResult?.[0]?.[0] == null) return getNowMinMax();
            const sResult = convertDashboardMinMaxRows(sSvrResult, sTargetTag);
            if (!sResult) return getNowMinMax();
            if (!Number.isFinite(sResult.min) || !Number.isFinite(sResult.max)) return getNowMinMax();
            else return sResult;
        } else {
            return getNowMinMax();
        }
    };
    const getNowMinMax = () => {
        const sNowTime = moment().unix() * 1000;
        const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
        return sNowTimeMinMax;
    };
    // Set initial value
    const initDashboard = async () => {
        if (pInfo.dashboard.panels.length > 0) await handleDashboardTimeRange(pInfo.dashboard.timeRange.start, pInfo.dashboard.timeRange.end);
        setVariableCollapse(false);
        GenChartVariableId();
        GetRollupTables();
        setIsPanelHeader(pInfo.panelHeader);
    };

    useEffect(() => {
        boardIdRef.current = pInfo?.id;
        initDashboard();
        return () => clearBoardVideoStore(boardIdRef.current);
    }, []);

    const handleSplitPaneSize = (varId: string = 'ALL') => {
        setSelectVariable(varId);
        if (varId !== sSelectVariable && sVariableCollapse) return;
        setVariableCollapse(!sVariableCollapse);
    };

    const sSetIntervalTime = () => {
        if (sThisPanelStatus === 'create' || sThisPanelStatus === 'edit' || sActiveTabId !== pInfo.id) return null;
        if (pInfo.dashboard.timeRange.refresh !== 'Off') return calcRefreshTime(pInfo.dashboard.timeRange.refresh);
        return null;
    };

    const sRefreshDelay = sSetIntervalTime();

    useOverlapTimeout(() => {
        // Restart the ring on the tick itself, not just when the interval changes. `useOverlapTimeout`
        // re-arms `delay` ms after each callback, so its real period is delay + however long the tick
        // takes, while a CSS animation of exactly `delay` never waits for anything — the two drift
        // apart by that difference every cycle. Anchoring the animation here keeps it on the fetch.
        setRingCycleId((aId) => aId + 1);
        handleDashboardTimeRange(pInfo.dashboard.timeRange.start, pInfo.dashboard.timeRange.end, true);
    }, sRefreshDelay);

    // Bump the countdown ring's cycle id every time the refresh timer starts a fresh cycle — i.e. whenever
    // sRefreshDelay becomes non-null (resuming after the edit-mode pause / tab switch, or an interval change).
    // useOverlapTimeout re-schedules its first fire a full period from that same moment, so restarting the
    // ring from full here keeps the animation aligned with when the data actually refreshes. Skipped while
    // paused (null), since the ring is hidden under the panel-editor overlay then anyway.
    useEffect(() => {
        if (sRefreshDelay != null) setRingCycleId((aId) => aId + 1);
    }, [sRefreshDelay]);

    return (
        // Render after rollup info load
        sLoadedRollupTable && (
            <>
                <Page data-testid="dashboard-board">
                    <Page.Header>
                        <Button.Group style={{ overflow: 'hidden' }}>
                            <Input size="sm" style={{ width: '200px' }} variant="default" value={pInfo.dashboard.title} onChange={changeDashboardName} data-testid="title-input" />
                            {pInfo && pInfo?.dashboard && pInfo?.dashboard?.variables && pInfo?.dashboard?.variables?.length > 0 && (
                                <>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Variables"
                                        data-testid="variables-toggle"
                                        icon={<IoMdOptions size={16} />}
                                        onClick={() => handleSplitPaneSize()}
                                    />
                                    <ErrorBoundary name="dsh-header:variables" variant="inline" resetKeys={[pInfo.dashboard.variables]}>
                                        <VariablePreview pBoardInfo={pInfo} callback={(selectVarId) => handleSplitPaneSize(selectVarId)} />
                                    </ErrorBoundary>
                                </>
                            )}
                        </Button.Group>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Button size="icon" variant="ghost" icon={<TbSquarePlus size={16} />} isToolTip toolTipContent="New panel" data-testid="new-panel" onClick={() => showEditPanel('create')} />
                            <Button
                                size="icon"
                                variant="ghost"
                                icon={<MdRefresh size={16} />}
                                isToolTip
                                toolTipContent="Refresh"
                                data-testid="refresh"
                                onClick={() => HandleRefresh(pInfo.dashboard.timeRange)}
                            />
                            {/* Header controls each keep their own failure (#1547): a range the chips cannot show
                                must not take the panels — or the Save buttons beside them — down with it. */}
                            <ErrorBoundary name="dsh-header:range" variant="inline" resetKeys={[pInfo.dashboard.timeRange, pInfo.dashboard.distanceRange]}>
                            <RangeChips
                                pBoardInfo={pInfo}
                                pOnShiftTime={moveTimeRange}
                                pOnShiftDist={moveDistanceRange}
                                pOnEditTime={() => {
                                    setInitialRangeTab('time');
                                    setTimeRangeModal(true);
                                }}
                                pOnEditDist={() => {
                                    setInitialRangeTab('distance');
                                    setTimeRangeModal(true);
                                }}
                            />
                            </ErrorBoundary>
                            <span style={{ width: '1px', height: '18px', margin: '0 6px', background: 'rgba(255, 255, 255, 0.13)' }} />
                            <ErrorBoundary name="dsh-header:refresh" variant="inline" resetKeys={[pInfo.dashboard.timeRange]}>
                                <AutoRefreshControl pValue={pInfo.dashboard.timeRange.refresh} pOnChange={changeAutoRefresh} pCycleId={sRingCycleId} />
                            </ErrorBoundary>
                            <span style={{ width: '1px', height: '18px', margin: '0 6px', background: 'rgba(255, 255, 255, 0.13)' }} />
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" data-testid="save" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} />
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" data-testid="save-as" icon={<SaveAs size={16} />} onClick={() => pSetIsSaveModal(true)} />
                            {pIsSave ? (
                                <Button size="icon" variant="ghost" isToolTip toolTipContent="Share" data-testid="share" icon={<Share size={16} />} onClick={() => setShareModal(true)} />
                            ) : null}
                            <Button
                                size="icon"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Variable config"
                                data-testid="variable-config"
                                icon={<SiVectorworks size={16} />}
                                onClick={() => setVariableModal(!sVariableModal)}
                            />
                        </div>
                    </Page.Header>
                    {pWidth && (
                        <Page.Body>
                            <GridLayout
                                className="layout"
                                useCSSTransforms={false}
                                layout={pInfo && toGridLayout(pInfo.dashboard.panels)}
                                cols={GRID_LAYOUT_COLS}
                                autoSize={true}
                                rowHeight={GRID_LAYOUT_ROW_HEIGHT}
                                width={pWidth}
                                onDragStart={(aEvent: any) => draging(true, aEvent)}
                                onDragStop={(aEvent: any) => draging(false, aEvent)}
                                onResizeStop={changeLayout}
                                draggableHandle=".board-panel-header, .draggable-panel-header"
                            >
                                {pInfo.dashboard &&
                                    getGridPanels(pInfo.dashboard.panels).map((aItem: any) => {
                                        // A panel the loader could not repair is kept as saved; it shows as its own error card.
                                        const sLoadError = getPanelLoadError(aItem);
                                        const sPosition = toGridPosition(aItem);
                                        return (
                                            // `minW`/`minH` keep a panel from being dragged down to a size that has no room
                                            // left to grab it by — see `resolvePanelMinSize` for why the floor is capped at
                                            // the panel's own saved size.
                                            <div key={aItem.id} data-grid={{ ...sPosition, ...resolvePanelMinSize({ ...aItem, ...sPosition }) }} data-testid={`panel-${encodeURIComponent(aItem.id)}`}>
                                                {sLoadError ? (
                                                    <ErrorCard
                                                        name={`dsh-panel:${aItem.id}`}
                                                        variant="unit"
                                                        title="Can't load this panel."
                                                        message={`Its saved settings can't be read, so it can't be shown or edited here. Delete it, or fix it in the file. (${sLoadError})`}
                                                        actions={[{ label: 'Delete panel', testId: 'delete-panel', onClick: () => setDeletePanelId(aItem.id) }]}
                                                    />
                                                ) : (
                                                    <ErrorBoundary
                                                        name={`dsh-panel:${aItem.id}`}
                                                        variant="unit"
                                                        resetKeys={[aItem]}
                                                        actions={[
                                                            { label: 'Edit panel', testId: 'edit-panel', onClick: () => showEditPanel('edit', aItem.id) },
                                                            { label: 'Delete panel', testId: 'delete-panel', onClick: () => setDeletePanelId(aItem.id) },
                                                        ]}
                                                    >
                                                        <Panel
                                                            pLoopMode={pInfo.dashboard.timeRange.refresh !== 'Off' || aItem.timeRange?.refresh !== 'Off' ? true : false}
                                                            pDragStat={pDragStat}
                                                            pType={sThisPanelStatus}
                                                            pShowEditPanel={showEditPanel}
                                                            pBoardInfo={pInfo}
                                                            pPanelInfo={aItem}
                                                            pModifyState={sModifyState}
                                                            pSetModifyState={setModifyState}
                                                            pParentWidth={pWidth}
                                                            pIsHeader={sIsPanelHeader}
                                                            pChartVariableId={sChartVariableId}
                                                            pBoardTimeMinMax={sBoardTimeMinMax}
                                                            pIsActiveTab={sActiveTabId === pInfo.id}
                                                        />
                                                    </ErrorBoundary>
                                                )}
                                            </div>
                                        );
                                    })}
                            </GridLayout>

                            {isEmpty(pInfo.dashboard.panels) && (
                                <div style={{ display: 'flex', width: '100%', height: 'calc(100% - 10px)', justifyContent: 'center', alignItems: 'center' }}>
                                    <Button
                                        aria-label="Create New Panel"
                                        data-testid="create-first-panel"
                                        variant="secondary"
                                        size="lg"
                                        icon={<TbSquarePlus size={60} />}
                                        onClick={() => showEditPanel('create')}
                                        style={{ width: '80px', height: '80px' }}
                                    />
                                </div>
                            )}

                            <Drawer.Root isOpen={sVariableCollapse} onClose={() => setVariableCollapse(false)} position="left" width={300} overlay={false} usePortal={false}>
                                <Drawer.Header>
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Variables</span>
                                    <Drawer.Close onClick={() => setVariableCollapse(false)} />
                                </Drawer.Header>
                                <Drawer.Body>
                                    <ErrorBoundary name="dsh-variables" variant="region">
                                        <VariableHeader pBoardInfo={pInfo} callback={initDashboard} pSelectVariable={sSelectVariable} />
                                    </ErrorBoundary>
                                </Drawer.Body>
                            </Drawer.Root>
                        </Page.Body>
                    )}
                </Page>
                {sTimeRangeModal && (
                    <TimeRangeModal pUseRecoil={true} pType={'dashboard'} pInitialTab={sInitialRangeTab} pSetTimeRangeModal={setTimeRangeModal} pSaveCallback={handleSaveTimeRange} />
                )}
                {sDeletePanelId !== undefined && (
                    <ConfirmModal
                        pIsDarkMode
                        data-testid="dashboard-panel-delete-confirm"
                        setIsOpen={() => setDeletePanelId(undefined)}
                        pCallback={() => {
                            removePanel(sDeletePanelId);
                            setDeletePanelId(undefined);
                        }}
                        pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                    />
                )}
                {sCreateModal && (
                    <CreatePanel
                        pLoopMode={false}
                        pType={sThisPanelStatus}
                        pPanelId={sPanelId}
                        pBoardInfo={pInfo}
                        pSetType={setThisPanelStatus}
                        pSetCreateModal={setCreateModal}
                        pModifyState={sModifyState}
                        pSetModifyState={setModifyState}
                        pMoveTimeRange={moveTimeRange}
                        pMoveDistanceRange={moveDistanceRange}
                        pSetTimeRangeModal={setTimeRangeModal}
                        pSetIsSaveModal={pSetIsSaveModal}
                        pBoardTimeMinMax={sBoardTimeMinMax}
                        pChartVariableId={sChartVariableId}
                        pSetBoardTimeMinMax={setBoardTimeMinMax}
                    />
                )}
                {sVariableModal && <Variable pBoardInfo={pInfo} pSetModal={setVariableModal} />}
                {sShareModal && <ShareModal isOpen={sShareModal} onClose={() => setShareModal(false)} boardInfo={pInfo} />}
            </>
        )
    );
};
export default Dashboard;
