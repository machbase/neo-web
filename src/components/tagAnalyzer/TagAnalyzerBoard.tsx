import { Page } from '@/design-system/components';
import PanelContainer from './panel/PanelContainer';
import type {
    BoardActions,
    BoardInfo,
    BoardState,
    PanelCommandRegistry,
} from './domain/BoardModel';

const TagAnalyzerBoard = ({
    pInfo,
    pIsActiveTab,
    pPanelBoardState,
    pPanelBoardActions,
    pPanelCommandRegistry,
    pRollupTableList,
}: {
    pInfo: BoardInfo;
    pIsActiveTab: boolean;
    pPanelBoardState: BoardState;
    pPanelBoardActions: BoardActions;
    pPanelCommandRegistry: PanelCommandRegistry;
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
                                globalTimeRange: pPanelBoardState.globalTimeRange,
                                rollupTableList: pRollupTableList,
                            }}
                            boardActions={{
                                onPersistPanelState:
                                    pPanelBoardActions.onPersistPanelState,
                                onSavePanel: pPanelBoardActions.onSavePanel,
                                onSetGlobalTimeRange:
                                    pPanelBoardActions.onSetGlobalTimeRange,
                                onRegisterPanelCommands:
                                    pPanelCommandRegistry.registerPanelCommands,
                            }}
                            panelActions={{
                                onDeletePanel: () =>
                                    pPanelBoardActions.onDeletePanel({
                                        panelKey: panel.meta.index_key,
                                    }),
                            }}
                            overlapSelection={{
                                isSelected: sIsSelectedForOverlap,
                                isAnchor: sIsOverlapAnchor,
                                canToggle: panel.data.tag_set.length === 1,
                                toggleSelection: (range, isRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        start: range.startTime,
                                        end: range.endTime,
                                        panel,
                                        isRaw: isRaw,
                                        changeType: undefined,
                                    }),
                                updateSelection: (range, isRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        start: range.startTime,
                                        end: range.endTime,
                                        panel,
                                        isRaw: isRaw,
                                        changeType: 'changed',
                                    }),
                                deleteSelection: (range, isRaw) =>
                                    pPanelBoardActions.onOverlapSelectionChange({
                                        start: range.startTime,
                                        end: range.endTime,
                                        panel,
                                        isRaw: isRaw,
                                        changeType: 'delete',
                                    }),
                            }}
                        />
                    </Page.ContentBlock>
                );
            })}
        </>
    );
};

export default TagAnalyzerBoard;
