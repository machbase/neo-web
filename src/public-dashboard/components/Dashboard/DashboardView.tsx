import Panel from '../panels/Panel';
import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { useParams } from 'react-router-dom';
import moment from 'moment';
import { Calendar, VscChevronLeft, VscChevronRight, VscSync } from '../../assets/icons/Icon';
import { calcRefreshTime, setUnitTime } from '../../utils/dashboardUtil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '../../utils/constants';
import { getId, isMobile } from '../../utils';
import TimeRangeModal from '../../components/modal/TimeRangeModal';
import { timeMinMaxConverter } from '../../utils/bgnEndTimeRange';
import { executeQuery, fetchMountTimeMinMax, fetchTimeMinMax } from '../../api/repository/machiot';
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
    const sBodyRef = useRef<HTMLDivElement>(null);
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
    const [sShouldShowFooter, setShouldShowFooter] = useState<boolean>(false);
    const [sIsShareModal, setIsShareModal] = useState<boolean>(false);

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
                    if (sResult?.status && sResult?.data?.reason) console.error('Failed to fetch license info for footer visibility:', sResult.data.reason);
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
                console.error('Failed to fetch license info for footer visibility:', error);
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
                        <Page.DpRow style={{ width: '200px', overflow: 'hidden' }}>
                            <Page.ContentTitle>{sBoardInformation?.dashboard?.title || ''}</Page.ContentTitle>
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
                        <Button variant="ghost" size="icon" icon={<VscSync size={16} />} onClick={handleRefresh} isToolTip toolTipContent="Refresh" />
                        <Button variant="ghost" size="icon" icon={<VscChevronLeft size={16} />} onClick={() => moveTimeRange('l')} />
                        <Button size="sm" variant="ghost" onClick={() => setIsTimeRangeModal(true)}>
                            <Calendar style={{ paddingRight: '8px' }} />
                            {sBoardInformation && sBoardInformation.dashboard.timeRange.start ? (
                                <>
                                    {(typeof sBoardInformation.dashboard.timeRange.start === 'string' &&
                                    (sBoardInformation.dashboard.timeRange.start.includes('now') || sBoardInformation.dashboard.timeRange.start.includes('last'))
                                        ? sBoardInformation.dashboard.timeRange.start
                                        : moment(sBoardInformation.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                        '~' +
                                        (typeof sBoardInformation.dashboard.timeRange.end === 'string' &&
                                        (sBoardInformation.dashboard.timeRange.end.includes('now') || sBoardInformation.dashboard.timeRange.end.includes('last'))
                                            ? sBoardInformation.dashboard.timeRange.end
                                            : moment(sBoardInformation.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                                </>
                            ) : (
                                <span>Time range not set</span>
                            )}
                            , Refresh : {sBoardInformation?.dashboard.timeRange.refresh}
                        </Button>
                        <Button variant="ghost" size="icon" icon={<VscChevronRight size={16} />} onClick={() => moveTimeRange('r')} />
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
                    pShowRefresh={true}
                    pSaveCallback={handleDashboardTimeRange}
                />
            )}

            {sIsShareModal && <ShareModal isOpen={sIsShareModal} onClose={() => setIsShareModal(false)} />}
        </>
    );
};

export default DashboardView;
