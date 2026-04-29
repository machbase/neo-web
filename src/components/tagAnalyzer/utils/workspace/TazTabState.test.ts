import { createTagAnalyzerBoardSourceInfoFixture } from '../../TestData/PanelTestData';
import { createLoadedTazBoard } from './TazTabState';
import type { TazBoardTab } from './TazTabState';

describe('TazTabState', () => {
    const createTazBoard = (): TazBoardTab =>
        createTagAnalyzerBoardSourceInfoFixture({
            id: 'runtime-tab-id',
            name: 'actual-name.taz',
            path: '/actual/',
            type: 'taz',
            code: 'temporary runtime value',
            savedCode: 'previous',
        }) as TazBoardTab;

    const createRuntimeBoardInfo = () =>
        parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

    it('creates a loaded taz board with caller-provided tab metadata', () => {
        const sRawContent = JSON.stringify({
            id: 'saved-board-id',
            name: 'saved-name',
            path: '/saved/',
            type: 'taz',
            code: '',
            panels: [],
            range_bgn: '',
            range_end: '',
            sheet: [],
            savedCode: false,
        });

        const sLoadedBoard = createLoadedTazBoard({
            rawContent: sRawContent,
            fileName: 'actual-name.taz',
            filePath: '/actual/',
            boardId: 'runtime-tab-id',
        });

        expect(sLoadedBoard.id).toBe('runtime-tab-id');
        expect(sLoadedBoard.name).toBe('actual-name.taz');
        expect(sLoadedBoard.path).toBe('/actual/');
        expect(sLoadedBoard.type).toBe('taz');
        expect(sLoadedBoard.savedCode).toBe('[]');
    });
});
