import { getFiles } from '@/api/repository/fileTree';
import Panel from '@/components/dashboard/panels/Panel';
import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { useParams } from 'react-router-dom';
import './DashboardView.scss';
import moment from 'moment';
import { Calendar, VscChevronLeft, VscChevronRight, VscSync } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { setUnitTime } from '@/utils/dashboardUtil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { isMobile } from '@/utils';
import ViewTimeRangeModal from '@/components/modal/ViewTimeRangeModal';

const DashboardView = () => {
    const sParams = useParams();
    const sLayoutRef = useRef<HTMLDivElement>(null);
    const [sBoardInformation, setBoardInformation] = useState<{ dashboard: any; name: string; id: string; panelHeader: boolean }>();
    const [sNotfound, setNotFound] = useState<boolean>(false);
    // const [sIsPanelHeader, setIsPanelHeader] = useState<boolean>(true);
    const [sRefresh, setRefresh] = useState<number>(0);
    const [sIsTimeRangeModal, setIsTimeRangeModal] = useState<boolean>(false);
    const sIsMobile = isMobile();

    const getDshFile = async (aFileName: string | undefined) => {
        if (!aFileName) return;
        const sResult: any = await getFiles('/' + aFileName + '.dsh');
        if (typeof sResult === 'string') {
            setBoardInformation(JSON.parse(sResult));
            setNotFound(false);
        } else {
            setNotFound(true);
        }
    };

    const moveTimeRange = (aItem: string) => {
        let sStartTimeBeforeStart = sBoardInformation?.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = sBoardInformation?.dashboard.timeRange.end;

        if (String(sStartTimeBeforeStart).includes('now') || String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
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
    };

    const handleRefresh = () => {
        setRefresh((aPrev) => aPrev + 1);
    };

    useEffect(() => {
        const sIsLogin = localStorage.getItem('accessToken');
        if (!sIsLogin) localStorage.setItem('view', JSON.stringify({ path: '/view/' + sParams.file }));
        getDshFile(sParams.file);
    }, []);

    return sNotfound ? (
        <span>404 not found file name</span>
    ) : (
        <>
            <div ref={sLayoutRef} style={{ width: '100vw', height: '100vh' }}>
                <div className="dashboard-view-header">
                    <span className="title">{sBoardInformation?.dashboard?.title || ''}</span>
                    <div className="header-menu">
                        <div className="list-menu">
                            <IconButton pWidth={20} pHeight={20} pIcon={<VscSync />} onClick={handleRefresh} />
                        </div>
                        <div className="calendar-group">
                            <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronLeft />} onClick={() => moveTimeRange('l')} />
                            <button onClick={() => setIsTimeRangeModal(true)} className="calendar">
                                <Calendar />
                                {sBoardInformation && sBoardInformation.dashboard.timeRange.start ? (
                                    <span>
                                        {(typeof sBoardInformation.dashboard.timeRange.start === 'string' && sBoardInformation.dashboard.timeRange.start.includes('now')
                                            ? sBoardInformation.dashboard.timeRange.start
                                            : moment(sBoardInformation.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                            '~' +
                                            (typeof sBoardInformation.dashboard.timeRange.end === 'string' && sBoardInformation.dashboard.timeRange.end.includes('now')
                                                ? sBoardInformation.dashboard.timeRange.end
                                                : moment(sBoardInformation.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                                    </span>
                                ) : (
                                    <span>Time range not set</span>
                                )}
                            </button>
                            <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronRight />} onClick={() => moveTimeRange('r')} />
                        </div>
                    </div>
                </div>
                <GridLayout
                    className="layout"
                    useCSSTransforms={false}
                    layout={sBoardInformation && sBoardInformation.dashboard.panels}
                    cols={GRID_LAYOUT_COLS}
                    autoSize={true}
                    rowHeight={GRID_LAYOUT_ROW_HEIGHT}
                    width={sLayoutRef.current?.clientWidth}
                    isResizable={false}
                    isDraggable={false}
                >
                    {sBoardInformation &&
                        sBoardInformation.dashboard &&
                        sBoardInformation.dashboard.panels &&
                        sBoardInformation.dashboard.panels.map((aItem: any) => {
                            return (
                                <div key={aItem.id} data-grid={{ x: sIsMobile ? 0 : aItem.x, y: aItem.y, w: sIsMobile ? sLayoutRef.current?.clientWidth : aItem.w, h: aItem.h }}>
                                    <Panel
                                        pIsView
                                        pBoardInfo={sBoardInformation}
                                        pPanelInfo={aItem}
                                        pModifyState={{ id: '', state: false }}
                                        pSetModifyState={() => null}
                                        pIsHeader={false}
                                        pRefresh={sRefresh}
                                        pSetRefresh={setRefresh}
                                    />
                                </div>
                            );
                        })}
                </GridLayout>
            </div>
            {sIsTimeRangeModal && (
                <ViewTimeRangeModal
                    pSetTimeRangeModal={setIsTimeRangeModal}
                    pStartTime={sBoardInformation?.dashboard.timeRange.start}
                    pEndTime={sBoardInformation?.dashboard.timeRange.end}
                    pSetTime={setBoardInformation}
                    pRefresh={'Off'}
                />
            )}
        </>
    );
};

export default DashboardView;
