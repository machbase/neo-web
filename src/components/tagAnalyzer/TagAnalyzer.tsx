import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
    gBoardList,
    gSelectedTab,
} from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import { Page, Toast } from '@/design-system/components';
import type {
    BoardActions,
    BoardInfo,
} from './domain/BoardModel';
import {
    type GlobalBoardListState,
    getNextBoardListWithAppendedPersistedPanel,
    getNextBoardListWithPersistedBoardInfo,
    getNextBoardListWithSavedBoard,
    getNextBoardListWithSavedPanel,
    getNextBoardListWithBoardTimeRange,
    getNextBoardListWithoutPanel,
} from './appState/gBoardListUpdater';
import { TAZ_FORMAT_VERSION, parseLoadedTaz } from './persistence/load/parseLoadedTaz';
import type {
    PersistedTazPanelInfo,
    PersistedTazBoardInfo,
} from './persistence/TazPersistenceTypesV200';
import type { SaveableTazBoard } from './appState/SavedTazBoardSnapshot';
import { useTagAnalyzerMetadata } from './appState/useTagAnalyzerMetadata';
import { usePanelStatePersistence } from './appState/usePanelStatePersistence';

const TagAnalyzer = ({
    pInfo,
}: {
    pInfo: PersistedTazBoardInfo;
    pHandleSaveModalOpen?: () => void;
    pSetIsSaveModal?: (isOpen: boolean) => void;
    pSetIsOpenModal?: (isOpen: boolean) => void;
}) => {
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sFileTree = useRecoilValue(gFileTree);
    const updateBoardList = useSetRecoilState<GlobalBoardListState>(gBoardList);
    const setGlobalFileTree = useSetRecoilState(gFileTree);
    const [sRecentModalPath, setRecentModalPath] = useState('/');
    const {
        availableSourceTableNames,
        rollupTableList,
        isLoadingMetadata,
    } = useTagAnalyzerMetadata();

    const newBoardInfo: BoardInfo = useMemo(
        () => parseLoadedTaz(pInfo),
        [pInfo],
    );
    const sIsActiveTab = sSelectedTab === newBoardInfo.id;
    const schedulePersistPanelState = usePanelStatePersistence({
        boardInfo: newBoardInfo,
        updateBoardList,
    });

    useEffect(() => {
        updateBoardList((prev) => getNextBoardListWithPersistedBoardInfo(prev, newBoardInfo));
    }, [newBoardInfo, updateBoardList]);

    useEffect(() => {
        if (!shouldWarnAboutOlderTazVersion(pInfo)) {
            return;
        }

        Toast.warning(
            `Loaded older TAZ format (${pInfo.version ?? 'legacy'}). Current format is ${TAZ_FORMAT_VERSION}. Save the board to update it.`,
            undefined,
        );
    }, [pInfo.id, pInfo.panels?.length, pInfo.version]);

    const sPanelBoardActions: BoardActions = {
        onDeletePanel: ({ panelKey }) =>
            updateBoardList((prev) => getNextBoardListWithoutPanel(prev, newBoardInfo.id, panelKey)),
        onPersistPanelState: schedulePersistPanelState,
        onSavePanel: (panelInfo) => {
            updateBoardList((prev) =>
                getNextBoardListWithSavedPanel(
                    prev,
                    newBoardInfo.id,
                    panelInfo.meta.index_key,
                    panelInfo,
                ),
            );
        },
        onSetBoardTimeRange: (timeRange) => {
            updateBoardList((prev) =>
                getNextBoardListWithBoardTimeRange(prev, newBoardInfo.id, timeRange),
            );
        },
    };
    const appendNewPanelToBoard = (panel: PersistedTazPanelInfo) => {
        updateBoardList((prev) =>
            getNextBoardListWithAppendedPersistedPanel(
                prev,
                newBoardInfo.id,
                panel,
            ),
        );
    };
    const handleSavedBoard = (savedBoard: SaveableTazBoard): void => {
        updateBoardList((prev) =>
            getNextBoardListWithSavedBoard(
                prev,
                savedBoard,
            ),
        );
    };

    return (
        !isLoadingMetadata && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Page>
                    <TagAnalyzerBoard
                        pInfo={newBoardInfo}
                        pSaveableBoard={pInfo as SaveableTazBoard}
                        pIsActiveTab={sIsActiveTab}
                        pPanelBoardActions={sPanelBoardActions}
                        pRollupTableList={rollupTableList}
                        pRecentModalPath={sRecentModalPath}
                        pFileTree={sFileTree}
                        pOnSavedBoard={handleSavedBoard}
                        pOnFileTreeChange={setGlobalFileTree}
                        pOnRecentModalPathChange={setRecentModalPath}
                        pAvailableSourceTableNames={availableSourceTableNames}
                        pOnAppendPanel={appendNewPanelToBoard}
                    />
                </Page>
            </div>
        )
    );
};

function shouldWarnAboutOlderTazVersion(boardInfo: PersistedTazBoardInfo): boolean {
    if (boardInfo.version === TAZ_FORMAT_VERSION) {
        return false;
    }

    if (boardInfo.version === undefined && boardInfo.panels.length === 0) {
        return false;
    }

    return true;
}

export default TagAnalyzer;
