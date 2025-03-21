import Extension from '@/components/extension/index';
import Side from '@/components/side/Side';
import './Home.scss';
import { useNavigate } from 'react-router-dom';
import SplitPane, { Pane } from 'split-pane-react';
import Console from '@/components/console/index';
import 'split-pane-react/esm/themes/default.css';
import { useEffect, useState, useRef } from 'react';
import { getLogin } from '@/api/repository/login';
import Body from '@/components/editor/Body';
import { getId } from '@/utils';
import { useRecoilState, useSetRecoilState } from 'recoil';
import {
    gConsoleSelector,
    gLicense,
    // gExtensionList,
    gSelectedExtension,
    gShellList,
} from '@/recoil/recoil';
import ReferenceList from '@/components/side/ReferenceList';
import { DBExplorer } from '@/components/side/DBExplorer/DBExplorer';
import { SecurityKey } from '@/components/side/SecurityKey';
import { UncaughtErrorObserver } from '@/utils/UncaughtErrorHelper';
import { TimerSide } from '@/components/side/Timer';
import { Shell } from '@/components/side/Shell';
import { useToken } from '@/hooks/useToken';
import { BridgeSide } from '@/components/side/Bridge';
import { AppStore } from '@/components/side/AppStore';
import { GlobalChecker } from '@/components/GlobalChecker';
import { EulaModal } from '@/components/modal/EulaModal';

const Home = () => {
    const [sSideSizes, setSideSizes] = useState<string[] | number[]>(['15%', '85%']);
    const [sTerminalSizes, setTerminalSizes] = useState<string[] | number[]>(['72%', '28%']);
    const [sTabList, setTabList] = useState<any>([]);
    const [sDraged, setDraged] = useState<any>(false);
    const [sSavedPath, setSavedPath] = useState();
    const [sServer, setServer] = useState();
    const [sIsSidebar, setIsSidebar] = useState<boolean>(true);
    const setConsoleList = useSetRecoilState<any>(gConsoleSelector);
    const sNavigate = useNavigate();
    const [sSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    // const [sExtensionList] = useRecoilState<any>(gExtensionList);
    const [sDragStat, setDragStat] = useState<boolean>(false);
    const [sHome, setHome] = useState<boolean>(false);
    const timer: any = useRef();
    const sWebSoc: any = useRef(null);
    const setShellList = useSetRecoilState<any>(gShellList);
    const [getLicense, setLicense] = useRecoilState(gLicense);
    const [openEula, setOpenEula] = useState<boolean>(false);

    let count = 0;
    const init = async () => {
        if (sSelectedExtension === '') {
            setIsSidebar(false);
            setSideSizes(['0%', '100%']);
        }
        const sResult: any = await getLogin();
        if (sResult?.reason === 'success') {
            localStorage.setItem('experimentMode', sResult?.experimentMode ?? false);
            const sTermTypeList = sResult?.shells.filter((aShell: any) => aShell.type === 'term');
            setShellList(sTermTypeList);
            setOpenEula(true);
            setLicense({ eulaRequired: sResult?.eulaRequired, licenseStatus: sResult?.licenseStatus?.toUpperCase() });
            const sId = getId();
            if (!sWebSoc.current) {
                if (window.location.protocol.indexOf('https') === -1) {
                    sWebSoc.current = new WebSocket(`ws://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`);
                } else {
                    sWebSoc.current = new WebSocket(`wss://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`);
                }
                sWebSoc.current.onmessage = (aEvent: any) => {
                    setConsoleList((aData: any) => [...aData, JSON.parse(aEvent.data).log]);
                };
                sWebSoc.current.onopen = () => {
                    localStorage.setItem('consoleId', sId);
                    count = 0;
                    clearInterval(timer.current);
                    setConsoleList((aData: any) => [...aData, { timestamp: new Date().getTime(), level: '', task: '', message: 'Connection established' }]);
                };
                sWebSoc.current.onclose = async () => {
                    sWebSoc.current = null;
                    setConsoleList((aData: any) => [...aData, { timestamp: new Date().getTime(), level: '', task: '', message: 'Connection lost' }]);

                    timer.current = setInterval(() => {
                        if (count > 60) {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            sNavigate('/login');
                            clearInterval(timer.current);
                        } else {
                            init();
                            count++;
                        }
                    }, 1000);
                };
            }
            UncaughtErrorObserver(setConsoleList);
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
        localStorage.setItem('experimentMode', sResult?.experimentMode ?? false);
        setLicense({ eulaRequired: sResult?.eulaRequired, licenseStatus: sResult?.licenseStatus?.toUpperCase() });
        setServer(sResult?.server);
        const sortAttributes = (aItem: string, bItem: string) => {
            const sOrder = ['editable', 'cloneable', 'removable'];
            return sOrder.indexOf(aItem) - sOrder.indexOf(bItem);
        };

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
            setIsSidebar(true);
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
        sHome && init();
        window.onbeforeunload = function () {
            return false;
        };
        return () => {
            count = 61;
            clearInterval(timer.current);
            sWebSoc.current && sWebSoc.current.close();
        };
    }, [sHome]);

    useToken(setHome);

    return (
        <div className={sDragStat ? 'check-draged home-form' : 'home-form'}>
            <Extension pSetSideSizes={setSideSizes} pIsSidebar={sIsSidebar} pHandleSideBar={setIsSidebar} pSetEula={setOpenEula} />
            <div className="body-form">
                <SplitPane
                    sashRender={() => <></>}
                    split="vertical"
                    allowResize={sIsSidebar}
                    sizes={sSideSizes}
                    onChange={setSideSizes}
                    onDragEnd={changeDraged}
                    onDragStart={setStatus}
                >
                    <Pane minSize={0} maxSize="50%">
                        {sHome && (
                            <div style={{ height: '100%' }}>
                                <Side pServer={sServer} pGetInfo={getInfo} pSavedPath={sSavedPath} pDisplay={sSelectedExtension === 'EXPLORER'} />
                                {sSelectedExtension === 'REFERENCE' && <ReferenceList pServer={sServer} />}
                                {sSelectedExtension === 'DBEXPLORER' && <DBExplorer pServer={sServer} />}
                                {sSelectedExtension === 'KEY' && <SecurityKey pServer={sServer} />}
                                {sSelectedExtension === 'TIMER' && <TimerSide pServer={sServer} />}
                                {sSelectedExtension === 'SHELL' && <Shell pServer={sServer} />}
                                {sSelectedExtension === 'BRIDGE' && <BridgeSide pServer={sServer} />}
                                {sSelectedExtension === 'APPSTORE' && <AppStore pServer={sServer} />}
                            </div>
                        )}
                    </Pane>
                    <Pane>
                        <div
                            style={{
                                ...layoutCSS,
                                borderLeft: '1px solid #333333',
                                background: '#ffffff',
                            }}
                        >
                            <SplitPane
                                sashRender={() => <></>}
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
                                    <Body
                                        pDragStat={sDragStat}
                                        pSetDragStat={setDragStat}
                                        pExtentionList={sTabList}
                                        pTerminalSizes={sTerminalSizes}
                                        pSideSizes={sSideSizes}
                                        pDraged={sDraged}
                                        pGetInfo={getInfo}
                                        pGetPath={getPath}
                                    />
                                </Pane>
                                <Pane minSize={40}>
                                    <div
                                        style={{
                                            borderTop: '1px solid #3C4549',
                                            width: '100%',
                                            height: '100%',
                                        }}
                                    >
                                        <Console
                                            pExtentionList={sTabList && sTabList.filter((aItem: any) => aItem.type === 'term')}
                                            pTerminalSizes={sTerminalSizes}
                                            pSetTerminalSizes={setTerminalSizes}
                                        />
                                    </div>
                                </Pane>
                            </SplitPane>
                        </div>
                    </Pane>
                </SplitPane>
            </div>
            {sHome && <GlobalChecker />}
            {getLicense?.eulaRequired && openEula && <EulaModal set={setOpenEula} />}
        </div>
    );
};
export default Home;
