import PanelContainer from './panel/PanelContainer';
import { Page } from '@/design-system/components';
import { memo, useMemo } from 'react';
import type { PanelInfo } from './common/modelTypes';
import type {
    BoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardInfo,
} from './TagAnalyzerTypes';

// Renders the current board body content for TagAnalyzer.
// It displays the open chart panels using the board-level state and handlers passed from the parent.
const TagAnalyzerBoard = memo(function TagAnalyzerBoard({
    pInfo,
    pPanelBoardState,
    pPanelBoardActions,
}: {
    pInfo: TagAnalyzerBoardInfo;
    pPanelBoardState: TagAnalyzerBoardPanelState;
    pPanelBoardActions: BoardPanelActions;
}) {
    const sSelectedPanelKeys = useMemo(
        () => new Set(pPanelBoardState.overlapPanels.map((aItem) => aItem.board.meta.index_key)),
        [pPanelBoardState.overlapPanels],
    );
    const sOverlapAnchorKey = pPanelBoardState.overlapPanels[0]?.board.meta.index_key;
    const sBoardContext = useMemo(
        () => ({
            id: pInfo.id,
            range: pInfo.range,
            rangeConfig: pInfo.rangeConfig,
        }),
        [pInfo.id, pInfo.range, pInfo.rangeConfig],
    );
    const sChartBoardState = useMemo(
        () => ({
            refreshCount: pPanelBoardState.refreshCount,
            timeBoundaryRanges: pPanelBoardState.timeBoundaryRanges,
            globalTimeRange: pPanelBoardState.globalTimeRange,
        }),
        [
            pPanelBoardState.globalTimeRange,
            pPanelBoardState.refreshCount,
            pPanelBoardState.timeBoundaryRanges,
        ],
    );
    const sChartBoardActions = useMemo(
        () => ({
            onPersistPanelState: pPanelBoardActions.onPersistPanelState,
            onSetGlobalTimeRange: pPanelBoardActions.onSetGlobalTimeRange,
            onOpenEditRequest: pPanelBoardActions.onOpenEditRequest,
        }),
        [
            pPanelBoardActions.onOpenEditRequest,
            pPanelBoardActions.onPersistPanelState,
            pPanelBoardActions.onSetGlobalTimeRange,
        ],
    );

    return (
        <>
            {pInfo.panels.map((panel: PanelInfo) => {
                const sIsSelectedForOverlap = sSelectedPanelKeys.has(panel.meta.index_key);
                const sIsOverlapAnchor = sOverlapAnchorKey === panel.meta.index_key;

                return (
                    <Page.ContentBlock
                        key={panel.meta.index_key}
                        pHoverNone
                        style={{ padding: '24px 32px' }}
                        pActive={undefined}
                        pSticky={undefined}
                    >
                        <PanelContainer
                            pBoardContext={sBoardContext}
                            pPanelInfo={panel}
                            pChartBoardState={sChartBoardState}
                            pChartBoardActions={sChartBoardActions}
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
});
export default TagAnalyzerBoard;
