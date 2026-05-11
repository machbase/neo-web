import { Page } from '@/design-system/components';
import PanelContainer from './panel/PanelContainer';
import type {
    BoardActions,
    BoardInfo,
    BoardState,
} from './domain/BoardModel';

const TagAnalyzerBoard = ({
    pInfo,
    pIsActiveTab,
    pPanelBoardState,
    pPanelBoardActions,
    pRollupTableList,
}: {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pPanelBoardState: BoardState;
    pPanelBoardActions: BoardActions;
    pRollupTableList: string[];
}) => {
    const sSelectedPanelKeys = new Set(
        pPanelBoardState.overlapPanels.map((item) => item.board.meta.index_key),
    );
    const sOverlapAnchorKey = pPanelBoardState.overlapPanels[0]?.board.meta.index_key;

    return (
        <>
            {pInfo.panels.map((panel) => {
                const sIsSelectedForOverlap = sSelectedPanelKeys.has(panel.meta.index_key);
                const sIsOverlapAnchor = sOverlapAnchorKey === panel.meta.index_key;

                return (
                    <Page.ContentBlock
                        key={panel.meta.index_key}
                        pHoverNone
                        style={{ padding: '24px 32px' }}
                    >
                        <PanelContainer
                            panelInfo={panel}
                            boardState={{
                                timeRange: pInfo.boardTimeRange,
                                isActiveTab: pIsActiveTab,
                                rangeSyncState: {
                                    refreshCount: pPanelBoardState.refreshCount,
                                    timeRefreshCount: pPanelBoardState.timeRefreshCount,
                                    boardTimeApplyCount: pPanelBoardState.boardTimeApplyCount,
                                    globalTimeRange: pPanelBoardState.globalTimeRange,
                                },
                                rollupTableList: pRollupTableList,
                            }}
                            overlapState={{
                                isSelected: sIsSelectedForOverlap,
                                isAnchor: sIsOverlapAnchor,
                            }}
                            boardActions={{
                                onPersistPanelState: pPanelBoardActions.onPersistPanelState,
                                onSavePanel: pPanelBoardActions.onSavePanel,
                                onSetGlobalTimeRange: pPanelBoardActions.onSetGlobalTimeRange,
                            }}
                            panelActions={{
                                onToggleOverlapSelection: () =>
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        panel,
                                        changeType: undefined,
                                    }),
                                onUpdateOverlapSelection: (start, end, isRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        start: start,
                                        end: end,
                                        panel,
                                        isRaw: isRaw,
                                        changeType: 'changed',
                                    }),
                                onDeletePanel: (start, end, isRaw) => {
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        start: start,
                                        end: end,
                                        panel,
                                        isRaw: isRaw,
                                        changeType: 'delete',
                                    });
                                    pPanelBoardActions.onDeletePanel({
                                        panelKey: panel.meta.index_key,
                                    });
                                },
                            }}
                        />
                    </Page.ContentBlock>
                );
            })}
        </>
    );
};

export default TagAnalyzerBoard;
