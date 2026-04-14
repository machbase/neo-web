import PanelContainer from './panel/PanelContainer';
import { Page } from '@/design-system/components';
import type { TagAnalyzerPanelInfo } from './panel/PanelModel';
import type {
    BoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardInfo,
} from './TagAnalyzerTypes';
import { normalizeTimeRangeBoundary } from './utils/TagAnalyzerDateUtils';

// Renders the current board body content for TagAnalyzer.
// It displays the open chart panels using the board-level state and handlers passed from the parent.
const TagAnalyzerBoard = ({
    pInfo,
    pPanelBoardState,
    pPanelBoardActions,
}: {
    pInfo: TagAnalyzerBoardInfo;
    pPanelBoardState: TagAnalyzerBoardPanelState;
    pPanelBoardActions: BoardPanelActions;
}) => {
    const sBoardRange = normalizeTimeRangeBoundary(pInfo.range_bgn, pInfo.range_end);

    return (
        <>
            {pInfo.panels.map((panel: TagAnalyzerPanelInfo) => {
                const sIsSelectedForOverlap = Boolean(
                    pPanelBoardState.overlapPanels.find(
                        (aItem) => aItem.board.meta.index_key === panel.meta.index_key,
                    ),
                );
                const sIsOverlapAnchor =
                    pPanelBoardState.overlapPanels[0]?.board.meta.index_key ===
                    panel.meta.index_key;

                return (
                    <Page.ContentBlock
                        key={panel.meta.index_key}
                        pHoverNone
                        style={{ padding: '24px 32px' }}
                        pActive={undefined}
                        pSticky={undefined}
                    >
                        <PanelContainer
                            pBoardContext={{
                                id: pInfo.id,
                                range: sBoardRange.range,
                                rawRange: sBoardRange.rawRange,
                            }}
                            pPanelInfo={panel}
                            pChartBoardState={{
                                refreshCount: pPanelBoardState.refreshCount,
                                bgnEndTimeRange: pPanelBoardState.bgnEndTimeRange,
                                globalTimeRange: pPanelBoardState.globalTimeRange,
                            }}
                            pChartBoardActions={{
                                onPersistPanelState: pPanelBoardActions.onPersistPanelState,
                                onSetGlobalTimeRange: pPanelBoardActions.onSetGlobalTimeRange,
                                onOpenEditRequest: pPanelBoardActions.onOpenEditRequest,
                            }}
                            pIsSelectedForOverlap={sIsSelectedForOverlap}
                            pIsOverlapAnchor={sIsOverlapAnchor}
                            pOnToggleOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange(
                                    aStart,
                                    aEnd,
                                    panel,
                                    aIsRaw,
                                    undefined,
                                )
                            }
                            pOnUpdateOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange(
                                    aStart,
                                    aEnd,
                                    panel,
                                    aIsRaw,
                                    'changed',
                                )
                            }
                            pOnDeletePanel={(aStart, aEnd, aIsRaw) => {
                                pPanelBoardActions.onOverlapSelectionChange(
                                    aStart,
                                    aEnd,
                                    panel,
                                    aIsRaw,
                                    'delete',
                                );
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
