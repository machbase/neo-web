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
import type { BoardInfo } from './domain/BoardDomain';
import {
    type GlobalBoardListState,
    getNextBoardListWithSavedBoard,
} from './appState/gBoardListUpdater';
import { TAZ_FORMAT_VERSION, parseLoadedTaz } from './persistence/load/parseLoadedTaz';
import type { PersistedTazBoardInfo } from './persistence/TazPersistenceTypesV200';
import type { SaveableTazBoard } from './appState/SavedTazBoardSnapshot';
import { useTagAnalyzerMetadata } from './appState/useTagAnalyzerMetadata';

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

    useEffect(() => {
        if (!shouldWarnAboutOlderTazVersion(pInfo)) {
            return;
        }

        Toast.warning(
            `Loaded older TAZ format (${pInfo.version ?? 'legacy'}). Current format is ${TAZ_FORMAT_VERSION}. Save the board to update it.`,
            undefined,
        );
    }, [pInfo]);

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
                        pIsActiveTab={sIsActiveTab}
                        pRollupTableList={rollupTableList}
                        pRecentModalPath={sRecentModalPath}
                        pFileTree={sFileTree}
                        pOnSavedBoard={handleSavedBoard}
                        pOnFileTreeChange={setGlobalFileTree}
                        pOnRecentModalPathChange={setRecentModalPath}
                        pAvailableSourceTableNames={availableSourceTableNames}
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
