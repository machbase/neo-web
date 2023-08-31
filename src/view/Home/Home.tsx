import Extension from '@/components/extension/index';
import Side from '@/components/side/Side';
import './Home.scss';
import SplitPane, { Pane } from 'split-pane-react';

import 'split-pane-react/esm/themes/default.css';
import { useEffect, useState } from 'react';
import { getLogin } from '@/api/repository/login';
import Body from '@/components/editor/Body';
import { useInterceptor } from '@/api/core/useInterceptor';

const Home = () => {
    const [sSideSizes, setSideSizes] = useState<string[] | number[]>(['20%', '80%']);
    const [sTerminalSizes] = useState<string[] | number[]>(['100%', '0%']);
    const [sExtentionList, setExtentionList] = useState<any>([]);
    const [sReferences, setReferences] = useState<any>([]);
    const [sDraged, setDraged] = useState<any>(false);
    const [sSavedPath, setSavedPath] = useState();
    const [sServer, setServer] = useState();
    const [sIsSidebar, setIsSidebar] = useState<boolean>(true);

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
                            <Body
                                pExtentionList={sExtentionList}
                                pTerminalSizes={sTerminalSizes}
                                pSideSizes={sSideSizes}
                                pDraged={sDraged}
                                pGetInfo={getInfo}
                                pReferences={sReferences}
                                pGetPath={getPath}
                            ></Body>
                            {/* <SplitPane sashRender={() => <></>} split="horizontal" sizes={sTerminalSizes} onChange={setTerminalSizes}> */}
                            {/* <Pane minSize={50}> */}
                            {/* </Pane> */}
                            {/* <div
                                style={{
                                    borderTop: '1px solid #3C4549',
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                <Log></Log>
                            </div> */}
                            {/* </SplitPane> */}
                        </div>
                    </Pane>
                </SplitPane>
            </div>
        </div>
    );
};
export default Home;
