import {
    createTagAnalyzerBoardSourceInfoFixture,
    createTagAnalyzerPanelInfoFixture,
} from '../../TestData/PanelTestData';
import { mapPanelToPersistedTaz } from '../save/mapPanelToPersistedTaz';
import {
    parseLoadedPanelTazVer200,
    parseLoadedTaz,
    TAZ_FORMAT_VERSION,
} from './parseLoadedTaz';

describe('parseLoadedTaz', () => {
    describe('parseLoadedTaz', () => {
        it('parses the supported 2.0.0 board into the runtime board model', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

            const sParsedBoardInfo = parseLoadedTaz(
                createTagAnalyzerBoardSourceInfoFixture({
                    panels: [mapPanelToPersistedTaz(sPanelInfo)],
                    version: TAZ_FORMAT_VERSION,
                }),
            );

            expect(sParsedBoardInfo.panels[0]).toEqual({
                ...sPanelInfo,
                time: {
                    ...sPanelInfo.time,
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                    defaultRange: undefined,
                },
            });
        });

        it('parses the current structured boardTimeRange root field into runtime board time', () => {
            const sParsedBoardInfo = parseLoadedTaz({
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
            expect(sParsedBoardInfo.boardTimeRange.start).toEqual(
                expect.objectContaining({
                    kind: 'relative',
                    expression: 'last-30m',
                }),
            );
            expect(sParsedBoardInfo.boardTimeRange.end).toEqual(
                expect.objectContaining({
                    kind: 'relative',
                    expression: 'last-10m',
                }),
            );
        });

        it('bootstraps an unsaved empty board into the current 2.0.0 shape', () => {
            const sParsedBoardInfo = parseLoadedTaz({
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

            expect(sParsedBoardInfo.boardTimeRange.start).toEqual(
                expect.objectContaining({
                    kind: 'relative',
                    expression: 'now-1h',
                }),
            );
            expect(sParsedBoardInfo.boardTimeRange.end).toEqual(
                expect.objectContaining({
                    kind: 'relative',
                    expression: 'now',
                }),
            );
        });

        it('rejects unsupported older taz versions', () => {
            expect(() =>
                parseLoadedTaz({
                    ...createTagAnalyzerBoardSourceInfoFixture(undefined),
                    version: '2.0.7',
                }),
            ).toThrow('Unsupported TagAnalyzer .taz version: 2.0.7');
        });
    });

    describe('parseLoadedPanelTazVer200', () => {
        it('loads the supported persisted 2.0.0 panel into the runtime panel shape', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture({
                toolbar: {
                    isRaw: true,
                },
            });

            expect(
                parseLoadedPanelTazVer200(mapPanelToPersistedTaz(sPanelInfo)),
            ).toEqual({
                ...sPanelInfo,
                time: {
                    ...sPanelInfo.time,
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                    defaultRange: undefined,
                },
            });
        });

        it('normalizes unsupported persisted chart types before creating runtime display state', () => {
            const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
            const sPersistedPanelInfo = mapPanelToPersistedTaz(sPanelInfo);
            const sPersistedPanelInfoWithBadChartType = {
                ...sPersistedPanelInfo,
                display: {
                    ...sPersistedPanelInfo.display,
                    chartType: 'Unsupported',
                },
            } as unknown as ReturnType<typeof mapPanelToPersistedTaz>;

            expect(
                parseLoadedPanelTazVer200(sPersistedPanelInfoWithBadChartType).display
                    .chart_type,
            ).toBe('Line');
        });
    });
});
