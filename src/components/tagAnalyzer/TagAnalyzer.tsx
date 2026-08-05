import { useEffect, useState } from 'react';
import Board from './board/Board';
import { Page, Toast } from '@/design-system/components';
import { tableMetadataApi } from './api/tableMetadataApi';
import type { BoardInfo } from './board/boardModel';
import type { RollupTableMap } from './seriesModel';
import { useTagAnalyzerAppState } from './integration';
import { useLatestAsyncRequest } from './hooks/useLatestAsyncRequest';

const EMPTY_ROLLUP_TABLE_LIST: RollupTableMap = {};

export default function TagAnalyzer({ info }: { info: BoardInfo }) {
    const {
        selectedTab: sSelectedTab,
        handleFileSaved,
        updateSavedBoard: handleSavedBoard,
    } = useTagAnalyzerAppState();
    const [sRollupTableList, setRollupTableList] = useState<RollupTableMap>();
    const sIsActiveTab = sSelectedTab === info.id;

    useLatestAsyncRequest({
        enabled: sIsActiveTab && sRollupTableList === undefined,
        requestKey: info.id,
        fetch: () => tableMetadataApi.fetchRollupMetadata(),
        onSuccess: setRollupTableList,
        onError: () => setRollupTableList({}),
    });

    useEffect(() => {
        if (info.loadWarning) Toast.warning(info.loadWarning, undefined);
    }, [info.loadWarning]);

    if (sIsActiveTab && sRollupTableList === undefined) return null;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Page>
                <Board
                    key={info.id}
                    info={info}
                    isActiveTab={sIsActiveTab}
                    rollupTableList={sRollupTableList ?? EMPTY_ROLLUP_TABLE_LIST}
                    onSavedBoard={handleSavedBoard}
                    onFileSaved={handleFileSaved}
                />
            </Page>
        </div>
    );
}
