import { createTagAnalyzerPanelInfoFixture } from '../../TestData/PanelTestData';
import {
    getNextBoardListWithSavedPanel,
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './TazBoardStatePersistence';
import { TAZ_FORMAT_VERSION } from './TazVersion';

describe('TazBoardStatePersistence', () => {
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
        it('replaces the target board panels with persisted 2.0.1 panels', () => {
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
