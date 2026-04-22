import type { GBoardListType } from '@/recoil/recoil';
import { createTagAnalyzerBoardSourceInfoFixture } from '../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from './TazBoardInfoParser';
import { TAZ_FORMAT_VERSION } from './TazVersion';
import {
    createLoadedTazBoard,
    createSaveTazBoardInfo,
    createSavedTazBoardAfterSave,
    createSavedTazBoardAfterSaveAs,
    createTazSavedCode,
    createTazSavedCodeFromBoardInfo,
    createTazSavePayload,
    createTazSavePayloadFromBoardInfo,
} from './TazFilePersistence';

describe('TazFilePersistence', () => {
    const createTazBoard = () =>
        ({
            id: 'runtime-tab-id',
            name: 'actual-name.taz',
            path: '/actual/',
            type: 'taz',
            code: 'temporary runtime value',
            panels: [{ index_key: 'panel-1' }],
            range_bgn: '',
            range_end: '',
            sheet: [],
            savedCode: 'previous',
        }) as unknown as GBoardListType;

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

    it('creates a taz save payload without transient editor fields', () => {
        const sBoard = createTazBoard();

        const sSavePayload = createTazSavePayload(sBoard);

        expect(sSavePayload).toMatchObject({
            id: 'runtime-tab-id',
            name: 'actual-name.taz',
            path: '/actual/',
            type: 'taz',
            code: '',
            savedCode: '',
        });
    });

    it('creates a saved taz board shape directly from runtime BoardInfo', () => {
        const sBoardInfo = createRuntimeBoardInfo();

        const sSaveBoardInfo = createSaveTazBoardInfo(sBoardInfo);

        expect(sSaveBoardInfo).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            range_bgn: 'now-1h',
            range_end: 'now',
        });
        expect(sSaveBoardInfo.panels).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
                highlights: [],
            }),
        ]);
    });

    it('creates a taz save payload directly from runtime BoardInfo without transient fields', () => {
        const sBoardInfo = createRuntimeBoardInfo();

        const sSavePayload = createTazSavePayloadFromBoardInfo(sBoardInfo);

        expect(sSavePayload).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            code: '',
            savedCode: '',
            range_bgn: 'now-1h',
            range_end: 'now',
        });
    });

    it('creates the saved taz board state used after saving an existing file', () => {
        const sBoard = createTazBoard();

        const sSavedBoard = createSavedTazBoardAfterSave(sBoard);

        expect(sSavedBoard.name).toBe('actual-name.taz');
        expect(sSavedBoard.path).toBe('/actual/');
        expect((sSavedBoard as any).version).toBe(TAZ_FORMAT_VERSION);
        expect(sSavedBoard.code).toBe('');
        expect(sSavedBoard.savedCode).toBe('[{"index_key":"panel-1"}]');
    });

    it('creates the saved taz board state used after save as', () => {
        const sBoard = createTazBoard();

        const sSavedBoard = createSavedTazBoardAfterSaveAs({
            board: sBoard,
            fileName: 'renamed.taz',
            filePath: '/next/',
        });

        expect(sSavedBoard.name).toBe('renamed.taz');
        expect(sSavedBoard.path).toBe('/next/');
        expect((sSavedBoard as any).version).toBe(TAZ_FORMAT_VERSION);
        expect(sSavedBoard.code).toBe('temporary runtime value');
        expect(sSavedBoard.savedCode).toBe('[{"index_key":"panel-1"}]');
    });

    it('serializes only the saved panel list for taz tab metadata', () => {
        const sSavedCode = createTazSavedCode({
            panels: [{ index_key: 'panel-1' }],
        } as unknown as GBoardListType);

        expect(sSavedCode).toBe('[{"index_key":"panel-1"}]');
    });

    it('serializes the saved panel list directly from runtime BoardInfo', () => {
        const sBoardInfo = createRuntimeBoardInfo();

        const sSavedCode = createTazSavedCodeFromBoardInfo(sBoardInfo);
        const sParsedSavedCode = JSON.parse(sSavedCode);

        expect(sParsedSavedCode).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
                time: expect.objectContaining({
                    rangeConfig: expect.objectContaining({
                        start: expect.any(Object),
                        end: expect.any(Object),
                    }),
                }),
                highlights: [],
            }),
        ]);
        expect(sParsedSavedCode[0].data.seriesList).toEqual([
            expect.objectContaining({
                seriesKey: 'tag-1',
                tableName: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                useSecondaryAxis: false,
                annotations: [],
            }),
        ]);
        expect(sParsedSavedCode[0].data.seriesList[0]).not.toHaveProperty('tagName');
    });
});
