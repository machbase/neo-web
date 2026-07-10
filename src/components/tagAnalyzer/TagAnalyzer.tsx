import {
    useEffect,
    useState,
} from 'react';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import { Page, Toast } from '@/design-system/components';
import type { BoardInfo } from './domain/BoardDomain';
import { getOutdatedTazFormatWarning } from './persistence/TazVersion';
import { useTagAnalyzerMetadata } from './appState/useTagAnalyzerMetadata';
import { useTagAnalyzerAppState } from './appState/useTagAnalyzerAppState';

const TagAnalyzer = ({
    info,
}: {
    info: BoardInfo;
}) => {
    const {
        selectedTab: sSelectedTab,
        fileTree: sFileTree,
        setFileTree: setGlobalFileTree,
        updateSavedBoard: handleSavedBoard,
    } = useTagAnalyzerAppState();
    const [sRecentModalPath, setRecentModalPath] = useState('/');
    const sIsActiveTab = sSelectedTab === info.id;
    const {
        rollupTableList,
        sourceTableNames,
        isLoadingMetadata,
    } = useTagAnalyzerMetadata({ enabled: sIsActiveTab });

    useEffect(() => {
        const sWarning = getOutdatedTazFormatWarning(info.version, info.panels.length);

        if (sWarning) {
            Toast.warning(sWarning, undefined);
        }
    }, [info]);

    return (
        !isLoadingMetadata && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Page>
                    <TagAnalyzerBoard
                        info={info}
                        isActiveTab={sIsActiveTab}
                        rollupTableList={rollupTableList}
                        sourceTableNames={sourceTableNames}
                        recentModalPath={sRecentModalPath}
                        fileTree={sFileTree}
                        onSavedBoard={handleSavedBoard}
                        onFileTreeChange={setGlobalFileTree}
                        onRecentModalPathChange={setRecentModalPath}
                    />
                </Page>
            </div>
        )
    );
};

export default TagAnalyzer;
