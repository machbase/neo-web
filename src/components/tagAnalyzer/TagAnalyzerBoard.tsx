import { memo, useMemo } from 'react';
import { Page } from '@/design-system/components';
import PanelContainer, {
    type PanelContainerBoardActions,
    type PanelContainerBoardRangeSyncState,
} from './panel/PanelContainer';
import type {
    BoardActions,
    BoardInfo,
    BoardState,
} from './domain/BoardModel';
import type { PanelInfo } from './domain/PanelModel';

const TagAnalyzerBoard = memo(function TagAnalyzerBoard({
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
}) {
    const sSelectedPanelKeys = useMemo(
        () => new Set(pPanelBoardState.overlapPanels.map((item) => item.board.meta.index_key)),
        [pPanelBoardState.overlapPanels],
    );
    const sOverlapAnchorKey = pPanelBoardState.overlapPanels[0]?.board.meta.index_key;
    const sBoardRangeSyncState: PanelContainerBoardRangeSyncState = useMemo(
        () => ({
            refreshCount: pPanelBoardState.refreshCount,
            timeRefreshCount: pPanelBoardState.timeRefreshCount,
            globalTimeRange: pPanelBoardState.globalTimeRange,
        }),
        [
            pPanelBoardState.globalTimeRange,
            pPanelBoardState.refreshCount,
            pPanelBoardState.timeRefreshCount,
        ],
    );
    const sChartBoardActions: PanelContainerBoardActions = useMemo(
        () => ({
            onPersistPanelState: pPanelBoardActions.onPersistPanelState,
            onSavePanel: pPanelBoardActions.onSavePanel,
            onSetGlobalTimeRange: pPanelBoardActions.onSetGlobalTimeRange,
        }),
        [
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
                        <PanelContainer
                            pBoardTimeRange={pInfo.boardTimeRange}
                            pPanelInfo={panel}
                            pIsActiveTab={pIsActiveTab}
                            pBoardRangeSyncState={sBoardRangeSyncState}
                            pChartBoardActions={sChartBoardActions}
                            pIsSelectedForOverlap={sIsSelectedForOverlap}
                            pIsOverlapAnchor={sIsOverlapAnchor}
                            pRollupTableList={pRollupTableList}
                            pOnToggleOverlapSelection={() =>
                                pPanelBoardActions.onOverlapSelectionChange({
                                    panel,
                                    changeType: undefined,
                                })
                            }
                            pOnUpdateOverlapSelection={(start, end, isRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange({
                                    start: start,
                                    end: end,
                                    panel,
                                    isRaw: isRaw,
                                    changeType: 'changed',
                                })
                            }
                            pOnDeletePanel={(start, end, isRaw) => {
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
                            }}
                        />
                    </Page.ContentBlock>
                );
            })}
        </>
    );
});

export default TagAnalyzerBoard;
