import {
    createTagAnalyzerBoardFromPayload,
    createTagAnalyzerBoardFromTagSet,
    NEO_PACKAGE_MESSAGE_SOURCE,
    OPEN_TAG_ANALYZER_MESSAGE_TYPE,
    OPEN_TAG_ANALYZER_MESSAGE_VERSION,
} from './createTagAnalyzerBoardFromTagSet';
import { parseLoadedTaz } from '@/components/tagAnalyzer/persistence/load/parseLoadedTaz';
import { mapBoardToPersistedTaz } from '@/components/tagAnalyzer/persistence/save/mapBoardToPersistedTaz';
import { TAZ_FORMAT_VERSION } from '@/components/tagAnalyzer/persistence/TazVersion';

const baseMessage = {
    source: NEO_PACKAGE_MESSAGE_SOURCE,
    type: OPEN_TAG_ANALYZER_MESSAGE_TYPE,
    version: OPEN_TAG_ANALYZER_MESSAGE_VERSION,
    appName: 'neo-pkg-opcua-client',
    payload: {
        title: 'OPC UA Data Viewer',
        range: {
            startIso: '2026-06-26T00:00:00.000Z',
            endIso: '2026-06-26T01:00:00.000Z',
        },
        tags: [
            {
                tagName: 'ns=2;s=Pump.Speed',
                table: 'MACHBASEDB.SYS.TAG',
                calculationMode: 'avg',
                alias: '',
                weight: 1,
                colName: {
                    name: 'NAME',
                    time: 'TIME',
                    timeType: 6,
                    timeBaseTime: true,
                    value: 'VALUE',
                },
            },
            {
                tagName: 'ns=2;s=Pump.Temp',
                table: 'MACHBASEDB.SYS.TAG',
                calculationMode: 'max',
                alias: 'temp',
                weight: 2,
                colName: {
                    name: 'NAME',
                    time: 'TIME',
                    value: 'VALUE',
                },
            },
        ],
    },
};

describe('createTagAnalyzerBoardFromTagSet', () => {
    it('creates a taz board directly from a neo-web Data Viewer payload', () => {
        const result = createTagAnalyzerBoardFromPayload(baseMessage.payload);

        expect(result.status).toBe('ok');
        if (result.status !== 'ok') throw new Error('expected ok result');
        expect(result.board.type).toBe('taz');
        expect(result.board.name).toBe('OPC UA Data Viewer.taz');
        expect(result.board.panels[0].query.tagSet).toHaveLength(2);
    });

    it('creates a taz board using the existing chart default shape', () => {
        const result = createTagAnalyzerBoardFromTagSet(baseMessage);

        expect(result.status).toBe('ok');
        if (result.status !== 'ok') throw new Error('expected ok result');

        expect(result.board.version).toBe(TAZ_FORMAT_VERSION);
        expect(result.board.type).toBe('taz');
        expect(result.board.name).toBe('OPC UA Data Viewer.taz');
        expect(result.board.range_bgn).toBe('2026-06-26T00:00:00.000Z');
        expect(result.board.range_end).toBe('2026-06-26T01:00:00.000Z');
        expect(result.board.shell).toEqual({ icon: 'chart-line', theme: '', id: 'TAZ' });
        expect(result.board.panels).toHaveLength(1);
        expect(result.board.panels[0].display.chartType).toBe('Line');
        expect(result.board.boardTimeRange).toEqual({
            start: '2026-06-26T00:00:00.000Z',
            end: '2026-06-26T01:00:00.000Z',
        });
        expect(result.board.panels[0].time).toMatchObject({
            rangeInput: {
                start: '',
                end: '',
            },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        });
        expect(result.board.panels[0].query.tagSet).toHaveLength(2);
        expect(result.board.panels[0].query.tagSet[0]).toMatchObject({
            sourceTagName: 'ns=2;s=Pump.Speed',
            table: 'MACHBASEDB.SYS.TAG',
            calculationMode: 'avg',
            sourceColumns: {
                name: 'NAME',
                time: 'TIME',
                timeType: 6,
                timeBaseTime: true,
                value: 'VALUE',
            },
        });
        expect(result.board.panels[0].query.tagSet[1]).toMatchObject({
            sourceTagName: 'ns=2;s=Pump.Temp',
            calculationMode: 'max',
            alias: 'temp',
            weight: 2,
        });

        const loaded = parseLoadedTaz({
            ...result.board,
            ...mapBoardToPersistedTaz(result.board),
        });
        expect(loaded.version).toBe(TAZ_FORMAT_VERSION);
        expect(loaded.panels[0].query.tagSet).toHaveLength(2);
    });

    it('normalizes count calculation mode to the existing cnt mode', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            ...baseMessage,
            payload: {
                ...baseMessage.payload,
                tags: [
                    {
                        ...baseMessage.payload.tags[0],
                        calculationMode: 'count',
                    },
                ],
            },
        });

        expect(result.status).toBe('ok');
        if (result.status !== 'ok') throw new Error('expected ok result');
        expect(result.board.panels[0].query.tagSet[0].calculationMode).toBe('cnt');
    });

    it('ignores messages that are not for the Tag Analyzer bridge', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            source: NEO_PACKAGE_MESSAGE_SOURCE,
            type: 'other.message',
            version: OPEN_TAG_ANALYZER_MESSAGE_VERSION,
            appName: 'neo-pkg-opcua-client',
        });

        expect(result).toEqual({ status: 'ignored' });
    });

    it('ignores messages from a different package', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            ...baseMessage,
            appName: 'other-package',
        });

        expect(result).toEqual({ status: 'ignored' });
    });

    it('rejects empty tag lists before opening a tab', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            ...baseMessage,
            payload: {
                ...baseMessage.payload,
                tags: [],
            },
        });

        expect(result).toEqual({ status: 'error', reason: 'payload.tags must not be empty' });
    });

    it('rejects tag lists above the existing Tag Analyzer panel limit', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            ...baseMessage,
            payload: {
                ...baseMessage.payload,
                tags: Array.from({ length: 13 }, (_, index) => ({
                    ...baseMessage.payload.tags[0],
                    tagName: `tag-${index}`,
                })),
            },
        });

        expect(result).toEqual({ status: 'error', reason: 'payload.tags supports up to 12 tags' });
    });

    it('rejects invalid time ranges before opening a tab', () => {
        const result = createTagAnalyzerBoardFromTagSet({
            ...baseMessage,
            payload: {
                ...baseMessage.payload,
                range: {
                    startEpochMs: 2000,
                    endEpochMs: 1000,
                },
            },
        });

        expect(result).toEqual({ status: 'error', reason: 'range epoch values are invalid' });
    });
});
