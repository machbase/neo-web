import PanelChart from './panel/PanelBoardChart';
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
                    const sIsSelectedForOverlap = Boolean(
                        pPanelBoardState.overlapPanels.find((aItem) => aItem.board.meta.index_key === panel.meta.index_key),
                    );
                    const sIsOverlapAnchor = pPanelBoardState.overlapPanels[0]?.board.meta.index_key === panel.meta.index_key;

                    return (
                        <Page.ContentBlock key={panel.meta.index_key} pHoverNone style={{ padding: '24px 32px' }}>
                            <PanelChart
                                pBoardInfo={pInfo}
                                pPanelInfo={panel}
                                pPanelBoardState={pPanelBoardState}
                                pPanelBoardActions={pPanelBoardActions}
                                pIsSelectedForOverlap={sIsSelectedForOverlap}
                                pIsOverlapAnchor={sIsOverlapAnchor}
                                pOnToggleOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange(aStart, aEnd, panel, aIsRaw)
                                }
                                pOnUpdateOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange(aStart, aEnd, panel, aIsRaw, 'changed')
                                }
                                pOnDeletePanel={(aStart, aEnd, aIsRaw) => {
                                    pPanelBoardActions.onOverlapSelectionChange(aStart, aEnd, panel, aIsRaw, 'delete');
                                    pPanelBoardActions.onDeletePanel(panel.meta.index_key);
                                }}
                            />
                        </Page.ContentBlock>
                    );
                })}
        </>
    );
};
export default TagAnalyzerBoard;
