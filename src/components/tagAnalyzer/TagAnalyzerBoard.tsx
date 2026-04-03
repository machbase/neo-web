import Panel from './panel/TagAnalyzerPanel';
import { Page } from '@/design-system/components';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerBoardInfo,
    TagAnalyzerEditRequest,
    TagAnalyzerGetChartInfoHandler,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerRefreshTimeHandler,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerTimeRange,
} from './TagAnalyzerType';

// Renders the current board body content for TagAnalyzer.
// It displays the open chart panels using the board-level state and handlers passed from the parent.
const TagAnalyzerBoard = ({
    pInfo,
    pRefreshCount,
    pPanelsInfo,
    pBgnEndTimeRange,
    pGetChartInfo,
    pSaveKeepData,
    pGetBgnEndTime,
    pGlobalTimeRange,
    pSetGlobalTimeRange,
    pOnEditRequest,
}: {
    pInfo: TagAnalyzerBoardInfo;
    pRefreshCount: number;
    pPanelsInfo: TagAnalyzerOverlapPanelInfo[];
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange> | undefined;
    pGetChartInfo: TagAnalyzerGetChartInfoHandler;
    pSaveKeepData: (aTargetPanel: string, aTimeInfo: TagAnalyzerPanelTimeKeeper, aRaw: boolean) => void;
    pGetBgnEndTime: TagAnalyzerRefreshTimeHandler;
    pGlobalTimeRange: TagAnalyzerGlobalTimeRangeState;
    pSetGlobalTimeRange: (
        aDataTime: TagAnalyzerTimeRange,
        aNavigatorTime: TagAnalyzerTimeRange,
        aInterval: TagAnalyzerGlobalTimeRangeState['interval'],
    ) => void;
    pOnEditRequest: (data: TagAnalyzerEditRequest) => void;
}) => {
    return (
        <>
            {pBgnEndTimeRange &&
                pInfo &&
                pInfo.panels &&
                pInfo.panels.map((panel: TagAnalyzerPanelInfo) => {
                    return (
                        <Page.ContentBlock key={panel.index_key} pHoverNone style={{ padding: '24px 32px' }}>
                            <Panel
                                pRefreshCount={pRefreshCount}
                                pPanelsInfo={pPanelsInfo}
                                pBgnEndTimeRange={pBgnEndTimeRange}
                                pGetChartInfo={pGetChartInfo}
                                pBoardInfo={pInfo}
                                pPanelInfo={panel}
                                pSaveKeepData={pSaveKeepData}
                                pGetBgnEndTime={pGetBgnEndTime}
                                pGlobalTimeRange={pGlobalTimeRange}
                                pSetGlobalTimeRange={pSetGlobalTimeRange}
                                pOnEditRequest={pOnEditRequest}
                            />
                        </Page.ContentBlock>
                    );
                })}
        </>
    );
};
export default TagAnalyzerBoard;
