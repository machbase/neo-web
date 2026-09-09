import Board from '../board/Board';
import { Page } from '@/design-system/components';
import type { BoardInfo } from '../board/boardModel';
import { useTagAnalyzerAppState } from './useTagAnalyzerAppState';

export default function TagAnalyzer({ info }: { info: BoardInfo }) {
    const {
        isActiveTab: sIsActiveTab,
        isLoading,
        rollupTableList,
        handleFileSaved,
        updateSavedBoard: handleSavedBoard,
    } = useTagAnalyzerAppState(info);

    if (isLoading) return null;

    return (
        <div
            data-testid={sIsActiveTab ? 'tag-analyzer-board' : undefined}
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            <Page>
                <Board
                    key={info.id}
                    info={info}
                    isActiveTab={sIsActiveTab}
                    rollupTableList={rollupTableList}
                    onSavedBoard={handleSavedBoard}
                    onFileSaved={handleFileSaved}
                />
            </Page>
        </div>
    );
}
