import BoardPanel from './panel/BoardPanel';
import { Page } from '@/design-system/components';
import { memo, useMemo } from 'react';
import type { PanelInfo } from './utils/panelModelTypes';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
    BoardPanelActions,
    BoardPanelState,
    BoardInfo,
} from './utils/boardTypes';

/**
 * Renders the board panels for the TagAnalyzer workspace.
 * Intent: Keep board rendering separate from the top-level controller and toolbar orchestration.
 * @param {{ pInfo: BoardInfo; pPanelBoardState: BoardPanelState; pPanelBoardActions: BoardPanelActions; }} props The board data and actions for the current workspace.
 * @returns {JSX.Element} The rendered board panel list.
 */
const TagAnalyzerBoard = memo(function TagAnalyzerBoard({
    pInfo,
    pIsActiveTab,
    pPanelBoardState,
    pPanelBoardActions,
    pRollupTableList,
}: {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pPanelBoardState: BoardPanelState;
    pPanelBoardActions: BoardPanelActions;
    pRollupTableList: string[];
}) {
    const sSelectedPanelKeys = useMemo(
        () => new Set(pPanelBoardState.overlapPanels.map((aItem) => aItem.board.meta.index_key)),
        [pPanelBoardState.overlapPanels],
    );
    const sOverlapAnchorKey = pPanelBoardState.overlapPanels[0]?.board.meta.index_key;
    const sBoardContext: BoardContext = useMemo(
        () => ({
            id: pInfo.id,
            time: {
                range: pInfo.range,
                rangeConfig: pInfo.rangeConfig,
            },
        }),
        [pInfo.id, pInfo.range, pInfo.rangeConfig],
    );
    const sChartBoardState: BoardChartState = useMemo(
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
    const sChartBoardActions: BoardChartActions = useMemo(
        () => ({
            onPersistPanelState: pPanelBoardActions.onPersistPanelState,
            onSavePanel: pPanelBoardActions.onSavePanel,
            onSetGlobalTimeRange: pPanelBoardActions.onSetGlobalTimeRange,
            onOpenEditRequest: pPanelBoardActions.onOpenEditRequest,
        }),
        [
            pPanelBoardActions.onOpenEditRequest,
            pPanelBoardActions.onPersistPanelState,
            pPanelBoardActions.onSavePanel,
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
                        <BoardPanel
                            pBoardContext={sBoardContext}
                            pPanelInfo={panel}
                            pIsActiveTab={pIsActiveTab}
                            pChartBoardState={sChartBoardState}
                            pChartBoardActions={sChartBoardActions}
                            pIsSelectedForOverlap={sIsSelectedForOverlap}
                            pIsOverlapAnchor={sIsOverlapAnchor}
                            pRollupTableList={pRollupTableList}
                            pOnToggleOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange({
                                    start: aStart,
                                    end: aEnd,
                                    panel,
                                    isRaw: aIsRaw,
                                    changeType: undefined,
                                })
                            }
                            pOnUpdateOverlapSelection={(aStart, aEnd, aIsRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange({
                                    start: aStart,
                                    end: aEnd,
                                    panel,
                                    isRaw: aIsRaw,
                                    changeType: 'changed',
                                })
                            }
                            pOnDeletePanel={(aStart, aEnd, aIsRaw) => {
                                pPanelBoardActions.onOverlapSelectionChange({
                                    start: aStart,
                                    end: aEnd,
                                    panel,
                                    isRaw: aIsRaw,
                                    changeType: 'delete',
                                });
                                pPanelBoardActions.onDeletePanel({
                                    panelKey: panel.meta.index_key,
                                });
                            }}
                        />
                    </Page.ContentBlock>
                );
            })}
        </>
    );
});
export default TagAnalyzerBoard;

