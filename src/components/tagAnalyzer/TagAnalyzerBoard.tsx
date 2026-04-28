import { memo, useMemo } from 'react';
import { Page } from '@/design-system/components';
import BoardPanel from './panel/BoardPanel';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
    BoardInfo,
    BoardPanelActions,
    BoardPanelState,
} from './panel/BoardTypes';
import type { PanelInfo } from './utils/panelModelTypes';

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
    pPanelBoardState: BoardPanelState;
    pPanelBoardActions: BoardPanelActions;
    pRollupTableList: string[];
    pTables: string[];
}) {
    const sSelectedPanelKeys = useMemo(
        () => new Set(pPanelBoardState.overlapPanels.map((item) => item.board.meta.index_key)),
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
                        <BoardPanel
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
