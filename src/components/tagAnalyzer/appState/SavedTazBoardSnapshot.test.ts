import { createTagAnalyzerBoardSourceInfoFixture } from '../TestData/PanelTestData';
import { parseLoadedTaz, TAZ_FORMAT_VERSION } from '../persistence/load/parseLoadedTaz';
import { createTazSavePayload } from '../persistence/save/createTazSavePayload';
import {
    createSavedTazBoardAfterSave,
    createSavedTazBoardAfterSaveAs,
    createTazSavedCode,
    createTazSavedCodeFromBoardInfo,
    createTazSavedCodeFromSavePayload,
    type SaveableTazBoard,
} from './SavedTazBoardSnapshot';

describe('SavedTazBoardSnapshot', () => {
    const createTazBoard = (): SaveableTazBoard =>
        createTagAnalyzerBoardSourceInfoFixture({
            id: 'runtime-tab-id',
            name: 'actual-name.taz',
            path: '/actual/',
            type: 'taz',
            code: 'temporary runtime value',
            savedCode: 'previous',
        }) as SaveableTazBoard;

    const createRuntimeBoardInfo = () =>
        parseLoadedTaz(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

    it('creates a taz save payload without transient editor fields', () => {
        const sBoard = {
            ...createTazBoard(),
            sheet: [{ id: 'worksheet-data' }],
            shell: { id: 'TAZ' },
            dashboard: { panels: [] },
            refreshKey: 'runtime-refresh-key',
            mode: 'runtime-mode',
        };

        const sSavePayload = createTazSavePayload(sBoard);

        expect(sSavePayload).toMatchObject({
            id: 'runtime-tab-id',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            boardTimeRange: {
                start: {
                    kind: 'now',
                    amount: 1,
                    unit: 'hour',
                },
                end: {
                    kind: 'now',
                    amount: 0,
                    unit: 'millisecond',
                },
            },
        });
        expect(sSavePayload).not.toHaveProperty('path');
        expect(sSavePayload).not.toHaveProperty('name');
        expect(sSavePayload).not.toHaveProperty('code');
        expect(sSavePayload).not.toHaveProperty('savedCode');
        expect(sSavePayload).not.toHaveProperty('range');
        expect(sSavePayload).not.toHaveProperty('rangeConfig');
        expect(sSavePayload).not.toHaveProperty('range_bgn');
        expect(sSavePayload).not.toHaveProperty('range_end');
        expect(sSavePayload).not.toHaveProperty('sheet');
        expect(sSavePayload).not.toHaveProperty('shell');
        expect(sSavePayload).not.toHaveProperty('dashboard');
        expect(sSavePayload).not.toHaveProperty('refreshKey');
        expect(sSavePayload).not.toHaveProperty('mode');
        expect(sSavePayload.panels).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        ]);
    });

    it('creates the saved taz board state used after saving an existing file', () => {
        const sBoard = createTazBoard();

        const sSavedBoard = createSavedTazBoardAfterSave(sBoard);

        expect(sSavedBoard.name).toBe('actual-name.taz');
        expect(sSavedBoard.path).toBe('/actual/');
        expect(sSavedBoard.version).toBe(TAZ_FORMAT_VERSION);
        expect(sSavedBoard.code).toBe('');
        expect(sSavedBoard.panels[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        );
        expect(JSON.parse(sSavedBoard.savedCode as string)[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        );
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
        expect(sSavedBoard.version).toBe(TAZ_FORMAT_VERSION);
        expect(sSavedBoard.code).toBe('');
        expect(sSavedBoard.panels[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        );
        expect(JSON.parse(sSavedBoard.savedCode as string)[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        );
    });

    it('serializes only the saved panel list for taz tab metadata', () => {
        const sSavedCode = createTazSavedCode({
            panels: [{ index_key: 'panel-1' }],
        });

        expect(sSavedCode).toBe('[{"index_key":"panel-1"}]');
    });

    it('serializes the normalized save payload panel list for taz dirty state', () => {
        const sSavePayload = createTazSavePayload(createTazBoard());

        const sSavedCode = createTazSavedCodeFromSavePayload(sSavePayload);

        expect(JSON.parse(sSavedCode)[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                }),
            }),
        );
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
