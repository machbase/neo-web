/* eslint-disable @typescript-eslint/ban-ts-comment */
import GridLayout from 'react-grid-layout';
import { useRef, useState, useEffect } from 'react';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import Panel from './panels/Panel';
import CreatePanel from './createPanel/CreatePanel';
import { IconButton } from '../buttons/IconButton';
import { VscChevronLeft, Calendar, TbSquarePlus, VscChevronRight, Save, SaveAs, VscSync, MdLink, Share } from '@/assets/icons/Icon';
import ModalTimeRange from '../tagAnalyzer/ModalTimeRange';
import moment from 'moment';
import { calcRefreshTime, setUnitTime } from '@/utils/dashboardUtil';
import { fetchMountTimeMinMax, fetchTimeMinMax, getRollupTableList } from '@/api/repository/machiot';
import { getId, isEmpty } from '@/utils';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Input } from '../inputs/Input';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { Error, Success } from '../toast/Toast';
import { Variable } from './variable';
import { VariableHeader } from './variable/header';
import { VariablePreview } from './variable/preview';
import { SiVectorworks } from 'react-icons/si';
import { IoMdOptions } from 'react-icons/io';
import { IoClose } from 'react-icons/io5';
import ShareModal from './ShareModal';

const Dashboard = ({ pDragStat, pInfo, pWidth, pHandleSaveModalOpen, pSetIsSaveModal, pIsSave }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sLoadedRollupTable, setLoadedRollupTable] = useState<boolean>(false);
    const sBoardRef: Element | any = useRef({});
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
    const variableRef = useRef<HTMLDivElement>(null);

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
    const handleCopyLink = () => {
        const sTargetBoard = sBoardList.find((aBoard) => aBoard.id === pInfo.id);
        const sTargetPath = `${window.location.origin + '/web/ui/board' + sTargetBoard?.path + sTargetBoard!.name.split('.')[0]}`;
        ClipboardCopy(sTargetPath);
        Success('Copied!');
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
        const sTimeMinMax = timeMinMaxConverter(aTimeRange.start, aTimeRange.end, sSvrRes);
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
            Error('Apply now time range when using only tql panel.');

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
        initDashboard();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!sVariableCollapse) return;
            const target = event.target as Element;
            if (!target) return;
            // Ignore clicks inside variable header area
            if (variableRef.current && variableRef.current.contains(target)) return;
            // Ignore clicks on variable related buttons
            const variableButton = target.closest('[data-tooltip-id="variables-show-btn"]');
            const variablePreview = target.closest('.board-header-variable-collapse');
            const variablePreviewArea = target.closest('[class*="variable-preview"]');
            if (variableButton || variablePreview || variablePreviewArea) return;
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
            <div ref={sBoardRef} className="dashboard-form">
                <div className="board-header">
                    <div className="board-header-l">
                        <Input pBorderRadius={4} pWidth={175} pHeight={26} pType="text" pValue={pInfo.dashboard.title} pSetValue={() => null} onChange={changeDashboardName} />
                        {pInfo && pInfo?.dashboard && pInfo?.dashboard?.variables && pInfo?.dashboard?.variables?.length > 0 && (
                            <>
                                <div className="board-header-variable-collapse">
                                    <IconButton
                                        pIsToopTip
                                        pToolTipContent="Variables"
                                        pToolTipId="variables-show-btn"
                                        pWidth={20}
                                        pHeight={20}
                                        pIcon={<IoMdOptions />}
                                        onClick={() => handleSplitPaneSize()}
                                    />
                                </div>
                                <VariablePreview pBoardInfo={pInfo} callback={(selectVarId) => handleSplitPaneSize(selectVarId)} />
                            </>
                        )}
                    </div>

                    <div className="board-header-r">
                        <IconButton
                            pIsToopTip
                            pToolTipContent="New panel"
                            pToolTipId="dsh-tab-explorer-new-panel"
                            pIcon={<TbSquarePlus />}
                            onClick={() => showEditPanel('create')}
                        />
                        {/* <IconButton pIcon={<MdDevicesFold style={{ transform: 'rotate(-90deg)' }} />} pIsActive={!sIsPanelHeader} onClick={HandlePanelHeader} /> */}
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Refresh"
                            pToolTipId="dsh-tab-explorer-refresh"
                            pIcon={<VscSync />}
                            onClick={() => HandleRefresh(pInfo.dashboard.timeRange)}
                        />
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Move range"
                            pToolTipId="dsh-tab-explorer-move-r"
                            pWidth={24}
                            pHeight={24}
                            pIcon={<VscChevronLeft />}
                            onClick={() => moveTimeRange('l')}
                        />
                        <button onClick={() => setTimeRangeModal(true)} className="set-global-option-btn">
                            <Calendar />
                            {pInfo && pInfo.dashboard.timeRange.start ? (
                                <span>
                                    {(typeof pInfo.dashboard.timeRange.start === 'string' &&
                                    (pInfo.dashboard.timeRange.start.includes('now') || pInfo.dashboard.timeRange.start.includes('last'))
                                        ? pInfo.dashboard.timeRange.start
                                        : moment(pInfo.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                        '~' +
                                        (typeof pInfo.dashboard.timeRange.end === 'string' &&
                                        (pInfo.dashboard.timeRange.end.includes('now') || pInfo.dashboard.timeRange.start.includes('last'))
                                            ? pInfo.dashboard.timeRange.end
                                            : moment(pInfo.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                                </span>
                            ) : (
                                <span>Time range not set</span>
                            )}
                            , Refresh : {pInfo.dashboard.timeRange.refresh}
                        </button>
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Move range"
                            pToolTipId="dsh-tab-explorer-move-l"
                            pWidth={24}
                            pHeight={24}
                            pIcon={<VscChevronRight />}
                            onClick={() => moveTimeRange('r')}
                        />
                        <IconButton pIsToopTip pToolTipContent="Save" pToolTipId="dsh-tab-explorer-save" pIcon={<Save />} onClick={pHandleSaveModalOpen} />
                        <IconButton pIsToopTip pToolTipContent="Save as" pToolTipId="dsh-tab-explorer-save-as" pIcon={<SaveAs />} onClick={() => pSetIsSaveModal(true)} />
                        {pIsSave ? (
                            <IconButton pIsToopTip pToolTipContent="Copy link" pToolTipId="dsh-tab-explorer-copy-link" pIcon={<MdLink size={18} />} onClick={handleCopyLink} />
                        ) : null}
                        {pIsSave ? (
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Share"
                                pToolTipId="dsh-tab-explorer-share"
                                pIcon={<Share />}
                                onClick={() => setShareModal(true)}
                            />
                        ) : null}
                        <IconButton
                            pIsToopTip
                            pToolTipContent="Variable config"
                            pToolTipId="dsh-variable"
                            pIcon={<SiVectorworks />}
                            onClick={() => setVariableModal(!sVariableModal)}
                        />
                    </div>
                </div>
                {pWidth && (
                    <div className="board-body">
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
                            <div className="non-set-panel">
                                <IconButton pWidth={70} pHeight={70} pIcon={<TbSquarePlus size="70px" />} onClick={() => showEditPanel('create')} />
                                Create New Panel
                            </div>
                        )}
                    </div>
                )}
                {sVariableCollapse && (
                    <div ref={variableRef} className="variable-header-warp">
                        <div className="variable-header-close">
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Close"
                                pToolTipId="variables-close-btn"
                                pWidth={20}
                                pHeight={20}
                                pIcon={<IoClose />}
                                onClick={() => setVariableCollapse(false)}
                            />
                        </div>
                        <VariableHeader pBoardInfo={pInfo} callback={initDashboard} pSelectVariable={sSelectVariable} />
                    </div>
                )}
                {sTimeRangeModal && <ModalTimeRange pType={'dashboard'} pSetTimeRangeModal={setTimeRangeModal} pSaveCallback={handleSaveTimeRange} />}
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
            </div>
        )
    );
};
export default Dashboard;
