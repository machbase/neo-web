/* eslint-disable @typescript-eslint/ban-ts-comment */
import GridLayout from 'react-grid-layout';
import { useRef, useState, useEffect } from 'react';

import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList } from '@/recoil/recoil';
import Panel from './panels/Panel';
import CreatePanel from './createPanel/CreatePanel';
import { IconButton } from '../buttons/IconButton';
import { VscChevronLeft, Calendar, TbSquarePlus, VscChevronRight, Save, SaveAs, VscSync, MdLink } from '@/assets/icons/Icon';
import ModalTimeRange from '../tagAnalyzer/ModalTimeRange';
import moment from 'moment';
import { calcRefreshTime, setUnitTime } from '@/utils/dashboardUtil';
import { fetchTimeMinMax, getRollupTableList } from '@/api/repository/machiot';
import { getId, isEmpty } from '@/utils';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Input } from '../inputs/Input';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';

const Dashboard = ({ pDragStat, pInfo, pWidth, pIsSaveModal, pHandleSaveModalOpen, setIsSaveModal, pIsSave }: any) => {
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

    const moveTimeRange = (aItem: string) => {
        let sStartTimeBeforeStart = pInfo.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = pInfo.dashboard.timeRange.end;

        if (String(sStartTimeBeforeStart).includes('now') || String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }
        if (String(sStartTimeBeforeStart).includes('last') || String(sStartTimeBeforeEnd).includes('last')) {
            sStartTimeBeforeStart = sBoardTimeMinMax.min;
            sStartTimeBeforeEnd = sBoardTimeMinMax.max;
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
        const sTargetPath = `${window.location.origin + '/web/ui/view' + sTargetBoard?.path + sTargetBoard!.name.split('.')[0]}`;
        ClipboardCopy(sTargetPath);
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
        if (pInfo.dashboard.panels.length < 1) return;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        const sTimeMinMax = timeMinMaxConverter(sStart, sEnd, sSvrRes);
        setBoardTimeMinMax(() => sTimeMinMax);
    };
    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        const sTargetPanel = pInfo.dashboard.panels[0];
        const sTargetTag = sTargetPanel.blockList[0];
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag = sTargetTag.filter.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;
        if (sIsTagName || (sTargetTag.useCustom && sCustomTag)) {
            const sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            const sResult: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            return sResult;
        } else {
            const sNowTime = moment().unix() * 1000;
            const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
            return sNowTimeMinMax;
        }
    };
    // Set initial value
    const initDashboard = async () => {
        if (pInfo.dashboard.panels.length > 0) await handleDashboardTimeRange(pInfo.dashboard.timeRange.start, pInfo.dashboard.timeRange.end);
        GenChartVariableId();
        GetRollupTables();
        setIsPanelHeader(pInfo.panelHeader);
    };

    useEffect(() => {
        initDashboard();
    }, []);

    const sSetIntervalTime = () => {
        if (sThisPanelStatus === 'create' || sThisPanelStatus === 'edit') return null;
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
                    </div>
                    <div className="board-header-r">
                        <IconButton pIcon={<TbSquarePlus />} onClick={() => showEditPanel('create')}></IconButton>
                        {/* <IconButton pIcon={<MdDevicesFold style={{ transform: 'rotate(-90deg)' }} />} pIsActive={!sIsPanelHeader} onClick={HandlePanelHeader} /> */}
                        <IconButton pIcon={<VscSync />} onClick={() => HandleRefresh(pInfo.dashboard.timeRange)} />
                        <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronLeft />} onClick={() => moveTimeRange('l')} />
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
                        <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronRight />} onClick={() => moveTimeRange('r')} />
                        <IconButton pIcon={<Save />} onClick={pHandleSaveModalOpen} />
                        <IconButton pIcon={<SaveAs />} onClick={() => setIsSaveModal(true)} />
                        {pIsSave ? <IconButton pIcon={<MdLink size={18} />} onClick={handleCopyLink} /> : null}
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
                {sTimeRangeModal && <ModalTimeRange pType={'dashboard'} pSetTimeRangeModal={setTimeRangeModal} pSaveCallback={handleDashboardTimeRange} />}
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
                        pHandleSaveModalOpen={pHandleSaveModalOpen}
                        pIsSaveModal={pIsSaveModal}
                        pBoardTimeMinMax={sBoardTimeMinMax}
                        pSetBoardTimeMinMax={setBoardTimeMinMax}
                    />
                )}
            </div>
        )
    );
};
export default Dashboard;
