import { createTagAnalyzerPanelInfoFixture } from '../../TestData/PanelTestData';
import {
    getNextBoardListWithSavedPanel,
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './LegacyStorageAdapter';

describe('LegacyStorageAdapter board save helpers', () => {
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

            expect(
                getNextBoardListWithSavedPanel(sBoards, 'board-1', 'panel-1', sUpdatedPanel),
            ).toEqual([
                {
                    id: 'board-1',
                    panels: [
                        expect.objectContaining({
                            index_key: 'panel-1',
                            chart_title: 'Updated Panel',
                            chart_type: sUpdatedPanel.display.chart_type,
                        }),
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
            ]);

            const sSavedPanel = getNextBoardListWithSavedPanel(
                sBoards,
                'board-1',
                'panel-1',
                sUpdatedPanel,
            )[0].panels[0];
            expect(sSavedPanel.tag_set).toEqual([
                expect.objectContaining({
                    key: sUpdatedPanel.data.tag_set[0].key,
                    table: sUpdatedPanel.data.tag_set[0].table,
                    tagName: sUpdatedPanel.data.tag_set[0].sourceTagName,
                }),
            ]);
            expect(sSavedPanel.tag_set[0]).not.toHaveProperty('sourceTagName');
        });
    });

    describe('getNextBoardListWithSavedPanels', () => {
        it('replaces the target board panels with flattened saved panels', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
            const sBoards = [
                {
                    id: 'board-1',
                    panels: [],
                },
            ] as any;

            expect(getNextBoardListWithSavedPanels(sBoards, 'board-1', [sPanelInfo])).toEqual([
                {
                    id: 'board-1',
                    panels: [
                        expect.objectContaining({
                            index_key: sPanelInfo.meta.index_key,
                            chart_title: sPanelInfo.meta.chart_title,
                        }),
                    ],
                },
            ]);

            const sSavedPanel = getNextBoardListWithSavedPanels(sBoards, 'board-1', [sPanelInfo])[0]
                .panels[0];
            expect(sSavedPanel.tag_set).toEqual([
                expect.objectContaining({
                    key: sPanelInfo.data.tag_set[0].key,
                    table: sPanelInfo.data.tag_set[0].table,
                    tagName: sPanelInfo.data.tag_set[0].sourceTagName,
                }),
            ]);
            expect(sSavedPanel.tag_set[0]).not.toHaveProperty('sourceTagName');
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
