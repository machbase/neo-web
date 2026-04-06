import PanelBoardChart from './panel/PanelBoardChart';
import { Page } from '@/design-system/components';
import type { TagAnalyzerPanelInfo } from './panel/TagAnalyzerPanelModelTypes';
import type {
    TagAnalyzerBoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardInfo,
} from './TagAnalyzerType';

// Renders the current board body content for TagAnalyzer.
// It displays the open chart panels using the board-level state and handlers passed from the parent.
const TagAnalyzerBoard = ({
    pInfo,
    pPanelBoardState,
    pPanelBoardActions,
}: {
    pInfo: TagAnalyzerBoardInfo;
    pPanelBoardState: TagAnalyzerBoardPanelState;
    pPanelBoardActions: TagAnalyzerBoardPanelActions;
}) => {
    return (
        <>
            {pPanelBoardState.bgnEndTimeRange &&
                pInfo &&
                pInfo.panels &&
                pInfo.panels.map((panel: TagAnalyzerPanelInfo) => {
                    return (
                        <Page.ContentBlock key={panel.meta.index_key} pHoverNone style={{ padding: '24px 32px' }}>
                            <PanelBoardChart
                                pBoardInfo={pInfo}
                                pPanelInfo={panel}
                                pPanelBoardState={pPanelBoardState}
                                pPanelBoardActions={pPanelBoardActions}
                            />
                        </Page.ContentBlock>
                    );
                })}
        </>
    );
};
export default TagAnalyzerBoard;
