import './DashboardView.scss';
import Panel from '../panels/Panel';
import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { useParams } from 'react-router-dom';
import moment from 'moment';
import { Calendar, VscChevronLeft, VscChevronRight, VscSync } from '../../assets/icons/Icon';
import { IconButton } from '../../components/buttons/IconButton';
import { ShareButton } from '../../components/buttons/ShareButton';
import { calcRefreshTime, setUnitTime } from '../../utils/dashboardUtil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '../../utils/constants';
import { getId, isMobile } from '../../utils';
import ViewTimeRangeModal from '../../components/modal/ViewTimeRangeModal';
import { timeMinMaxConverter } from '../../utils/bgnEndTimeRange';
import { fetchMountTimeMinMax, fetchTimeMinMax } from '../../api/repository/machiot';
import { CheckDataCompatibility } from '../../utils/CheckDataCompatibility';
import { VariableHeader } from '../variable/VariableHeader';
import { VARIABLE_TYPE } from '../variable';
import { IoMdOptions } from 'react-icons/io';
import { VariablePreview } from '../variable/VariablePreview';
import { IoClose } from 'react-icons/io5';
import Footer from '../Footer/Footer';

const DashboardView = () => {
    const sParams = useParams();
    const sLayoutRef = useRef<HTMLDivElement>(null);
    const [sBoardInformation, setBoardInformation] = useState<{ dashboard: any; name: string; id: string; panelHeader: boolean }>();
    const [sNotfound, setNotFound] = useState<boolean>(false);
    const [sIsTimeRangeModal, setIsTimeRangeModal] = useState<boolean>(false);
    const sIsMobile = isMobile();
    const [sBoardTimeMinMax, setBoardTimeMinMax] = useState<any>(undefined);
    const sBoardRef = useRef<any>(undefined);
    const [sVariableCollapse, setVariableCollapse] = useState<boolean>(false);
    const [sSelectVariable, setSelectVariable] = useState<string>('ALL');
    const [sChartVariableId, setChartVariableId] = useState<string>('');
    const variableRef = useRef<HTMLDivElement>(null);
    const [sLayoutWidth, setLayoutWidth] = useState<number>(0);

    const getDshFile = async (aFileName: string | undefined) => {
        if (!aFileName) return;
        try {
            const cleanFileName = aFileName.replace('board/', '');
            const response = await fetch(`/db/tql/${cleanFileName}.dsh`);
            if (response.ok) {
                const sResult = await response.text();
                const sParsedRes = CheckDataCompatibility(sResult, 'dsh');
                await handleDashboardTimeRange(sParsedRes.dashboard.timeRange.start, sParsedRes.dashboard.timeRange.end, sParsedRes);
                setBoardInformation(sParsedRes);
                setNotFound(false);
            } else {
                setNotFound(true);
            }
        } catch (error) {
            console.error('Failed to load public dashboard:', error);
            setNotFound(true);
        }
    };
    const handleUpdateVariable = (updateVarList: VARIABLE_TYPE[]) => {
        const updateBoardInfo = {
            ...sBoardInformation,
            dashboard: { ...sBoardInformation?.dashboard, variables: updateVarList },
        };
        setBoardInformation(updateBoardInfo as any);
        handleRefresh();
    };
    const handleDashboardTimeRange = async (sStart: any, sEnd: any, aBoardInfo?: any) => {
        const sBoard: any = aBoardInfo ?? sBoardInformation;
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax(sBoard);
        const sTimeMinMax = timeMinMaxConverter(sStart, sEnd, sSvrRes);
        setBoardTimeMinMax(() => sTimeMinMax);
        return;
    };
    const defaultMinMax = () => {
        const sNowTime = moment().unix() * 1000;
        const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
        return sNowTimeMinMax;
    };
    const fetchTableTimeMinMax = async (aBoardInfo: any): Promise<{ min: number; max: number }> => {
        const sTargetPanel = aBoardInfo.dashboard.panels[0];
        const sTargetTag = sTargetPanel.blockList[0];
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag = sTargetTag.filter.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;
        if (sIsTagName || (sTargetTag.useCustom && sCustomTag)) {
            if (sTargetTag.customTable) return defaultMinMax();
            let sSvrResult: any = undefined;
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            }
            const sResult: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            return sResult;
        } else return defaultMinMax();
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
        const sTimeMinMax = timeMinMaxConverter(sTimeRange.start, sTimeRange.end, sSvrRes);
        setBoardTimeMinMax(() => {
            return { min: sTimeMinMax.min, max: sTimeMinMax.max, refresh: true };
        });
        GenChartVariableId();
        return;
    };
    const setIntervalTime = (aTimeRange: any): number => {
        return calcRefreshTime(aTimeRange.refresh);
    };
    const ctrBoardInterval = (aTimeRange: any) => {
        clearInterval(sBoardRef.current);
        sBoardRef.current = setInterval(() => {
            handleDashboardTimeRange(aTimeRange.start, aTimeRange.end);
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

    const updateLayoutWidth = () => {
        if (sLayoutRef.current) {
            setLayoutWidth(sLayoutRef.current.clientWidth);
        }
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

    useEffect(() => {
        const sIsLogin = localStorage.getItem('accessToken');
        if (!sIsLogin) localStorage.setItem('view', JSON.stringify({ path: '/view/' + sParams['*'] }));
        getDshFile(sParams['*']);
        GenChartVariableId();
    }, []);

    useEffect(() => {
        updateLayoutWidth();
        
        let resizeTimeout: NodeJS.Timeout;
        
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateLayoutWidth();
            }, 150);
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    return sNotfound ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', inset: '16px' }}>
            <span>404 not found file name</span>
        </div>
    ) : (
        <>
            <div className="dashboard-view-wrap" ref={sLayoutRef} style={{ width: '100vw', height: '100vh' }}>
                <div className="dashboard-view-header">
                    <div className="dashboard-view-header-l">
                        <span className="title">{sBoardInformation?.dashboard?.title || ''}</span>
                        {sBoardInformation && sBoardInformation?.dashboard && sBoardInformation?.dashboard?.variables && sBoardInformation?.dashboard?.variables?.length > 0 && (
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
                                {!sIsMobile && <VariablePreview pBoardInfo={sBoardInformation} callback={(selectVarId) => handleSplitPaneSize(selectVarId)} />}
                            </>
                        )}
                    </div>
                    <div className="header-menu">
                        <div className="list-menu">
                            <ShareButton />
                            <IconButton pWidth={20} pHeight={20} pIcon={<VscSync />} onClick={handleRefresh} />
                        </div>
                        <div className="calendar-group">
                            <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronLeft />} onClick={() => moveTimeRange('l')} />
                            <button onClick={() => setIsTimeRangeModal(true)} className="calendar" style={{ height: 'auto' }}>
                                <Calendar />
                                {sBoardInformation && sBoardInformation.dashboard.timeRange.start ? (
                                    <span>
                                        {(typeof sBoardInformation.dashboard.timeRange.start === 'string' &&
                                        (sBoardInformation.dashboard.timeRange.start.includes('now') || sBoardInformation.dashboard.timeRange.start.includes('last'))
                                            ? sBoardInformation.dashboard.timeRange.start
                                            : moment(sBoardInformation.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                            '~' +
                                            (typeof sBoardInformation.dashboard.timeRange.end === 'string' &&
                                            (sBoardInformation.dashboard.timeRange.end.includes('now') || sBoardInformation.dashboard.timeRange.end.includes('last'))
                                                ? sBoardInformation.dashboard.timeRange.end
                                                : moment(sBoardInformation.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                                    </span>
                                ) : (
                                    <span>Time range not set</span>
                                )}
                                , Refresh : {sBoardInformation?.dashboard.timeRange.refresh}
                            </button>
                            <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronRight />} onClick={() => moveTimeRange('r')} />
                        </div>
                    </div>
                </div>
                {/* <SplitPane sashRender={() => <></>} split={'vertical'} sizes={sSideSizes} onChange={() => {}}>
                    <Pane>
                        <div className="variable-header-close">
                            <IconButton
                                pIsToopTip
                                pToolTipContent="Close"
                                pToolTipId="variables-close-btn"
                                pWidth={20}
                                pHeight={20}
                                pIcon={<IoClose />}
                                onClick={() => handleSplitPaneSize()}
                            />
                        </div>
                        <VariableHeader pBoardInfo={sBoardInformation} callback={handleUpdateVariable} pSelectVariable={sSelectVariable} />
                    </Pane>
                    <Pane> */}
                <div className="board-body">
                    <GridLayout
                        className="layout"
                        useCSSTransforms={false}
                        layout={sBoardInformation && sBoardInformation.dashboard.panels}
                        cols={GRID_LAYOUT_COLS}
                        autoSize={true}
                        rowHeight={GRID_LAYOUT_ROW_HEIGHT}
                        width={sLayoutWidth}
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
                                            w: sIsMobile ? sLayoutRef.current?.clientWidth : aItem.w,
                                            h: aItem.h,
                                        }}
                                    >
                                        <Panel
                                            pBoardInfo={sBoardInformation}
                                            pPanelInfo={aItem}
                                            pParentWidth={!sIsMobile && sLayoutWidth ? sLayoutWidth : aItem.w}
                                            pChartVariableId={sChartVariableId}
                                            pIsHeader={false}
                                            pLoopMode={sBoardInformation?.dashboard.timeRange.refresh !== 'Off' || aItem?.timeRange?.refresh !== 'Off' ? true : false}
                                            pBoardTimeMinMax={sBoardTimeMinMax}
                                            pIsActiveTab={true}
                                        />
                                    </div>
                                );
                            })}
                    </GridLayout>
                </div>
                {/* </Pane>
                </SplitPane> */}
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
                        <VariableHeader pBoardInfo={sBoardInformation} callback={handleUpdateVariable} pSelectVariable={sSelectVariable} />
                    </div>
                )}
            </div>

            {sIsTimeRangeModal && (
                <ViewTimeRangeModal
                    pSetTimeRangeModal={setIsTimeRangeModal}
                    pStartTime={sBoardInformation?.dashboard.timeRange.start}
                    pEndTime={sBoardInformation?.dashboard.timeRange.end}
                    pSetTime={setBoardInformation}
                    pRefresh={sBoardInformation?.dashboard.timeRange.refresh}
                    pSaveCallback={handleDashboardTimeRange}
                />
            )}
            <Footer />
        </>
    );
};

export default DashboardView;
