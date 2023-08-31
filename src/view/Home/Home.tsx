import Extension from '@/components/extension/index';
import Side from '@/components/side/Side';
import './Home.scss';
import SplitPane, { Pane } from 'split-pane-react';
import Console from '@/components/console/index';
import 'split-pane-react/esm/themes/default.css';
import { useEffect, useState, useRef } from 'react';
import { getLogin } from '@/api/repository/login';
import Body from '@/components/editor/Body';
import { useInterceptor } from '@/api/core/useInterceptor';
import { getId } from '@/utils';
import { useRecoilState } from 'recoil';
import { gConsoleList } from '@/recoil/recoil';

const Home = () => {
    const [sSideSizes, setSideSizes] = useState<string[] | number[]>(['20%', '80%']);
    const [sTerminalSizes, setTerminalSizes] = useState<string[] | number[]>(['72%', '28%']);
    const [sExtentionList, setExtentionList] = useState<any>([]);
    const [sReferences, setReferences] = useState<any>([]);
    const [sDraged, setDraged] = useState<any>(false);
    const [sSavedPath, setSavedPath] = useState();
    const [sServer, setServer] = useState();
    const [sIsSidebar, setIsSidebar] = useState<boolean>(true);
    const [sConsoleList, setConsoleList] = useRecoilState<any>(gConsoleList);
    const [sText, setText] = useState<any>('');

    const sWebSoc: any = useRef(null);

    const init = () => {
        const sId = getId();
        if (!sWebSoc.current) {
            if (window.location.protocol.indexOf('https') === -1) {
                sWebSoc.current = new WebSocket(`ws://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`);
            } else {
                sWebSoc.current = new WebSocket(`wss://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`);
            }
            let sCount = 0;
            sWebSoc.current.onmessage = (event: any) => {
                sCount++;
                JSON.parse(event.data).type === 'log' && setText({ index: sCount, log: JSON.parse(event.data).log });
            };
            sWebSoc.current.onopen = () => {
                localStorage.setItem('consoleId', sId);
            };
        }
    };

    useEffect(() => {
        if (sText.log) setConsoleList([...sConsoleList, sText.log]);
    }, [sText]);

    const layoutCSS = {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    const api = useInterceptor();

    const getPath = (aPath: any) => {
        setSavedPath(aPath);
    };

    const getInfo = async () => {
        const sResult: any = await api(getLogin());

        setReferences(sResult.references);
        setServer(sResult.server);
        const sortAttributes = (aItem: string, bItem: string) => {
            const sOrder = ['editable', 'cloneable', 'removable'];
            return sOrder.indexOf(aItem) - sOrder.indexOf(bItem);
        };

        sResult.shells.forEach((aItem: any) => {
            if (aItem.attributes && Array.isArray(aItem.attributes)) {
                aItem.attributes.sort((aItem: string, bItem: string) => sortAttributes(Object.keys(aItem)[0], Object.keys(bItem)[0]));
            }
        });

        setExtentionList(sResult.shells);
    };

    const setStatus = () => {
        if (!sIsSidebar) {
            setIsSidebar(true);
        }
    };
    const changeDraged = () => {
        setDraged(!sDraged);
    };

    useEffect(() => {
        getInfo();
    }, []);

    useEffect(() => {
        init();
        return () => {
            sWebSoc.current.close();
        };
    }, []);

    return (
        <div className="home-form">
            <Extension pSetSideSizes={setSideSizes} pIsSidebar={sIsSidebar} pHandleSideBar={setIsSidebar}></Extension>
            <div className="body-form">
                <SplitPane sashRender={() => <></>} split="vertical" sizes={sSideSizes} onChange={setSideSizes} onDragEnd={changeDraged} onDragStart={setStatus}>
                    <Pane minSize={0} maxSize="50%">
                        {sIsSidebar && <Side pServer={sServer} pGetInfo={getInfo} pSavedPath={sSavedPath}></Side>}
                    </Pane>
                    <Pane>
                        <div
                            style={{
                                ...layoutCSS,
                                borderLeft: '1px solid #333333',
                                background: '#ffffff',
                            }}
                        >
                            <SplitPane sashRender={() => <></>} split="horizontal" sizes={sTerminalSizes} onChange={setTerminalSizes}>
                                <Pane minSize={50}>
                                    <Body
                                        pExtentionList={sExtentionList}
                                        pTerminalSizes={sTerminalSizes}
                                        pSideSizes={sSideSizes}
                                        pDraged={sDraged}
                                        pGetInfo={getInfo}
                                        pReferences={sReferences}
                                        pGetPath={getPath}
                                    ></Body>
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
                                            pExtentionList={sExtentionList.filter((aItem: any) => aItem.type === 'term')}
                                            pTerminalSizes={sTerminalSizes}
                                            pSetTerminalSizes={setTerminalSizes}
                                        ></Console>
                                    </div>
                                </Pane>
                            </SplitPane>
                        </div>
                    </Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default Home;
