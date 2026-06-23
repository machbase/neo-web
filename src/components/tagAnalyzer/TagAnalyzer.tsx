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
import {
    TAZ_FORMAT_VERSION,
    TazVersion,
    normalizePersistedTazVersion,
    parseLoadedTaz,
} from './persistence/load/parseLoadedTaz';
import type { PersistedTazBoardInfo } from './persistence/TazPersistenceTypesV200';
import type { SaveableTazBoard } from './appState/SavedTazBoardSnapshot';
import { useTagAnalyzerMetadata } from './appState/useTagAnalyzerMetadata';

type TazParseResult =
    | {
          boardInfo: BoardInfo;
          error: undefined;
      }
    | {
          boardInfo: undefined;
          error: Error;
      };

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
    const sParseResult = useMemo<TazParseResult>(
        () => {
            try {
                return {
                    boardInfo: parseLoadedTaz(pInfo),
                    error: undefined,
                };
            } catch (error) {
                return {
                    boardInfo: undefined,
                    error: normalizeError(error),
                };
            }
        },
        [pInfo],
    );
    const newBoardInfo = sParseResult.boardInfo;
    const sParseError = sParseResult.error;
    const sIsActiveTab =
        newBoardInfo !== undefined && sSelectedTab === newBoardInfo.id;
    const {
        availableSourceTableNames,
        rollupTableList,
        isLoadingMetadata,
    } = useTagAnalyzerMetadata({ enabled: sIsActiveTab });

    useEffect(() => {
        if (sParseError) {
            Toast.error(
                buildTazParseErrorToastMessage(pInfo, sParseError),
                undefined,
            );
        }
    }, [pInfo, sParseError]);

    useEffect(() => {
        if (sParseError) {
            return;
        }

        if (!shouldWarnAboutOlderTazVersion(pInfo)) {
            return;
        }

        Toast.warning(
            `Loaded older TAZ format (${formatTazVersionForDisplay(pInfo.version)}). Current format is ${TAZ_FORMAT_VERSION}. Save the board to update it.`,
            undefined,
        );
    }, [pInfo, sParseError]);

    const handleSavedBoard = (savedBoard: SaveableTazBoard): void => {
        updateBoardList((prev) =>
            getNextBoardListWithSavedBoard(
                prev,
                savedBoard,
            ),
        );
    };

    if (sParseError || !newBoardInfo) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Page>
                    <div style={{ padding: '16px' }}>
                        Failed to load TAZ file.
                    </div>
                </Page>
            </div>
        );
    }

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

function normalizeError(error: unknown): Error {
    return error instanceof Error
        ? error
        : new Error('Unknown TagAnalyzer load error.');
}

function buildTazParseErrorToastMessage(
    boardInfo: PersistedTazBoardInfo,
    error: Error,
): string {
    if (isUnsupportedTazVersionError(error)) {
        return error.message;
    }

    const sFromVersion = normalizePersistedTazVersion(boardInfo.version);

    if (sFromVersion === TAZ_FORMAT_VERSION) {
        return `TAZ format ${TAZ_FORMAT_VERSION} is invalid. ${error.message}`;
    }

    return (
        `TAZ conversion from ${formatTazVersionForDisplay(sFromVersion)} to ${TAZ_FORMAT_VERSION} ` +
        `is invalid. ${error.message}`
    );
}

function isUnsupportedTazVersionError(error: Error): boolean {
    return error.message.startsWith('Unsupported TagAnalyzer .taz version:');
}

function shouldWarnAboutOlderTazVersion(boardInfo: PersistedTazBoardInfo): boolean {
    const sVersion = normalizePersistedTazVersion(boardInfo.version);

    if (sVersion === TAZ_FORMAT_VERSION) {
        return false;
    }

    if (sVersion === TazVersion.Legacy && boardInfo.panels.length === 0) {
        return false;
    }

    return true;
}

function formatTazVersionForDisplay(version: unknown): string {
    return normalizePersistedTazVersion(version);
}

export default TagAnalyzer;
