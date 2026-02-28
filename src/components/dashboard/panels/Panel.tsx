import LineChart from './chart/LineChart';
import VideoPanel from './video/VideoPanel';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState, useRef } from 'react';
import { ChartThemeBackgroundColor } from '@/utils/constants';
import { ChartTheme } from '@/type/eChart';

const Panel = ({
    pLoopMode,
    pChartVariableId,
    pBoardInfo,
    pShowEditPanel,
    pType,
    pPanelInfo,
    pInsetDraging,
    pDragStat,
    pIsView,
    pModifyState,
    pSetModifyState,
    pParentWidth,
    pIsHeader,
    pBoardTimeMinMax,
    pIsActiveTab,
}: any) => {
    const [sRefreshCount, setRefreshCount] = useState<number>(0);
    // Ref for VideoPanel to access fullscreen toggle
    const videoPanelRef = useRef<any>(null);

    const handleVideoFullscreen = () => {
        if (videoPanelRef.current && videoPanelRef.current.toggleFullscreen) {
            videoPanelRef.current.toggleFullscreen();
        }
    };

    return (
        <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme as ChartTheme] }}>
            <PanelHeader
                pRefreshCount={sRefreshCount}
                pSetRefreshCount={setRefreshCount}
                pShowEditPanel={pShowEditPanel}
                pType={pType}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
                pIsView={pIsView}
                pIsHeader={pIsHeader}
                pOnFullscreen={handleVideoFullscreen}
            />
            {pPanelInfo ? (
                pPanelInfo?.type === 'Video' ? (
                    <VideoPanel
                        pLoopMode={pLoopMode}
                        pType={pType}
                        pIsActiveTab={pIsActiveTab}
                        pChartVariableId={pChartVariableId}
                        ref={videoPanelRef}
                        pPanelInfo={pPanelInfo}
                        pBoardInfo={pBoardInfo}
                        pBoardTimeMinMax={pBoardTimeMinMax}
                        pParentWidth={pParentWidth}
                        pIsHeader={pIsHeader}
                    />
                ) : (
                    <LineChart
                        pLoopMode={pLoopMode}
                        pDragStat={pDragStat}
                        pInsetDraging={pInsetDraging}
                        pBoardInfo={pBoardInfo}
                        pType={pType}
                        pPanelInfo={pPanelInfo}
                        pModifyState={pModifyState}
                        pSetModifyState={pSetModifyState}
                        pParentWidth={pParentWidth}
                        pIsHeader={pIsHeader}
                        pChartVariableId={pChartVariableId}
                        pIsView={pIsView}
                        pBoardTimeMinMax={pBoardTimeMinMax}
                        pIsActiveTab={pIsActiveTab}
                    />
                )
            ) : null}
        </div>
    );
};
export default Panel;
