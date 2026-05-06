import { memo, useMemo } from 'react';
import { Page } from '@/design-system/components';
import PanelContainer, {
    type PanelContainerBoardActions,
    type PanelContainerBoardContext,
    type PanelContainerBoardState,
} from './panel/PanelContainer';
import type {
    BoardActions,
    BoardInfo,
    BoardState,
} from './BoardTypes';
import type { PanelInfo } from './PanelModelTypes';

const TagAnalyzerBoard = memo(function TagAnalyzerBoard({
    pInfo,
    pIsActiveTab,
    pPanelBoardState,
    pPanelBoardActions,
    pRollupTableList,
    pTables,
}: {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pPanelBoardState: BoardState;
    pPanelBoardActions: BoardActions;
    pRollupTableList: string[];
    pTables: string[];
}) {
    const sSelectedPanelKeys = useMemo(
        () => new Set(pPanelBoardState.overlapPanels.map((item) => item.board.meta.index_key)),
        [pPanelBoardState.overlapPanels],
    );
    const sOverlapAnchorKey = pPanelBoardState.overlapPanels[0]?.board.meta.index_key;
    const sBoardContext: PanelContainerBoardContext = useMemo(
        () => ({
            id: pInfo.id,
            time: pInfo.boardTimeRange,
        }),
        [pInfo.boardTimeRange, pInfo.id],
    );
    const sChartBoardState: PanelContainerBoardState = useMemo(
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
                            pBoardContext={sBoardContext}
                            pPanelInfo={panel}
                            pIsActiveTab={pIsActiveTab}
                            pChartBoardState={sChartBoardState}
                            pChartBoardActions={sChartBoardActions}
                            pIsSelectedForOverlap={sIsSelectedForOverlap}
                            pIsOverlapAnchor={sIsOverlapAnchor}
                            pRollupTableList={pRollupTableList}
                            pOnToggleOverlapSelection={(start, end, isRaw) =>
                                pPanelBoardActions.onOverlapSelectionChange({
                                    start: start,
                                    end: end,
                                    panel,
                                    isRaw: isRaw,
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
                            pTables={pTables}
                        />
                    </Page.ContentBlock>
                );
            })}
        </>
    );
});

export default TagAnalyzerBoard;
