import { createTagAnalyzerBoardSourceInfoFixture, createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from './TazBoardVersionParser';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';
import { TAZ_FORMAT_VERSION } from './TazVersionResolver';

describe('TazBoardVersionParser', () => {
    it('parses a legacy board into the runtime board model', () => {
        const sLegacyBoardInfo = createTagAnalyzerBoardSourceInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo(sLegacyBoardInfo);

        expect(sParsedBoardInfo.panels[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    index_key: 'panel-1',
                    chart_title: 'Panel One',
                }),
                highlights: [],
            }),
        );
        expect(sParsedBoardInfo.panels[0].data.tag_set[0].annotations).toEqual([]);
    });

    it('parses the current structured boardTimeRange root field into runtime board time', () => {
        const sParsedBoardInfo = parseReceivedBoardInfo({
            id: 'board-1',
            type: 'taz',
            path: '/board.taz',
            code: '',
            panels: [],
            boardTimeRange: {
                start: {
                    kind: 'relative',
                    anchor: 'last',
                    amount: 30,
                    unit: 'm',
                    expression: 'last-30m',
                },
                end: {
                    kind: 'relative',
                    anchor: 'last',
                    amount: 10,
                    unit: 'm',
                    expression: 'last-10m',
                },
            },
            savedCode: false,
            version: TAZ_FORMAT_VERSION,
        });

        expect(sParsedBoardInfo.name).toBe('');
        expect(sParsedBoardInfo.rangeConfig.start).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'last-30m',
            }),
        );
        expect(sParsedBoardInfo.rangeConfig.end).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'last-10m',
            }),
        );
    });

    it('parses the older scalar boardTimeRange root field into runtime board time', () => {
        const sParsedBoardInfo = parseReceivedBoardInfo({
            id: 'board-1',
            type: 'taz',
            name: 'board.taz',
            path: '/board.taz',
            code: '',
            panels: [],
            boardTimeRange: {
                start: 'last-30m',
                end: 'last-10m',
            },
            savedCode: false,
            version: '2.0.5',
        });

        expect(sParsedBoardInfo.rangeConfig.start).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'last-30m',
            }),
        );
        expect(sParsedBoardInfo.rangeConfig.end).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'last-10m',
            }),
        );
    });

    it('parses a 2.0.0 board into the runtime board model', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo({
            ...createTagAnalyzerBoardSourceInfoFixture({
                panels: [
                    {
                        meta: {
                            index_key: sPanelInfo.meta.index_key,
                            chart_title: sPanelInfo.meta.chart_title,
                        },
                        data: {
                            tag_set: sPanelInfo.data.tag_set,
                            raw_keeper: sPanelInfo.toolbar.isRaw,
                            count: sPanelInfo.data.count,
                            interval_type: sPanelInfo.data.interval_type,
                        },
                        time: sPanelInfo.time,
                        axes: sPanelInfo.axes,
                        display: sPanelInfo.display,
                        use_normalize: sPanelInfo.use_normalize,
                    },
                ],
                version: '2.0.0',
            }),
        });

        expect(sParsedBoardInfo.panels[0]).toEqual(sPanelInfo);
    });

    it('parses a 2.0.7 board into the runtime board model', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo({
            ...createTagAnalyzerBoardSourceInfoFixture({
                panels: [createPersistedPanelInfo(sPanelInfo)],
                version: TAZ_FORMAT_VERSION,
            }),
            name: undefined,
        });

        expect(sParsedBoardInfo.panels[0]).toEqual({
            ...sPanelInfo,
            time: {
                ...sPanelInfo.time,
                range_bgn: 0,
                range_end: 0,
                use_time_keeper: false,
                time_keeper: undefined,
                default_range: undefined,
            },
        });
        expect(sParsedBoardInfo.name).toBe('');
    });
});
