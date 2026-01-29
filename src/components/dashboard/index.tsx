import GridLayout from 'react-grid-layout';
import { useState, useEffect, useRef } from 'react';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import Panel from './panels/Panel';
import CreatePanel from './createPanel/CreatePanel';
import { VscChevronLeft, Calendar, TbSquarePlus, VscChevronRight, Save, SaveAs, VscSync, Share } from '@/assets/icons/Icon';
import TimeRangeModal from '../modal/TimeRangeModal';
import moment from 'moment';
import { calcRefreshTime, setUnitTime, formatTimeValue } from '@/utils/dashboardUtil';
import { fetchMountTimeMinMax, fetchTimeMinMax, getRollupTableList } from '@/api/repository/machiot';
import { getId, isEmpty } from '@/utils';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { Toast } from '@/design-system/components';
import { Variable } from './variable';
import { VariableHeader } from './variable/header';
import { VariablePreview } from './variable/preview';
import { SiVectorworks } from 'react-icons/si';
import { IoMdOptions } from 'react-icons/io';
import ShareModal from './ShareModal';
import { Button, Input, Page, Drawer } from '@/design-system/components';
import { clearBoardVideoStore } from '@/hooks/useVideoSync';

const Dashboard = ({ pDragStat, pInfo, pWidth, pHandleSaveModalOpen, pSetIsSaveModal, pIsSave }: any) => {
    const boardIdRef = useRef<string>(pInfo?.id);
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sLoadedRollupTable, setLoadedRollupTable] = useState<boolean>(false);
    const [sCreateModal, setCreateModal] = useState(false);
    const [sPanelId, setPanelId] = useState('');
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

    const moveTimeRange = (aItem: string) => {
        let sStartTimeBeforeStart = pInfo.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = pInfo.dashboard.timeRange.end;

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
    const HandleRefresh = async (aTimeRange: any) => {
        if (pInfo.dashboard.panels.length < 1) return;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        const sTimeMinMax = timeMinMaxConverter(aTimeRange.start, aTimeRange.end, sSvrRes) ?? { min: setUnitTime(aTimeRange.start), max: setUnitTime(aTimeRange.end) };
        sTimeMinMax.refresh = true;
        setBoardTimeMinMax(() => sTimeMinMax);
        GenChartVariableId();
    };
    const handleDashboardTimeRange = async (sStart: any, sEnd: any) => {
        // if (pInfo.dashboard.panels.length < 1) return;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        const sTimeMinMax = timeMinMaxConverter(sStart, sEnd, sSvrRes);
        setBoardTimeMinMax(() => sTimeMinMax);
    };
    const handleSaveTimeRange = (sStart: any, sEnd: any) => {
        const sChartpanelList = pInfo.dashboard.panels.filter((aPanel: any) => aPanel.type !== 'Tql chart');
        const sTqlChartPanelList = pInfo.dashboard.panels.filter((aPanel: any) => aPanel.type === 'Tql chart');
        if (sChartpanelList.length === 0 && sTqlChartPanelList.length > 0 && ((!Number(sStart) && sStart.includes('last')) || (!Number(sEnd) && sEnd.includes('last'))))
            Toast.error('Apply now time range when using only tql panel.');

        handleDashboardTimeRange(sStart, sEnd);
    };
    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        const sTargetPanel = pInfo.dashboard.panels.filter((aPanel: any) => aPanel.type !== 'Tql chart')[0];
        const sTargetTag = sTargetPanel?.blockList ? sTargetPanel.blockList[0] : { tag: '' };
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag =
            sIsTagName &&
            sTargetTag.filter.filter((aFilter: any) => {
                if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
            })[0]?.value;

        if (sIsTagName || (sTargetTag.useCustom && sCustomTag)) {
            if (sTargetTag.customTable) return getNowMinMax();
            let sSvrResult: any = undefined;
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            }
            // const sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            const sResult: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            if (!Number(sResult.min) || !Number(sResult.max)) return getNowMinMax();
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

    useOverlapTimeout(() => {
        handleDashboardTimeRange(pInfo.dashboard.timeRange.start, pInfo.dashboard.timeRange.end);
    }, sSetIntervalTime());

    return (
        // Render after rollup info load
        sLoadedRollupTable && (
            <>
                <Page>
                    <Page.Header>
                        <Button.Group style={{ overflow: 'hidden' }}>
                            <Input size="sm" style={{ width: '200px' }} variant="default" value={pInfo.dashboard.title} onChange={changeDashboardName} />
                            {pInfo && pInfo?.dashboard && pInfo?.dashboard?.variables && pInfo?.dashboard?.variables?.length > 0 && (
                                <>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        isToolTip
                                        toolTipContent="Variables"
                                        icon={<IoMdOptions size={16} />}
                                        onClick={() => handleSplitPaneSize()}
                                    />
                                    <VariablePreview pBoardInfo={pInfo} callback={(selectVarId) => handleSplitPaneSize(selectVarId)} />
                                </>
                            )}
                        </Button.Group>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Button size="icon" variant="ghost" icon={<TbSquarePlus size={16} />} isToolTip toolTipContent="New panel" onClick={() => showEditPanel('create')} />
                            <Button
                                size="icon"
                                variant="ghost"
                                icon={<VscSync size={16} />}
                                isToolTip
                                toolTipContent="Refresh"
                                onClick={() => HandleRefresh(pInfo.dashboard.timeRange)}
                            />
                            <Button size="icon" variant="ghost" icon={<VscChevronLeft size={16} />} onClick={() => moveTimeRange('l')} />
                            <Button size="sm" variant="ghost" onClick={() => setTimeRangeModal(true)}>
                                <Calendar style={{ paddingRight: '8px' }} />
                                {pInfo?.dashboard?.timeRange?.start ? (
                                    <>{formatTimeValue(pInfo.dashboard.timeRange.start) + '~' + formatTimeValue(pInfo.dashboard.timeRange.end)}</>
                                ) : (
                                    <span>Time range not set</span>
                                )}
                                , Refresh : {pInfo.dashboard.timeRange.refresh}
                            </Button>
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Move range" icon={<VscChevronRight size={16} />} onClick={() => moveTimeRange('r')} />
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Sava" icon={<Save size={16} />} onClick={pHandleSaveModalOpen} />
                            <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={() => pSetIsSaveModal(true)} />
                            {pIsSave ? (
                                <Button size="icon" variant="ghost" isToolTip toolTipContent="Share" icon={<Share size={16} />} onClick={() => setShareModal(true)} />
                            ) : null}
                            <Button
                                size="icon"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Variable config"
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
                                layout={pInfo && pInfo.dashboard.panels}
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
                                    pInfo.dashboard.panels &&
                                    pInfo.dashboard.panels.map((aItem: any) => {
                                        return (
                                            <div key={aItem.id} data-grid={{ x: aItem.x, y: aItem.y, w: aItem.w, h: aItem.h }}>
                                                <Panel
                                                    pLoopMode={pInfo.dashboard.timeRange.refresh !== 'Off' || aItem.timeRange.refresh !== 'Off' ? true : false}
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
                                            </div>
                                        );
                                    })}
                            </GridLayout>

                            {isEmpty(pInfo.dashboard.panels) && (
                                <div style={{ display: 'flex', width: '100%', height: 'calc(100% - 10px)', justifyContent: 'center', alignItems: 'center' }}>
                                    <Button
                                        aria-label="Create New Panel"
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
                                    <VariableHeader pBoardInfo={pInfo} callback={initDashboard} pSelectVariable={sSelectVariable} />
                                </Drawer.Body>
                            </Drawer.Root>
                        </Page.Body>
                    )}
                </Page>
                {sTimeRangeModal && (
                    <TimeRangeModal pUseRecoil={true} pType={'dashboard'} pSetTimeRangeModal={setTimeRangeModal} pShowRefresh={true} pSaveCallback={handleSaveTimeRange} />
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
