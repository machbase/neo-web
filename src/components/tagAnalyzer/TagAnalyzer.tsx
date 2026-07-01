import {
    useEffect,
    useState,
} from 'react';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import { Page, Toast } from '@/design-system/components';
import type { BoardInfo } from './domain/BoardDomain';
import { getOutdatedTazFormatWarning } from './persistence/TazVersion';
import { useTagAnalyzerMetadata } from './fetch/metadata/useTagAnalyzerMetadata';
import { useTagAnalyzerAppState } from './appState/useTagAnalyzerAppState';

const TagAnalyzer = ({
    pInfo,
}: {
    pInfo: BoardInfo;
    pHandleSaveModalOpen?: () => void;
    pSetIsSaveModal?: (isOpen: boolean) => void;
    pSetIsOpenModal?: (isOpen: boolean) => void;
}) => {
    const {
        selectedTab: sSelectedTab,
        fileTree: sFileTree,
        setFileTree: setGlobalFileTree,
        updateSavedBoard: handleSavedBoard,
    } = useTagAnalyzerAppState();
    const [sRecentModalPath, setRecentModalPath] = useState('/');
    const newBoardInfo = pInfo;
    const sIsActiveTab = sSelectedTab === newBoardInfo.id;
    const {
        rollupTableList,
        isLoadingMetadata,
    } = useTagAnalyzerMetadata({ enabled: sIsActiveTab });

    useEffect(() => {
        const sWarning = getOutdatedTazFormatWarning(pInfo.version, pInfo.panels.length);

        if (sWarning) {
            Toast.warning(sWarning, undefined);
        }
    }, [pInfo]);

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
                    />
                </Page>
            </div>
        )
    );
};

export default TagAnalyzer;
