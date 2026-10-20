import './Home.scss';
import Console from '@/components/console/index';
import { ErrorBoundary, SplitPane, Pane, Toast } from '@/design-system/components';
import { useEffect, useRef, useState } from 'react';
import { getLogin } from '@/api/repository/login';
import MainContent from '@/components/mainContent/MainContent';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gLicense, gSelectedBoard, gSelectedExtension, gShellList } from '@/recoil/recoil';
import { gServerVersion } from '@/recoil/appStore';
import { UncaughtErrorObserver } from '@/utils/UncaughtErrorHelper';
import { useToken } from '@/hooks/useToken';
import { GlobalChecker } from '@/components/GlobalChecker';
import { EulaModal } from '@/components/modal/EulaModal';
import { fetchQuery } from '@/api/repository/database';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import { gWsLog } from '@/recoil/websocket';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '@/hooks/useExperiment';
import GNBPanel from '@/components/extension/Extension';
import { SidePanel } from '@/components/side';
import { useHomeSidePaneSizes } from './useHomeSidePaneSizes';
import { useNeoUpdateStatus } from '@/hooks/useNeoUpdateStatus';

const HomeContent = () => {
    const { sideSizes: sSideSizes, setSideSizes, openSideBar, closeSideBar } = useHomeSidePaneSizes();
    const [sTerminalSizes, setTerminalSizes] = useState<Array<string | number>>(['72%', '28%']);
    const previousTerminalSizesRef = useRef<Array<string | number> | null>(null);
    const [sTabList, setTabList] = useState<any>([]);
    const [sDraged, setDraged] = useState<any>(false);
    const [sSavedPath, setSavedPath] = useState();
    const [sServer, setServer] = useState();
    const [sIsSidebar, setIsSidebar] = useState<boolean>(true);
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const [sSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    const sSelectedBoard = useRecoilValue(gSelectedBoard);
    const [sDragStat, setDragStat] = useState<boolean>(false);
    const [sHome, setHome] = useState<boolean>(false);
    const setShellList = useSetRecoilState<any>(gShellList);
    const setServerVersion = useSetRecoilState(gServerVersion);
    const [getLicense, setLicense] = useRecoilState(gLicense);
    const [openEula, setOpenEula] = useState<boolean>(false);
    const { connectWebSocket, disconnectWebSocket } = useWebSocket();
    const navigate = useNavigate();
    const { setExperiment } = useExperiment();
    const sNeoUpdateStatus = useNeoUpdateStatus((sServer as any)?.version);

    const handleOpenSideBar = () => {
        setIsSidebar(true);
        openSideBar();
    };

    const handleCloseSideBar = () => {
        setIsSidebar(false);
        closeSideBar();
    };

    const init = async () => {
        if (sSelectedExtension === '') {
            handleCloseSideBar();
        }
        const sResult: any = await getLogin();
        if (sResult?.reason === 'success') {
            setExperiment(sResult?.experimentMode ?? false);
            const sTermTypeList = sResult?.shells.filter((aShell: any) => aShell.type === 'term');
            setShellList(sTermTypeList);
            setOpenEula(true);
            setLicense({ eulaRequired: sResult?.eulaRequired, licenseStatus: sResult?.licenseStatus?.toUpperCase() });
            setServerVersion(sResult?.server?.version ?? '');
            connectWebSocket();
            UncaughtErrorObserver(setConsoleList);
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            navigate('/login');
            return;
        }
    };

    const layoutCSS = {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const getPath = (aPath: any) => {
        setSavedPath(aPath);
    };

    const getInfo = async () => {
        const sResult: any = await getLogin();
        setExperiment(sResult?.experimentMode ?? false);
        setLicense({ eulaRequired: sResult?.eulaRequired, licenseStatus: sResult?.licenseStatus?.toUpperCase() });
        setServer(sResult?.server);
        setServerVersion(sResult?.server?.version ?? '');
        const sortAttributes = (aItem: string, bItem: string) => {
            const sOrder = ['editable', 'cloneable', 'removable'];
            return sOrder.indexOf(aItem) - sOrder.indexOf(bItem);
        };
        // RECENT = true, OLD = false
        const sResRollupVer: any = await fetchQuery(`SELECT count(DATABASE_ID) FROM V$ROLLUP`);
        if (sResRollupVer.svrState) localStorage.setItem('V$ROLLUP_VER', 'RECENT');
        else localStorage.setItem('V$ROLLUP_VER', 'OLD');

        if (sHome && sResult?.shells && sResult.shells.length !== 0) {
            sResult.shells.forEach((aItem: any) => {
                if (aItem.attributes && Array.isArray(aItem.attributes)) {
                    aItem.attributes.sort((aItem: string, bItem: string) => sortAttributes(Object.keys(aItem)[0], Object.keys(bItem)[0]));
                }
            });
            setTabList(sResult.shells);
            const sTermTypeList = sResult?.shells.filter((aShell: any) => aShell.type === 'term');
            setShellList(sTermTypeList);
        }
    };

    const setStatus = () => {
        setDragStat(true);
        if (!sIsSidebar) {
            handleOpenSideBar();
        }
    };
    const changeDraged = () => {
        setDragStat(false);
        setDraged(!sDraged);
    };

    useEffect(() => {
        sHome && getInfo();
    }, [sHome]);

    useEffect(() => {
        if (!sHome) return;
        if (sSelectedBoard?.type === 'DataViewer') {
            if (!previousTerminalSizesRef.current) previousTerminalSizesRef.current = sTerminalSizes;
            setTerminalSizes(['calc(100% - 40px)', 40]);
            return;
        }
        if (previousTerminalSizesRef.current) {
            setTerminalSizes(previousTerminalSizesRef.current);
            previousTerminalSizesRef.current = null;
        }
    }, [sHome, sSelectedBoard?.type]);

    useEffect(() => {
        if (sHome) init();
        window.onbeforeunload = function () {
            return false;
        };
        return () => {
            disconnectWebSocket();
        };
    }, [sHome]);

    useToken(setHome);

    return (
        <div className={sDragStat ? 'check-draged home-form' : 'home-form'}>
            {/* Fixed to the GNB's own width: without it the error card is a flex item with nothing to size
                it, and takes half the screen from the workspace. Being a size container lets the card
                drop its text and keep only Retry in this column. */}
            <div style={{ display: 'flex', flex: 'none', width: 52, containerType: 'inline-size' }}>
                <ErrorBoundary name="region:gnb" variant="region">
                    <GNBPanel pOpenSideBar={handleOpenSideBar} pCloseSideBar={handleCloseSideBar} pIsSidebar={sIsSidebar} pSetEula={setOpenEula} />
                </ErrorBoundary>
            </div>
            <div className="body-form">
                <SplitPane split="vertical" allowResize={sIsSidebar} sizes={sSideSizes} onChange={setSideSizes} onDragEnd={changeDraged} onDragStart={setStatus}>
                    {/* THE 200–440px BAND IS THE APP STORE'S, NOT EVERY PANEL'S.
                        The package cards need ~200px before their version chips
                        start colliding with the name, and nothing in them benefits
                        from more than 440. The DB Explorer is the opposite case —
                        long schema-qualified table names — so capping it at 440 to
                        satisfy the App Store would be a regression in a panel that
                        never asked for one.
                        `minSize` stays 0 while the sidebar is CLOSED: the GNB closes
                        it by driving the size to 0%, and a floor of 200 would fight
                        that on the next drag. */}
                    <Pane
                        minSize={sIsSidebar && sSelectedExtension === 'APPSTORE' ? 200 : 0}
                        maxSize={sSelectedExtension === 'APPSTORE' ? 440 : '50%'}
                    >
                        {sHome ? (
                            // The side frame itself (header, server status); each panel inside has its own boundary.
                            <ErrorBoundary name="region:side" variant="region">
                                <SidePanel
                                    pServer={sServer}
                                    pNeoUpdateStatus={sNeoUpdateStatus}
                                    pGetInfo={getInfo}
                                    pSavedPath={sSavedPath}
                                    pSelectedExtension={sSelectedExtension}
                                />
                            </ErrorBoundary>
                        ) : null}
                    </Pane>
                    <Pane>
                        <div
                            style={{
                                ...layoutCSS,
                                background: '#ffffff',
                            }}
                        >
                            <SplitPane
                                split="horizontal"
                                sizes={sTerminalSizes}
                                onChange={setTerminalSizes}
                                onDragEnd={() => {
                                    setDragStat(false);
                                }}
                                onDragStart={() => {
                                    setDragStat(true);
                                }}
                            >
                                <Pane minSize={50}>
                                    <ErrorBoundary name="region:main" variant="region">
                                        <MainContent
                                            pDragStat={sDragStat}
                                            pSetDragStat={setDragStat}
                                            pExtentionList={sTabList}
                                            pTerminalSizes={sTerminalSizes}
                                            pSideSizes={sSideSizes}
                                            pDraged={sDraged}
                                            pGetInfo={getInfo}
                                            pGetPath={getPath}
                                        />
                                    </ErrorBoundary>
                                </Pane>
                                <Pane minSize={40}>
                                    <ErrorBoundary name="region:console" variant="region">
                                        <Console
                                            pExtentionList={sTabList && sTabList.filter((aItem: any) => aItem.type === 'term')}
                                            pTerminalSizes={sTerminalSizes}
                                            pSetTerminalSizes={setTerminalSizes}
                                        />
                                    </ErrorBoundary>
                                </Pane>
                            </SplitPane>
                        </div>
                    </Pane>
                </SplitPane>
            </div>
            {/* Both sit outside every region, so without these a failure here took the whole app down (#1547).
                The checker draws nothing, and neither does its failure. */}
            {sHome && (
                <ErrorBoundary name="region:global-checker" variant="unit" fallbackStyle={{ display: 'none' }}>
                    <GlobalChecker />
                </ErrorBoundary>
            )}
            {getLicense?.eulaRequired && openEula && (
                <ErrorBoundary
                    name="dialog:eula"
                    variant="unit"
                    onError={(aError) => {
                        setOpenEula(false);
                        Toast.error(`The license dialog failed to open: ${aError?.message ?? aError}`);
                    }}
                >
                    <EulaModal set={setOpenEula} />
                </ErrorBoundary>
            )}
        </div>
    );
};

const Home = () => {
    return (
        <WebSocketProvider>
            <HomeContent />
        </WebSocketProvider>
    );
};

export default Home;
