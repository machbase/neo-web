import { getFiles } from '@/api/repository/fileTree';
import Panel from '@/components/dashboard/panels/Panel';
import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { useParams } from 'react-router-dom';

const DashboardView = () => {
    const sParams = useParams();
    const [sBoardInformation, setBoardInformation] = useState<{ dashboard: any }>();
    const [sNotfound, setNotFound] = useState<boolean>(false);
    const sLayoutRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const sIsLogin = localStorage.getItem('accessToken');
        if (!sIsLogin) localStorage.setItem('view', JSON.stringify({ path: '/view/' + sParams.file }));
        getDshFile(sParams.file);
    }, []);

    return sNotfound ? (
        <span>404 not found file name</span>
    ) : (
        <div ref={sLayoutRef} style={{ width: '100vw', height: '100vh' }}>
            <GridLayout
                className="layout"
                useCSSTransforms={false}
                layout={sBoardInformation && sBoardInformation.dashboard.panels}
                cols={36}
                autoSize={true}
                rowHeight={30}
                width={sLayoutRef.current?.clientWidth}
                // onDragStart={(aEvent: any) => draging(true, aEvent)}
                // onDragStop={(aEvent: any) => draging(false, aEvent)}
                // onResizeStop={changeLayout}
                draggableHandle=".board-panel-header"
            >
                {sBoardInformation &&
                    sBoardInformation.dashboard &&
                    sBoardInformation.dashboard.panels &&
                    sBoardInformation.dashboard.panels.map((aItem: any) => {
                        return (
                            <div key={aItem.id} data-grid={{ x: aItem.x, y: aItem.y, w: aItem.w, h: aItem.h }}>
                                <Panel pBoardInfo={sBoardInformation} pPanelInfo={aItem} pModifyState={{ id: '', state: false }} pSetModifyState={() => null} pIsView></Panel>
                            </div>
                        );
                    })}
            </GridLayout>
        </div>
    );
};

export default DashboardView;
