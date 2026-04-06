import TagAnalyzerPanel from './panel/Panel';
import { Page } from '@/design-system/components';
import type { TagAnalyzerPanelInfo } from './panel/TagAnalyzerPanelTypes';
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
                            <TagAnalyzerPanel
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
