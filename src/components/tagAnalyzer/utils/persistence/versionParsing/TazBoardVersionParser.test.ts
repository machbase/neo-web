import { createTagAnalyzerBoardSourceInfoFixture, createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';
import { parseReceivedBoardInfo } from './TazBoardVersionParser';
import { TAZ_FORMAT_VERSION } from './TazVersionResolver';

describe('TazBoardVersionParser', () => {
    it('parses the supported 2.0.0 board into the runtime board model', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                panels: [createPersistedPanelInfo(sPanelInfo)],
                version: TAZ_FORMAT_VERSION,
            }),
        );

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

    it('bootstraps an unsaved empty board into the current 2.0.0 shape', () => {
        const sParsedBoardInfo = parseReceivedBoardInfo({
            id: 'board-1',
            type: 'taz',
            name: 'new',
            path: '',
            code: '',
            panels: [],
            range_bgn: 'now-1h',
            range_end: 'now',
            savedCode: false,
        });

        expect(sParsedBoardInfo.rangeConfig.start).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'now-1h',
            }),
        );
        expect(sParsedBoardInfo.rangeConfig.end).toEqual(
            expect.objectContaining({
                kind: 'relative',
                expression: 'now',
            }),
        );
    });

    it('rejects unsupported older taz versions', () => {
        expect(() =>
            parseReceivedBoardInfo({
                ...createTagAnalyzerBoardSourceInfoFixture(undefined),
                version: '2.0.7',
            }),
        ).toThrow('Unsupported TagAnalyzer .taz version: 2.0.7');
    });
});
