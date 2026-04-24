import {
    createTagAnalyzerBoardSourceInfoFixture,
    createTagAnalyzerPanelInfoFixture,
} from '../../TestData/PanelTestData';
import {
    getNextBoardListWithPersistedBoardInfo,
    getNextBoardListWithSavedPanel,
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './TazSavedBoardState';
import { TAZ_FORMAT_VERSION } from '../persistence/versionParsing/TazVersionResolver';
import { parseReceivedBoardInfo } from '../persistence/versionParsing/TazBoardVersionParser';

describe('TazSavedBoardState', () => {
    describe('getNextBoardListWithPersistedBoardInfo', () => {
        it('strips shared tab fields from the active persisted board snapshot', () => {
            const sBoard = {
                ...createTagAnalyzerBoardSourceInfoFixture({
                    id: 'board-1',
                    name: 'board.taz',
                    path: '/boards/',
                    type: 'taz',
                    code: 'runtime code',
                    savedCode: 'previous panels',
                }),
                sheet: [{ id: 'worksheet-data' }],
                shell: { id: 'TAZ' },
                dashboard: { panels: [] },
                refreshKey: 'runtime-refresh-key',
                mode: 'runtime-mode',
            } as any;
            const sBoardInfo = parseReceivedBoardInfo(sBoard);

            const sUpdatedBoards = getNextBoardListWithPersistedBoardInfo(
                [sBoard],
                sBoardInfo,
            );

            expect(sUpdatedBoards[0]).toMatchObject({
                id: 'board-1',
                name: 'board.taz',
                path: '/boards/',
                type: 'taz',
                code: '',
                savedCode: 'previous panels',
                version: TAZ_FORMAT_VERSION,
                boardTimeRange: {
                    start: {
                        kind: 'relative',
                        anchor: 'now',
                        amount: 1,
                        unit: 'h',
                        expression: 'now-1h',
                    },
                    end: {
                        kind: 'relative',
                        anchor: 'now',
                        amount: 0,
                        unit: undefined,
                        expression: 'now',
                    },
                },
            });
            expect(sUpdatedBoards[0]).not.toHaveProperty('range_bgn');
            expect(sUpdatedBoards[0]).not.toHaveProperty('range_end');
            expect(sUpdatedBoards[0]).not.toHaveProperty('sheet');
            expect(sUpdatedBoards[0]).not.toHaveProperty('shell');
            expect(sUpdatedBoards[0]).not.toHaveProperty('dashboard');
            expect(sUpdatedBoards[0]).not.toHaveProperty('refreshKey');
            expect(sUpdatedBoards[0]).not.toHaveProperty('mode');
        });
    });

    describe('getNextBoardListWithSavedPanel', () => {
        it('replaces only the matching panel in the matching board', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
            const sUpdatedPanel = {
                ...sPanelInfo,
                meta: {
                    ...sPanelInfo.meta,
                    chart_title: 'Updated Panel',
                },
            };
            const sBoards = [
                {
                    id: 'board-1',
                    panels: [
                        {
                            index_key: 'panel-1',
                            chart_title: 'Old Panel',
                        },
                        {
                            index_key: 'panel-2',
                            chart_title: 'Untouched Panel',
                        },
                    ],
                },
                {
                    id: 'board-2',
                    panels: [
                        {
                            index_key: 'panel-1',
                            chart_title: 'Other Board Panel',
                        },
                    ],
                },
            ] as any;

            const sUpdatedBoards = getNextBoardListWithSavedPanel(
                sBoards,
                'board-1',
                'panel-1',
                sUpdatedPanel,
            );

            expect(sUpdatedBoards[0]).toMatchObject({
                id: 'board-1',
                version: TAZ_FORMAT_VERSION,
                panels: [
                    {
                        meta: {
                            panelKey: 'panel-1',
                            chartTitle: 'Updated Panel',
                        },
                    },
                    {
                        index_key: 'panel-2',
                        chart_title: 'Untouched Panel',
                    },
                ],
            });
            expect(sUpdatedBoards[1]).toEqual({
                id: 'board-2',
                panels: [
                    {
                        index_key: 'panel-1',
                        chart_title: 'Other Board Panel',
                    },
                ],
            });

            const sSavedPanel = sUpdatedBoards[0].panels[0] as any;
            expect(sSavedPanel.data.seriesList).toEqual([
                expect.objectContaining({
                    seriesKey: sUpdatedPanel.data.tag_set[0].key,
                    tableName: sUpdatedPanel.data.tag_set[0].table,
                    sourceTagName: sUpdatedPanel.data.tag_set[0].sourceTagName,
                }),
            ]);
            expect(sSavedPanel.data.seriesList[0]).not.toHaveProperty('tagName');
        });
    });

    describe('getNextBoardListWithSavedPanels', () => {
        it('replaces the target board panels with persisted 2.0.0 panels', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
            const sBoards = [
                {
                    id: 'board-1',
                    panels: [],
                },
            ] as any;

            const sUpdatedBoards = getNextBoardListWithSavedPanels(sBoards, 'board-1', [sPanelInfo]);

            expect(sUpdatedBoards).toMatchObject([
                {
                    id: 'board-1',
                    version: TAZ_FORMAT_VERSION,
                    panels: [
                        {
                            meta: {
                                panelKey: sPanelInfo.meta.index_key,
                                chartTitle: sPanelInfo.meta.chart_title,
                            },
                        },
                    ],
                },
            ]);

            const sSavedPanel = sUpdatedBoards[0].panels[0] as any;
            expect(sSavedPanel.data.seriesList).toEqual([
                expect.objectContaining({
                    seriesKey: sPanelInfo.data.tag_set[0].key,
                    tableName: sPanelInfo.data.tag_set[0].table,
                    sourceTagName: sPanelInfo.data.tag_set[0].sourceTagName,
                }),
            ]);
            expect(sSavedPanel.data.seriesList[0]).not.toHaveProperty('tagName');
        });
    });

    describe('getNextBoardListWithoutPanel', () => {
        it('removes only the matching panel from the matching board', () => {
            const sBoards = [
                {
                    id: 'board-1',
                    panels: [
                        { index_key: 'panel-1', chart_title: 'Remove Me' },
                        { index_key: 'panel-2', chart_title: 'Keep Me' },
                    ],
                },
                {
                    id: 'board-2',
                    panels: [{ index_key: 'panel-1', chart_title: 'Other Board Panel' }],
                },
            ] as any;

            expect(getNextBoardListWithoutPanel(sBoards, 'board-1', 'panel-1')).toEqual([
                {
                    id: 'board-1',
                    version: TAZ_FORMAT_VERSION,
                    panels: [{ index_key: 'panel-2', chart_title: 'Keep Me' }],
                },
                {
                    id: 'board-2',
                    panels: [{ index_key: 'panel-1', chart_title: 'Other Board Panel' }],
                },
            ]);
        });
    });
});
